# Modal Fix + Mock Data + RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the follow-up modal positioning bug, populate all pages with rich mock data, and add a 3-role RBAC system (Owner/Manager/Worker).

**Architecture:** Three independent tracks: (1) CSS/animation fix in one component, (2) API route mock fallbacks when Prisma DB is empty, (3) client-side Zustand role store driving nav filtering and action gating across all pages.

**Tech Stack:** Next.js 15 App Router, React 18, Framer Motion, Zustand (with persist), Radix UI, TanStack Table, @dnd-kit, SWR

---

## File Map

**Create:**
- `apps/web/src/lib/role-store.ts` — Zustand store (role state + persist to localStorage)
- `apps/web/src/lib/use-role.ts` — hook with derived permission helpers
- `apps/web/src/components/layout/role-switcher.tsx` — role dropdown for sidebar footer

**Modify:**
- `apps/web/src/components/follow-ups/add-followup-modal.tsx` — fix modal centering
- `apps/web/src/app/api/follow-ups/route.ts` — mock fallback when DB is empty
- `apps/web/src/app/api/dashboard/route.ts` — mock fallback when DB is empty
- `apps/web/src/app/api/payments/route.ts` — mock fallback when DB is empty
- `apps/web/src/components/layout/sidebar.tsx` — add role-switcher, filter Payments nav item
- `apps/web/src/app/(dashboard)/payments/page.tsx` — block workers with access denied screen
- `apps/web/src/components/follow-ups/follow-ups-client.tsx` — hide edit actions for workers
- `apps/web/src/components/crm/pipeline/pipeline-client.tsx` — disable drag for workers

---

## Task 1: Fix modal positioning bug

**Files:**
- Modify: `apps/web/src/components/follow-ups/add-followup-modal.tsx`

**Root cause:** `DialogPrimitive.Content` renders as a `motion.div` with `style={{ transform: 'translate(-50%, -50%)' }}` AND Framer Motion `y: 12 → y: 0` animation. Framer Motion replaces the entire transform string with its own composited value, stripping the centering offset. The dialog appears offset at bottom-right instead of centered.

- [ ] **Step 1: Replace the motion.div structure in add-followup-modal.tsx**

Find this block (around line 154–173):
```tsx
<DialogPrimitive.Content asChild>
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 12 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, y: 8 }}
    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 540,
      maxWidth: '95vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      zIndex: 61,
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      padding: 28,
    }}
  >
```

Replace with a static centering wrapper + animated inner card:
```tsx
<DialogPrimitive.Content asChild>
  <div
    style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 61,
      width: 540,
      maxWidth: '95vw',
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        padding: 28,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
```

Also add a closing `</div>` for the new outer wrapper before `</DialogPrimitive.Content>`. The file currently has one closing `</motion.div>` before `</DialogPrimitive.Content>` — it now needs `</motion.div></div>`.

- [ ] **Step 2: Verify the modal opens centered**

