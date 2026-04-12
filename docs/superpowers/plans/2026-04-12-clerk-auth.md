# Clerk Auth Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Clerk authentication — gate all dashboard routes, sync Clerk users to DB via webhook, replace fake Zustand role switcher with real Clerk session roles, and add an owner-only user management page.

**Architecture:** Hybrid approach — Clerk holds `publicMetadata.role` (available in JWT, no DB round-trip), a webhook syncs Clerk user events to the DB `User` table, and the Settings Users page calls the Clerk Admin SDK to change roles (triggering the webhook to sync back to DB). Middleware uses `auth.protect()` to gate all non-public routes.

**Tech Stack:** `@clerk/nextjs`, `svix` (webhook verification), Prisma, Next.js 15 App Router route handlers

**Design spec:** `docs/superpowers/specs/2026-04-12-clerk-auth-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modify | Update `UserRole` enum + default |
| `packages/db/prisma/migrations/<ts>_update_user_role/migration.sql` | Create | Raw SQL enum migration |
| `apps/web/src/middleware.ts` | Create | Clerk route protection |
| `apps/web/src/app/api/webhooks/clerk/route.ts` | Create | Clerk user sync webhook |
| `apps/web/src/app/api/settings/users/route.ts` | Create | GET — list all users |
| `apps/web/src/app/api/settings/users/[id]/route.ts` | Create | PATCH — update user role |
| `apps/web/src/app/(dashboard)/settings/users/page.tsx` | Create | Owner-only user management UI |
| `apps/web/src/lib/use-role.ts` | Modify | Read role from Clerk session (drop Zustand) |
| `apps/web/src/components/layout/dashboard-shell.tsx` | Modify | Remove role-cookie sync (legacy) |
| `apps/web/src/components/layout/sidebar.tsx` | Modify | Remove `RoleSwitcher` import + usage |
| `apps/web/src/lib/role-store.ts` | Delete | Replaced by Clerk session |
| `apps/web/src/components/layout/role-switcher.tsx` | Delete | Replaced by real roles |

---

## Task 1: Update DB Schema — UserRole Enum

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_update_user_role/migration.sql`

PostgreSQL can't rename enum values directly. We create a new enum type, migrate the column, drop the old type, rename the new one.

- [ ] **Step 1: Update schema.prisma**

Open `packages/db/prisma/schema.prisma`. Change the `UserRole` enum and the `User` model default:

```prisma
enum UserRole {
  OWNER
  MANAGER
  WORKER
}
```

In the `User` model, change the role field default:
```prisma
role  UserRole  @default(WORKER)
```

- [ ] **Step 2: Create the migration manually**

```bash
cd /path/to/forge
# Create migration directory with today's timestamp
mkdir -p packages/db/prisma/migrations/$(date +%Y%m%d%H%M%S)_update_user_role
```

Create the migration SQL file at that path as `migration.sql`:

```sql
-- AlterEnum: rename ADMIN→OWNER, SALES→WORKER, add MANAGER
-- PostgreSQL cannot rename enum values directly; we create a new type.

CREATE TYPE "UserRole_new" AS ENUM ('OWNER', 'MANAGER', 'WORKER');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING CASE "role"::text
    WHEN 'ADMIN' THEN 'OWNER'::"UserRole_new"
    WHEN 'SALES' THEN 'WORKER'::"UserRole_new"
    ELSE 'WORKER'::"UserRole_new"
  END;

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'WORKER'::"UserRole_new";

DROP TYPE "UserRole";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";
```

- [ ] **Step 3: Mark migration as applied and push schema**

```bash
# If using a real DB, apply the migration:
cd packages/db && npx prisma migrate deploy

# If running locally against the DB directly:
npx prisma db push

# Regenerate Prisma client:
npx prisma generate
```

Expected: no errors, Prisma client regenerated with new `UserRole` enum.

- [ ] **Step 4: Verify schema compiles**

```bash
cd /path/to/forge && pnpm type-check
```

