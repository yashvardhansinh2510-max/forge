# Clerk Auth Wiring — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Approach:** Option C — Hybrid (JWT role reads + DB sync via webhook)

---

## Problem

Clerk is installed but provides no protection. Unauthenticated users can access all routes. Roles (`ADMIN/SALES` in DB, `owner/manager/worker` in Zustand) are mismatched and fake — the `RoleSwitcher` component lets any user pretend to be any role. No DB user record is created on sign-in.

---

## Goals

1. Gate all dashboard routes behind Clerk authentication
2. Sync Clerk users to DB `User` rows via webhook
3. Replace fake Zustand role switcher with real role from Clerk session
4. Provide an owner-only Settings page to assign roles to team members
5. Invite-only access — no public sign-up

---

## Architecture

```
Clerk Dashboard (admin)
  │  invites user + sets initial publicMetadata.role
  ▼
Clerk (identity provider)
  │  JWT session claims: { sub: clerkId, publicMetadata: { role } }
  │
  ├─► middleware.ts
  │     Protects all routes except /sign-in, /sign-up, /api/webhooks/*
  │     auth.protect() redirects unauthenticated to /sign-in
  │
  ├─► API routes
  │     Read clerkId + role from JWT session claims
  │     No DB round-trip for role checks
  │
  ├─► /api/webhooks/clerk
  │     user.created → prisma.user.upsert (insert new DB User, role: WORKER default)
  │     user.updated → prisma.user.upsert (sync name, email, role)
  │     Verified via svix signature (CLERK_WEBHOOK_SECRET)
  │
  └─► /settings/users
        Owner-only: list users, change roles
        PATCH → Clerk Admin SDK → publicMetadata.role updated
        Webhook fires → DB synced
```

---

## Section 1: DB Migration

### UserRole enum change

```prisma
enum UserRole {
  OWNER
  MANAGER
  WORKER
}
```

Replaces `ADMIN / SALES`. Migration maps:
- `ADMIN → OWNER`
- `SALES → WORKER`

No MANAGER rows exist yet (fresh DB).

### User model default change

```prisma
model User {
  // ...existing fields unchanged...
  role UserRole @default(WORKER)  // was: @default(SALES)
}
```

`passwordHash` field retained but unused — Clerk owns authentication now.

---

## Section 2: Middleware

**File:** `apps/web/src/middleware.ts`

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth.protect()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Rules:**
- No role checks in middleware — RBAC stays in API routes and existing component gates
- `/api/webhooks/*` is explicitly public (Clerk calls it without user session)
- Static assets excluded from matcher

**Clerk dashboard config (manual, not code):**
- Disable "Allow users to sign up" in Clerk settings
- Admin invites team members directly from Clerk dashboard

---

## Section 3: Clerk Webhook

**File:** `apps/web/src/app/api/webhooks/clerk/route.ts`

**Events handled:**

| Event | Action |
|---|---|
| `user.created` | `prisma.user.upsert` — create DB User row, role defaults to `WORKER` unless `publicMetadata.role` is set |
| `user.updated` | `prisma.user.upsert` — sync name, email, role from Clerk |

**Security:** Payload verified via `svix` using `CLERK_WEBHOOK_SECRET`. Invalid signature → `400`. DB error → `500` (Clerk retries on non-2xx).

**Idempotency:** Upsert used everywhere — safe on Clerk retries.

**New env var:** `CLERK_WEBHOOK_SECRET` (from Clerk dashboard → Webhooks → signing secret)

---

## Section 4: Settings Users Page

**Route:** `/settings/users`  
**Guard:** `currentUser.role !== 'OWNER'` → redirect to `/dashboard`

### UI

```
Settings → Users

┌─────────────────────────────────────────────────────┐
│ Name          Email                Role      Action  │
├─────────────────────────────────────────────────────┤
│ Suresh Iyer   suresh@buildcon.com  Owner     —       │
│ Ramesh Pawar  ramesh@buildcon.com  Manager   [Edit]  │
│ Priya Shah    priya@buildcon.com   Worker    [Edit]  │
└─────────────────────────────────────────────────────┘
```

### New API routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/settings/users` | List all DB users (owner-only) |
| PATCH | `/api/settings/users/[id]` | Update role via Clerk Admin SDK (owner-only) |

**Role change flow:**
1. Owner selects new role in dropdown
2. PATCH `/api/settings/users/[id]` → server validates `currentUser.role === 'OWNER'`
3. Calls `clerkClient.users.updateUser(clerkId, { publicMetadata: { role } })`
4. Clerk fires `user.updated` webhook → DB synced automatically
5. Target user's JWT refreshes on next request (~1 min eventual consistency window)

---

## Section 5: Zustand Role Store Replacement

### Deleted

- `apps/web/src/lib/stores/role-store.ts`
- `apps/web/src/components/dashboard/role-switcher.tsx`
- `RoleSwitcher` import/usage in sidebar

### New hook (same signature as before)

**File:** `apps/web/src/lib/use-role.ts`

```ts
import { useUser } from '@clerk/nextjs'

type AppRole = 'owner' | 'manager' | 'worker'

export function useRole(): AppRole {
  const { user } = useUser()
  return (user?.publicMetadata?.role as AppRole) ?? 'worker'
}
```

All existing `useRole()` call sites stay unchanged. Zero ripple effect on existing RBAC gates.

---

## Files Changed

| File | Action |
|---|---|
| `packages/db/prisma/schema.prisma` | Update `UserRole` enum, change default to `WORKER` |
| `packages/db/prisma/migrations/...` | New migration for enum change |
| `apps/web/src/middleware.ts` | Create — Clerk route protection |
| `apps/web/src/app/api/webhooks/clerk/route.ts` | Create — user sync webhook |
| `apps/web/src/app/api/settings/users/route.ts` | Create — list users |
| `apps/web/src/app/api/settings/users/[id]/route.ts` | Create — update role |
| `apps/web/src/app/(dashboard)/settings/users/page.tsx` | Create — owner-only UI |
| `apps/web/src/lib/use-role.ts` | Update — reads from Clerk instead of Zustand |
| `apps/web/src/lib/role-store.ts` | Delete |
| `apps/web/src/components/layout/role-switcher.tsx` | Delete |
| `apps/web/src/components/layout/sidebar.tsx` | Remove `RoleSwitcher` import and usage |

---

## New Environment Variables

| Variable | Source |
|---|---|
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → signing secret |

Existing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` already required.

---

## Out of Scope

- Manufacturing module (dropped by user request)
- Reports / Settings modules beyond Users page
- Mock → real API routes (next spec)
- Fine-grained RBAC beyond what Zustand gates already implement