Run dev server: `pnpm dev`
Navigate to `/follow-ups`, click "New Walk-in". Modal must appear centered on screen.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/follow-ups/add-followup-modal.tsx
git commit -m "fix: center add-followup modal by separating CSS centering from Framer Motion transform"
```

---

## Task 2: Follow-ups API mock fallback

**Files:**
- Modify: `apps/web/src/app/api/follow-ups/route.ts`

When Prisma returns 0 follow-ups (empty DB), the follow-ups page shows nothing. We fall back to the rich mock data already in `followup-data.ts`.

- [ ] **Step 1: Add mock fallback to GET handler**

At the top of the file, add the import after existing imports:
```ts
import { followUps as mockFollowUps } from '@/lib/mock/followup-data'
```

In the `GET` handler, after `const all = await prisma.followUp.findMany(...)`, add a fallback:

```ts
// If DB is empty, serve mock data
if (all.length === 0) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const active = mockFollowUps.filter((f) => f.status !== 'won' && f.status !== 'lost')
  const overdue = active.filter((f) => f.nextFollowUpDate < now)
  const wonMonth = mockFollowUps.filter((f) => f.status === 'won' && f.updatedAt >= startOfMonth)
  const lostMonth = mockFollowUps.filter((f) => f.status === 'lost' && f.updatedAt >= startOfMonth)
  const wonValue = wonMonth.reduce((s, f) => s + (f.quotationValue ?? f.estimatedBudget ?? 0), 0)

  const followUps: FollowUpItem[] = mockFollowUps.map((f) => ({
    id: f.id,
    type: f.type.toUpperCase(),
    customerName: f.customerName,
    customerPhone: f.customerPhone,
    customerType: f.customerType.toUpperCase(),
    brandsInterested: f.brandsInterested as string[],
    productsNoted: f.productsNoted ?? null,
    estimatedBudget: f.estimatedBudget ?? null,
    projectName: f.projectName ?? null,
    quotationId: f.quotationId ?? null,
    quotationNumber: f.quotationNumber ?? null,
    quotationValue: f.quotationValue ?? null,
    status: f.status.toUpperCase(),
    nextFollowUpDate: f.nextFollowUpDate.toISOString(),
    lastContactedAt: f.lastContactedAt?.toISOString() ?? null,
    notes: f.notes ?? null,
    assignedTo: f.assignedTo ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    responses: f.responses.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      method: r.method.toUpperCase(),
      outcome: r.outcome,
      nextAction: r.nextAction ?? null,
      staffMember: r.staffMember,
    })),
  }))

  return NextResponse.json({
    followUps,
    kpis: {
      active: active.length,
      overdue: overdue.length,
      wonThisMonth: wonMonth.length,
      wonValueThisMonth: wonValue,
      lostThisMonth: lostMonth.length,
    },
  } satisfies FollowUpsListResponse)
}
```

- [ ] **Step 2: Verify follow-ups page shows data**

With dev server running, visit `/follow-ups`. You should see 10 follow-up rows (Anjali Sharma, Priya Nambiar, Mahesh Thakur, etc.) and KPI tiles showing non-zero values.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/follow-ups/route.ts
git commit -m "feat: serve mock follow-ups when DB is empty"
```

---

## Task 3: Dashboard API mock fallback

**Files:**
- Modify: `apps/web/src/app/api/dashboard/route.ts`

When all Prisma queries return zero results, build the dashboard response from existing mock files.

- [ ] **Step 1: Add mock imports to dashboard route**

Add at the top after existing imports:
```ts
import { followUps as mockFollowUps } from '@/lib/mock/followup-data'
import { activityData, topCustomers as mockTopCustomers, revenueData } from '@/lib/mock/dashboard-data'
```

- [ ] **Step 2: Add the mock fallback condition**

After all Prisma queries resolve and KPI values are computed, add a check before assembling the response. Find the line `const response: DashboardData = {` and insert before it:

```ts
const dbIsEmpty =
  followUpCounts.active === 0 &&
  openQuotationData.length === 0 &&
  salesData.length === 0 &&
  activityResult.activities.length === 0

if (dbIsEmpty) {
  const now = new Date()
  const activeFollowUps = mockFollowUps.filter((f) => f.status !== 'won' && f.status !== 'lost').length
  const overdueFollowUps = mockFollowUps.filter(
    (f) => f.status !== 'won' && f.status !== 'lost' && f.nextFollowUpDate < now
  ).length

  const mockResponse: DashboardData = {
    kpis: {
      activeFollowUps,
      overdueFollowUps,
      openQuotationsCount: 18,
      openQuotationsPipelineValue: 4820000,
      poLinesInTransit: 12,
      outstandingPayments: 688000,
      collectedThisMonth: 2847500,
    },
    recentActivity: activityData.map((a) => ({
      id: a.id,
      type: a.type,
      description: `${a.action} ${a.target}${a.value ? ` · ${a.value}` : ''}`,
      userName: a.user.name,
      contactId: null,
      value: null,
      createdAt: a.timestamp.toISOString(),
    })),
    topCustomers: mockTopCustomers.map((c) => ({
      rank: c.rank,
      customerName: c.name,
      revenue: c.revenue,
      orderCount: c.orders,
      outstanding: c.outstanding,
    })),
    revenueByMonth: revenueData.map((r) => ({
      month: r.month,
      year: new Date().getFullYear(),
      revenue: r.revenue,
    })),
    purchaseStages: [
      { stage: 'Pending CO',   qty: 5 },
      { stage: 'Pending Dist', qty: 3 },
      { stage: 'At Godown',    qty: 4 },
      { stage: 'In Box',       qty: 2 },
      { stage: 'Dispatched',   qty: 8 },
    ],
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(mockResponse)
}
```