Expected: no type errors related to `UserRole`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): update UserRole enum ADMIN/SALES → OWNER/MANAGER/WORKER"
```

---

## Task 2: Install svix and Configure Env Vars

**Files:** `apps/web/package.json` (via pnpm)

`svix` is Clerk's official library for verifying webhook signatures. Without it, anyone could POST fake user events to the webhook endpoint.

- [ ] **Step 1: Install svix**

```bash
cd /path/to/forge
pnpm add svix --filter web
```

Expected: `svix` appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Add env var placeholder**

Open `apps/web/.env.local` (create if it doesn't exist). Add:

```bash
CLERK_WEBHOOK_SECRET=whsec_REPLACE_WITH_REAL_SECRET
```

Get the real value from Clerk dashboard → Webhooks → your endpoint → Signing Secret. For now the placeholder prevents runtime crashes during development.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: install svix for Clerk webhook verification"
```

---

## Task 3: Create Middleware

**Files:**
- Create: `apps/web/src/middleware.ts`

This is the Clerk route guard. It checks every non-static request and redirects unauthenticated users to `/sign-in`. No role checks here.

- [ ] **Step 1: Create `apps/web/src/middleware.ts`**

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

- [ ] **Step 2: Start dev server and verify gate works**

```bash
pnpm dev
```

Open a private/incognito browser window and navigate to `http://localhost:3000/dashboard`. Expected: redirected to `/sign-in`. If you land on the dashboard, the middleware isn't running — check the file path is exactly `apps/web/src/middleware.ts`.

- [ ] **Step 3: Verify webhook route is still public**

In the same incognito window, open DevTools → Network. `curl -X POST http://localhost:3000/api/webhooks/clerk` should return `400` (bad signature), not a redirect. A redirect means the route is incorrectly gated.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(auth): add Clerk middleware — gate all dashboard routes"
```

---

## Task 4: Create Clerk Webhook Route

**Files:**
- Create: `apps/web/src/app/api/webhooks/clerk/route.ts`

Handles `user.created` and `user.updated` events. Creates/updates the DB `User` row to mirror Clerk's data. Uses `svix` to verify the payload signature — reject anything that doesn't match `CLERK_WEBHOOK_SECRET`.

- [ ] **Step 1: Create the route file**

```ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@forge/db'

type ClerkUserData = {
  id: string
  email_addresses: Array<{ email_address: string; id: string }>
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  public_metadata: { role?: string }
}

type ClerkWebhookEvent = {
  type: string
  data: ClerkUserData
}

function getEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
}

