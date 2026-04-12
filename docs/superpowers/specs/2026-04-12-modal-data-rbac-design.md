# Design: Modal Fix + Mock Data Fallbacks + RBAC
**Date:** 2026-04-12
**Scope:** Forge — apps/web

---

## 1. Modal Positioning Fix

**Problem:** `AddFollowUpModal` uses Framer Motion `y` animation on the same element that has `transform: translate(-50%, -50%)` in its `style` prop. Framer Motion overwrites the CSS transform with its own composited transform string, stripping the centering offset. Result: modal appears at the bottom-right quadrant of the screen.

**Fix:** Separate centering from animation.
- Outer `div`: `position:fixed, top:50%, left:50%, transform:translate(-50%,-50%), zIndex:61` — static, no motion
- Inner `motion.div`: `scale 0.96→1, opacity 0→1` only — no `y` or `transform` in style prop

**File:** `apps/web/src/components/follow-ups/add-followup-modal.tsx`

---

## 2. Mock Data Fallbacks in API Routes

**Problem:** All API routes query Prisma. The DB schema is a placeholder — no data. Routes return empty arrays / zero KPIs. The app looks blank.

**Approach:** Each route checks if Prisma returned empty results. If so, it returns data computed from the existing mock files instead of zeros. No schema changes. No new files — mock files already exist with rich data.

### `/api/follow-ups` (GET)
- If `prisma.followUp.findMany()` returns 0 rows → import `followup-data.ts`, map mock `FollowUp[]` to `FollowUpItem[]` shape, compute KPIs from mock data.
- POST still writes to Prisma (real creates work once DB is connected).

### `/api/dashboard` (GET)
- After all Prisma queries resolve, check if everything is zero (follow-ups=0, quotations=0, sales=0, activity=0).
- If so → build `DashboardData` from `dashboard-data.ts`, `followup-data.ts`, `sales-data.ts`.
- Mock KPIs: activeFollowUps=8, overdueFollowUps=3, openQuotationsCount=18, openQuotationsPipelineValue=4820000, poLinesInTransit=12, outstandingPayments=688000, collectedThisMonth=2847500.
- Mock revenue: use `revenueData` from `dashboard-data.ts`.
- Mock activity: map `activityData` from `dashboard-data.ts`.
- Mock top customers: map `topCustomers` from `dashboard-data.ts`.

### `/api/payments` (GET)
- If `prisma.salesOrder.findMany()` returns 0 rows → serve mock payment data derived from `sales-data.ts`.

---

## 3. Role-Based Access Control (RBAC)

**Roles:** `owner` | `manager` | `worker`

**Role matrix:**

| Capability         | Owner | Manager | Worker |
|--------------------|-------|---------|--------|
| View Payments page | ✅    | ✅      | ❌     |
| Switch roles       | ✅    | ✅      | ❌     |
| Edit/delete/move   | ✅    | ✅      | ❌     |
| Add new records    | ✅    | ✅      | ✅     |
| All other pages    | ✅    | ✅      | ✅     |

### New files

**`apps/web/src/lib/role-store.ts`**
- Zustand store with `persist` middleware (localStorage key: `forge-role`)
- State: `{ role: Role, setRole: (r: Role) => void }`
- Default: `'owner'`

**`apps/web/src/lib/use-role.ts`**
- Hook wrapping the store
- Returns: `{ role, setRole, canEdit, canViewPayments, canSwitchRole }`
- `canEdit = role !== 'worker'`
- `canViewPayments = role !== 'worker'`
- `canSwitchRole = role !== 'worker'`

**`apps/web/src/components/layout/role-switcher.tsx`**
- Rendered in the sidebar footer
- Only visible when `canSwitchRole` is true
- Dropdown: Owner / Manager / Worker
- Shows current role with a colored badge dot

### Modified files

**`apps/web/src/components/layout/dashboard-shell.tsx`** (or sidebar component)
- Import `RoleSwitcher`, render in sidebar footer
- Import `useRole`, filter `NAV_GROUPS` to remove Payments item when `role === 'worker'`

**`apps/web/src/app/(dashboard)/payments/page.tsx`**
- Read role from store; if `role === 'worker'`, render an "Access Restricted" screen instead of `PaymentsClient`

**`apps/web/src/components/follow-ups/follow-ups-client.tsx`**
- Read `canEdit` from `useRole`
- Hide status-change controls in the table/board when `!canEdit`
- Keep "New Walk-in" button always visible

**`apps/web/src/components/crm/*`** (pipeline kanban)
- Disable drag-and-drop when `!canEdit`
- Hide edit/delete buttons on cards when `!canEdit`

---

## Implementation order

1. Modal fix (isolated, 10 min)
2. Mock data fallbacks — follow-ups API (unblocks the page from looking empty)
3. Mock data fallbacks — dashboard API
4. Mock data fallbacks — payments API
5. RBAC store + hook (no UI yet)
6. Role switcher component
7. Wire role switcher into sidebar
8. Nav filtering for workers
9. Payments page guard
10. Follow-ups + CRM action filtering