- [ ] **Step 3: Verify dashboard shows rich data**

Visit `/dashboard`. KPI tiles should show non-zero values, revenue chart should show 12 months of data, activity feed should show 8 activities, top customers table should show Lodha Developers, Oberoi Realty, etc.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/dashboard/route.ts
git commit -m "feat: serve mock dashboard data when DB is empty"
```

---

## Task 4: Payments API mock fallback

**Files:**
- Modify: `apps/web/src/app/api/payments/route.ts`

- [ ] **Step 1: Read the full payments GET handler**

Read `apps/web/src/app/api/payments/route.ts` lines 50–end to see the full shape of the response so mock data matches exactly.

- [ ] **Step 2: Add mock payments data and fallback**

At the top of the file, after existing imports, add:
```ts
import type { PaymentsListResponse } from './route'

const MOCK_ORDERS: import('./route').PaymentSummary[] = [
  {
    id: 'so-mock-01',
    number: 'SO-2025-0234',
    customerId: 'c01',
    customerName: 'Lodha Developers Ltd',
    customerPhone: '+91 98765 44321',
    status: 'CONFIRMED',
    projectName: 'Lodha Palava Phase 7',
    mrpTotal: 2400000,
    offerTotal: 2180000,
    paidTotal: 1090000,
    outstandingTotal: 1090000,
    lastPaymentAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-02',
    number: 'SO-2025-0228',
    customerId: 'c02',
    customerName: 'Prestige Group (Mumbai)',
    customerPhone: '+91 87654 99001',
    status: 'PROCESSING',
    projectName: 'Prestige Windsor Penthouses',
    mrpTotal: 1950000,
    offerTotal: 1724000,
    paidTotal: 862000,
    outstandingTotal: 862000,
    lastPaymentAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-03',
    number: 'SO-2025-0221',
    customerId: 'c03',
    customerName: 'Sanjay Patil Interior Works',
    customerPhone: '+91 99204 56789',
    status: 'DELIVERED',
    projectName: 'Runwal Greens 2BHK',
    mrpTotal: 200000,
    offerTotal: 176000,
    paidTotal: 176000,
    outstandingTotal: 0,
    lastPaymentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-04',
    number: 'SO-2025-0215',
    customerId: 'c04',
    customerName: 'Rajesh Constructions Pvt Ltd',
    customerPhone: '+91 98200 11234',
    status: 'DISPATCHED',
    projectName: 'Rajesh Heights 12 Units',
    mrpTotal: 340000,
    offerTotal: 298000,
    paidTotal: 149000,
    outstandingTotal: 149000,
    lastPaymentAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-05',
    number: 'SO-2025-0208',
    customerId: 'c05',
    customerName: 'Oberoi Realty',
    customerPhone: '+91 70000 12345',
    status: 'CONFIRMED',
    projectName: 'Oberoi Sky City Tower A',
    mrpTotal: 820000,
    offerTotal: 740000,
    paidTotal: 370000,
    outstandingTotal: 370000,
    lastPaymentAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
]
```

In the `GET` handler, after `const orders = await prisma.salesOrder.findMany(...)`, add before the mapping/response:
```ts
if (orders.length === 0) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalOutstanding = MOCK_ORDERS.reduce((s, o) => s + o.outstandingTotal, 0)
  const collectedThisMonth = MOCK_ORDERS
    .filter((o) => o.lastPaymentAt && new Date(o.lastPaymentAt) >= startOfMonth)
    .reduce((s, o) => s + o.paidTotal, 0)
  const fullyPaid = MOCK_ORDERS.filter((o) => o.outstandingTotal === 0).length
  return NextResponse.json({
    orders: MOCK_ORDERS,
    kpis: {
      totalOutstanding,
      collectedThisMonth,
      activeOrders: MOCK_ORDERS.length - fullyPaid,
      fullyPaidOrders: fullyPaid,
    },
  } satisfies PaymentsListResponse)
}
```

- [ ] **Step 3: Verify payments page shows data**

Visit `/payments`. Should show 5 orders (Lodha, Prestige, Sanjay Patil, etc.) with KPI tiles showing outstanding amounts.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/payments/route.ts
git commit -m "feat: serve mock payment orders when DB is empty"
```