function getName(data: ClerkUserData): string {
  return [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getRole(metadata: { role?: string }): 'OWNER' | 'MANAGER' | 'WORKER' {
  const r = metadata.role?.toUpperCase()
  if (r === 'OWNER' || r === 'MANAGER' || r === 'WORKER') return r
  return 'WORKER'
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return NextResponse.json({ received: true })
  }

  const { data } = event
  const email = getEmail(data)
  const name = getName(data)
  const role = getRole(data.public_metadata)

  await prisma.user.upsert({
    where: { clerkId: data.id },
    create: { clerkId: data.id, email, name, role },
    update: { email, name, role },
  })

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Register the webhook in Clerk dashboard**

Go to Clerk dashboard → Webhooks → Add Endpoint.
- URL: `https://your-domain.com/api/webhooks/clerk` (or use ngrok for local testing)
- Events to subscribe: `user.created`, `user.updated`
- Copy the Signing Secret → paste into `CLERK_WEBHOOK_SECRET` in `.env.local`

- [ ] **Step 3: Test the webhook locally with Clerk CLI or ngrok**

```bash
# Option A — Clerk CLI (if installed):
clerk webhooks replay

# Option B — ngrok:
ngrok http 3000
# Use the ngrok URL as your webhook endpoint in Clerk dashboard
# Then sign in with a Clerk account and watch for the user.created event
```

Expected: after sign-in, `prisma.user.findFirst({ where: { clerkId: ... } })` returns a row.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/webhooks/clerk/route.ts
git commit -m "feat(auth): add Clerk webhook — sync user.created/updated to DB"
```

---

## Task 5: Create Settings Users API Routes

**Files:**
- Create: `apps/web/src/app/api/settings/users/route.ts`
- Create: `apps/web/src/app/api/settings/users/[id]/route.ts`

Both routes are owner-only. They read the current user's role from the Clerk session (JWT claims), not from a DB lookup. If the caller isn't an owner, return `403`.

- [ ] **Step 1: Create `apps/web/src/app/api/settings/users/route.ts`**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET() {
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, clerkId: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/settings/users/[id]/route.ts`**

```ts
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'

const PatchSchema = z.object({
  role: z.enum(['owner', 'manager', 'worker']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth()
  const callerRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || !user.clerkId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const client = await clerkClient()
  await client.users.updateUser(user.clerkId, {
    publicMetadata: { role: parsed.data.role },
  })

  // DB update happens via webhook (user.updated event)
  // Return optimistic response
  return NextResponse.json({ id, role: parsed.data.role })
}
```

- [ ] **Step 3: Verify routes respond correctly**

```bash
# With a valid owner session cookie (sign in as an owner first):
curl -X GET http://localhost:3000/api/settings/users \
  -H "Cookie: __session=YOUR_CLERK_SESSION_COOKIE"
# Expected: JSON array of users

# Without a session:
curl -X GET http://localhost:3000/api/settings/users
# Expected: redirect to sign-in (middleware intercepts) or 403
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/settings/users/
git commit -m "feat(auth): add settings/users API routes — list and update roles"
```

---

## Task 6: Create Settings Users Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/settings/users/page.tsx`

Owner-only UI. Fetches users from `/api/settings/users`, shows a table with a role dropdown per row. Role changes call `PATCH /api/settings/users/[id]`. Redirect non-owners away on the server.

- [ ] **Step 1: Create the page**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsUsersClient } from './settings-users-client'

export default async function SettingsUsersPage() {
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (role !== 'owner') {
    redirect('/dashboard')
  }

  return <SettingsUsersClient />
}
```

- [ ] **Step 2: Create `apps/web/src/app/(dashboard)/settings/users/settings-users-client.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { type Role, ROLE_LABELS } from '@/lib/use-role'

type User = {
  id: string
  name: string
  email: string
  role: Role
  clerkId: string | null
}

const ROLE_OPTIONS: Role[] = ['owner', 'manager', 'worker']

export function SettingsUsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
  }, [])

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setUpdating(userId)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
    setUpdating(null)
  }

  if (loading) {
    return <div className="p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading users…</div>
  }

  return (
    <div className="p-6">
      <h1
        className="mb-6 text-xl font-semibold"
        style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
      >
        Users
      </h1>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                  {user.name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={updating === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className="rounded border px-2 py-1 text-sm"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add the Users link to Settings navigation**

Open `apps/web/src/lib/navigation.ts`. Find the Settings nav group. Add a Users item pointing to `/settings/users`.

- [ ] **Step 4: Verify in browser**

Sign in as an owner. Navigate to `/settings/users`. Expected: list of users with role dropdowns. Try changing a role — the dropdown should update immediately (optimistic). Sign in as a worker and navigate directly to `/settings/users` — expected: redirect to `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/settings/users/
git commit -m "feat(auth): add Settings Users page — owner-only role management"
```

---

## Task 7: Replace useRole Hook

**Files:**
- Modify: `apps/web/src/lib/use-role.ts`
- Modify: `apps/web/src/components/layout/dashboard-shell.tsx`

The current `useRole` reads from Zustand. The new version reads `publicMetadata.role` from the Clerk `useUser()` hook. The return shape changes slightly — `setRole` and `canSwitchRole` are removed (no longer meaningful with real auth). All existing `canEdit` and `canViewPayments` call sites continue to work unchanged.

- [ ] **Step 1: Replace `apps/web/src/lib/use-role.ts`**

```ts
'use client'

import { useUser } from '@clerk/nextjs'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  const { user } = useUser()
  const role = ((user?.publicMetadata?.role as string | undefined) ?? 'worker') as Role

  return {
    role,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
  }
}
```

- [ ] **Step 2: Fix dashboard-shell.tsx — remove role cookie sync**

Open `apps/web/src/components/layout/dashboard-shell.tsx`. Find and remove the `useRoleStore` import and the `useEffect` that sets `document.cookie = x-forge-role=...`. The middleware no longer uses that cookie — it reads Clerk JWT directly.

The file currently has (around line 163):
```ts
import { useRoleStore } from '@/lib/role-store'
// ...
const role = useRoleStore.getState().role
document.cookie = `x-forge-role=${role}; path=/; max-age=31536000`
```

Remove the import and that entire effect block.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: no errors. If `setRole` or `canSwitchRole` is referenced somewhere, find the file and remove the usage — those properties no longer exist.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/use-role.ts apps/web/src/components/layout/dashboard-shell.tsx
git commit -m "feat(auth): replace Zustand useRole with real Clerk session role"
```

---

## Task 8: Remove Role Store and Role Switcher

**Files:**
- Delete: `apps/web/src/lib/role-store.ts`
- Delete: `apps/web/src/components/layout/role-switcher.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

With real Clerk roles, the fake role switcher is dead code. Removing it prevents confusion.

- [ ] **Step 1: Delete role-store.ts**

```bash
rm apps/web/src/lib/role-store.ts
```

- [ ] **Step 2: Delete role-switcher.tsx**

```bash
rm apps/web/src/components/layout/role-switcher.tsx
```

- [ ] **Step 3: Remove RoleSwitcher from sidebar.tsx**

Open `apps/web/src/components/layout/sidebar.tsx`. Remove:
1. The import line: `import { RoleSwitcher } from './role-switcher'`
2. The JSX usage: `<RoleSwitcher collapsed={sidebarCollapsed} />`

The sidebar footer area where `RoleSwitcher` rendered can be left empty or replaced with the signed-in user's name/email using `useUser()` from Clerk if desired — but that's optional and out of scope for this task. Just remove it.

- [ ] **Step 4: Type-check and verify no broken imports**

```bash
pnpm type-check
```

Expected: clean. If any file still imports from `role-store`, find it and update it to use `useRole` from `@/lib/use-role` instead.

- [ ] **Step 5: Smoke test in browser**

Sign in and navigate around the app. Confirm:
- Sidebar renders without errors (no `RoleSwitcher` crash)
- `/crm/pipeline` — drag is enabled/disabled correctly based on real role
- `/follow-ups` — edit controls show/hide correctly based on real role

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(auth): remove Zustand role store and fake RoleSwitcher"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Full type-check**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 2: Full build**

```bash
pnpm build
```

Expected: clean build, no missing module errors.

- [ ] **Step 3: End-to-end auth flow**

1. Open incognito browser → navigate to `http://localhost:3000/dashboard` → expected: redirect to `/sign-in`
2. Sign in with an invited Clerk user → expected: land on dashboard
3. Navigate to `/settings/users` as owner → expected: user list visible
4. Change a user's role to `manager` → expected: dropdown updates, webhook fires (check Clerk dashboard → Webhooks → Logs), DB `User.role` updates to `MANAGER`
5. Sign in as that `manager` user → expected: `useRole().role === 'manager'`, `canEdit === true`
6. Sign in as a `worker` → navigate to `/settings/users` → expected: redirect to `/dashboard`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(auth): Clerk auth wiring complete — middleware, webhook, role management"
```

---

## Environment Variables Required

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → your endpoint → Signing Secret |

---

## Clerk Dashboard Config (Manual Steps)

1. **Disable public sign-up:** Clerk dashboard → User & Authentication → Email, Phone, Username → uncheck "Allow users to sign up"
2. **Register webhook endpoint:** Clerk dashboard → Webhooks → Add Endpoint → subscribe to `user.created` and `user.updated`
3. **Invite team members:** Clerk dashboard → Users → Invite → enter email