---

## Task 5: Role store and hook

**Files:**
- Create: `apps/web/src/lib/role-store.ts`
- Create: `apps/web/src/lib/use-role.ts`

- [ ] **Step 1: Install zustand persist check**

Zustand is already installed. Verify:
```bash
cd apps/web && grep '"zustand"' ../../package.json ../../../packages/*/package.json package.json 2>/dev/null | head -5
```

- [ ] **Step 2: Create role-store.ts**

```ts
// apps/web/src/lib/role-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'owner' | 'manager' | 'worker'

interface RoleState {
  role: Role
  setRole: (role: Role) => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'owner',
      setRole: (role) => set({ role }),
    }),
    { name: 'forge-role' }
  )
)
```

- [ ] **Step 3: Create use-role.ts**

```ts
// apps/web/src/lib/use-role.ts
'use client'

import { useRoleStore, type Role } from './role-store'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  const { role, setRole } = useRoleStore()
  return {
    role,
    setRole,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
    canSwitchRole: role !== 'worker',
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/role-store.ts apps/web/src/lib/use-role.ts
git commit -m "feat: add role store and useRole hook (owner/manager/worker)"
```

---

## Task 6: Role switcher component

**Files:**
- Create: `apps/web/src/components/layout/role-switcher.tsx`

- [ ] **Step 1: Create role-switcher.tsx**

```tsx
// apps/web/src/components/layout/role-switcher.tsx
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Shield, Users, Wrench } from 'lucide-react'
import { useRole, ROLE_LABELS, type Role } from '@/lib/use-role'
import { cn } from '@forge/ui'

const ROLE_CONFIG: Record<Role, { icon: React.ElementType; color: string; dot: string }> = {
  owner:   { icon: Shield, color: '#F4F4F5', dot: '#22C55E' },
  manager: { icon: Users,  color: '#F4F4F5', dot: '#3B82F6' },
  worker:  { icon: Wrench, color: '#F4F4F5', dot: '#F59E0B' },
}

export function RoleSwitcher({ collapsed }: { collapsed: boolean }) {
  const { role, setRole, canSwitchRole } = useRole()
  if (!canSwitchRole) return null

  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex w-full cursor-pointer items-center rounded-md transition-colors',
            collapsed ? 'h-9 justify-center' : 'h-9 gap-2 px-2.5',
          )}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon size={15} style={{ color: '#A1A1AA' }} />
            <div
              style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: config.dot,
                border: '1px solid var(--shell-bg)',
              }}
            />
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1, fontSize: '12px', color: '#A1A1AA', textAlign: 'left' }}>
                {ROLE_LABELS[role]}
              </span>
              <ChevronDown size={11} style={{ color: '#52525B' }} />
            </>
          )}
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side="right"
          align="end"
          sideOffset={8}
          style={{
            backgroundColor: '#27272A',
            borderColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            minWidth: 160,
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 10, color: '#52525B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Switch Role
          </div>
          {(['owner', 'manager', 'worker'] as Role[]).map((r) => {
            const rc = ROLE_CONFIG[r]
            const RoleIcon = rc.icon
            return (
              <DropdownMenuPrimitive.Item
                key={r}
                onSelect={() => setRole(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                  color: role === r ? 'white' : '#A1A1AA',
                  backgroundColor: role === r ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: 6, margin: '0 4px', outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (role !== r) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (role !== r) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <RoleIcon size={13} />
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 5, height: 5, borderRadius: '50%', backgroundColor: rc.dot, border: '1px solid #27272A' }} />
                </div>
                {ROLE_LABELS[r]}
                {role === r && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#52525B' }}>current</span>}
              </DropdownMenuPrimitive.Item>
            )
          })}
          <div style={{ height: 6 }} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/role-switcher.tsx
git commit -m "feat: add RoleSwitcher component for sidebar footer"
```

---

## Task 7: Wire role switcher into sidebar + filter nav

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add imports to sidebar.tsx**

Add at the top with existing imports:
```tsx
import { RoleSwitcher } from './role-switcher'
import { useRole } from '@/lib/use-role'
```

- [ ] **Step 2: Filter NAV_GROUPS in the Sidebar component**

Inside the `Sidebar` function body, after `const pathname = usePathname()`, add:
```tsx
const { canViewPayments } = useRole()

const visibleGroups = NAV_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) =>
    item.href === '/payments' ? canViewPayments : true
  ),
}))
```

Then in the JSX, replace `{NAV_GROUPS.map((group, gi) => (` with `{visibleGroups.map((group, gi) => (`.

- [ ] **Step 3: Add RoleSwitcher to sidebar footer**

In the sidebar footer `<div>` (the one with `border-t pb-2 pt-2`), add `<RoleSwitcher>` just above the `<UserMenu>` line:

```tsx
<div className="mx-1.5 mb-1">
  <RoleSwitcher collapsed={sidebarCollapsed} />
</div>
```

Insert this block between the `⌘K to search anywhere` motion.div and the `<UserMenu>` wrapper div.

- [ ] **Step 4: Verify sidebar behavior**

With dev server running:
1. As Owner: Payments appears in nav, role switcher shows in footer with green dot
2. Switch to Worker: Payments disappears from nav, role switcher disappears
3. Switch back: role switcher reappears (need to refresh — worker can't switch, so test as manager)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: wire role switcher into sidebar and filter Payments nav for workers"
```

---

## Task 8: Block workers from Payments page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/payments/page.tsx`

- [ ] **Step 1: Replace payments/page.tsx content**

```tsx
'use client'

import { useRole } from '@/lib/use-role'
import PaymentsClient from '@/components/payments/PaymentsClient'
import { Lock } from 'lucide-react'

export default function PaymentsPage() {
  const { canViewPayments } = useRole()

  if (!canViewPayments) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 16,
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(239,68,68,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Lock size={24} style={{ color: '#EF4444' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Access Restricted
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Payments is only available to Owners and Managers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-5 pb-10" style={{ minHeight: '100%' }}>
        <PaymentsClient />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify guard works**

Switch role to Worker (as Owner/Manager first). Try navigating to `/payments`. Should see the lock screen. Switch back to Owner — payments page shows normally.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/payments/page.tsx
git commit -m "feat: block worker role from accessing payments page"
```

---

## Task 9: Hide follow-ups edit actions for workers

**Files:**
- Modify: `apps/web/src/components/follow-ups/follow-ups-client.tsx`

Workers can see the follow-ups list and add new ones, but cannot change status, log responses, or move cards on the board.

- [ ] **Step 1: Add useRole to follow-ups-client.tsx**

Add import at the top:
```tsx
import { useRole } from '@/lib/use-role'
```

Inside `FollowUpsClient`, add near the top of the component body:
```tsx
const { canEdit } = useRole()
```

- [ ] **Step 2: Pass canEdit to FollowUpsTable and FollowUpBoard**

Update the `FollowUpsTable` render:
```tsx
<FollowUpsTable
  data={filtered}
  onRowClick={handleRowClick}
  canEdit={canEdit}
/>
```

Update the `FollowUpBoard` render:
```tsx
<FollowUpBoard
  data={filtered}
  onCardClick={handleRowClick}
  onStatusChange={(id, status) => void handleStatusChange(id, status)}
  canEdit={canEdit}
/>
```

Update the `FollowUpSlideOver` render:
```tsx
<FollowUpSlideOver
  followUp={selected}
  onClose={() => setSelected(null)}
  onRefresh={async () => { ... }}
  onStatusChange={handleStatusChange}
  onLogResponse={handleLogResponse}
  canEdit={canEdit}
/>
```

- [ ] **Step 3: Accept canEdit in FollowUpsTable**

Read `apps/web/src/components/follow-ups/follow-ups-table.tsx`. Add `canEdit?: boolean` to its props interface. Wherever there are status-change buttons or action dropdowns in the table rows, wrap them in `{canEdit && ...}`. Row clicks (to open slide-over) remain enabled for all roles.

- [ ] **Step 4: Accept canEdit in FollowUpBoard**

Read `apps/web/src/components/follow-ups/follow-up-board.tsx`. Add `canEdit?: boolean` to its props. Pass `canEdit` to the DnD sensor/context so drag only works when `canEdit` is true — add `sensors={canEdit ? sensors : []}` to the `<DndContext>` element.

- [ ] **Step 5: Accept canEdit in FollowUpSlideOver**

Read `apps/web/src/components/follow-ups/follow-up-slide-over.tsx`. Add `canEdit?: boolean` to its props. Wrap status-change buttons, log-response form, and any edit actions in `{canEdit && ...}`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/follow-ups/follow-ups-client.tsx \
        apps/web/src/components/follow-ups/follow-ups-table.tsx \
        apps/web/src/components/follow-ups/follow-up-board.tsx \
        apps/web/src/components/follow-ups/follow-up-slide-over.tsx
git commit -m "feat: hide follow-up edit actions for worker role"
```

---

## Task 10: Disable CRM pipeline drag for workers

**Files:**
- Modify: `apps/web/src/components/crm/pipeline/pipeline-client.tsx`

- [ ] **Step 1: Add useRole to pipeline-client.tsx**

Add import:
```tsx
import { useRole } from '@/lib/use-role'
```

Inside the component, add:
```tsx
const { canEdit } = useRole()
```

- [ ] **Step 2: Disable DnD sensors for workers**

Find where `useSensors` or `<DndContext sensors={...}>` is used. Add:
```tsx
<DndContext sensors={canEdit ? sensors : []} ...>
```

This keeps cards visible and clickable but disables drag when the user is a worker.

- [ ] **Step 3: Hide edit/delete buttons on deal cards**

Read `apps/web/src/components/crm/pipeline/deal-card.tsx`. Pass `canEdit` as a prop and wrap any action buttons (edit, delete, move) in `{canEdit && ...}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/crm/pipeline/pipeline-client.tsx \
        apps/web/src/components/crm/pipeline/deal-card.tsx
git commit -m "feat: disable pipeline drag-and-drop and edit actions for worker role"
```

---

## Final verification

- [ ] Start dev server: `pnpm dev`
- [ ] `/follow-ups` — 10 rows visible, KPIs non-zero, modal opens centered
- [ ] `/dashboard` — KPIs, charts, activity, customers all populated
- [ ] `/payments` — 5 orders visible as Owner/Manager; lock screen as Worker
- [ ] Sidebar — role switcher visible as Owner/Manager, hidden as Worker; Payments nav hidden as Worker
- [ ] Follow-ups as Worker — rows visible, "New Walk-in" button works, no status-change actions
- [ ] CRM Pipeline as Worker — cards visible, drag disabled
- [ ] Role persists across page refresh (localStorage)

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET
