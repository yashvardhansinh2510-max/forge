# Tracker Drill-Down — File Audit
_Generated: 2026-03-30_

---

## Entry Point
| File | Role |
|---|---|
| `apps/web/src/app/(dashboard)/purchases/page.tsx` | Route page — renders `<PurchaseTrackerView />` |

---

## Rendering the Stat Cards (209/94/57/26/7/82)

| File | What it does | Change needed |
|---|---|---|
| `TrackerKPIStrip.tsx` | Renders 6 non-clickable KPI chips: **Total Ordered / Pending from Co / Needs PO / At Godown / In Box / Dispatched**. Reads `orders` from `useProcurementStore`, `activeBrand + activeCompanies` from `usePurchasesStore`, computes via `computeKPIs()`. | Make each chip clickable; add `openKPICard` toggle |
| `tracker-utils.ts` → `computeKPIs()` | Aggregates `FlatLine[]` into 6 KPI numbers. `pendingFromCo` is line-level (`qtyOrdered - qtyReceived`); rest are allocation-level. | Add `KPICardKey` type + `getLinesForKPIDrillDown()` helper |
| `usePurchasesStore.ts` | UI state (activeBrand, activeCompanies, viewMode, etc.) | Add `openKPICard: KPICardKey \| null`, `toggleKPICard()`, `closeKPICard()` |

**KPI → BoxAllocationStatus mapping (for drill-down filter):**
```
totalOrdered  → null (all allocations)
pendingFromCo → ['ORDERED']
needsPO       → ['NEEDS_PO']
atGodown      → ['AT_GODOWN']
inBox         → ['IN_BOX']
dispatched    → ['DEL_PENDING', 'DELIVERED', 'GIVEN_OTHER']
```

---

## Rendering the Customer Detail Panel (Products/Needs PO/Pending/In Box/Delivered buttons)

| File | What it does | Change needed |
|---|---|---|
| `CustomerView/CustomerDetailPanel.tsx` | Shows customer avatar/name, 5 static stat boxes (Products / Needs PO / Pending / In Box / Delivered), brand filter pills, `OrderRow` list, footer with pending count + next date. | Make 5 stat boxes clickable buttons → local `statusFilter` state. Combined brand + status filter on product list. Footer: "X pending" → opens KPI panel; "Next: date" → inline date picker. |
| `CustomerView/CustomerView.tsx` | Layout shell — `<CustomerListPanel>` + `<CustomerDetailPanel>` | No changes |
| `CustomerView/CustomerListPanel.tsx` | Left panel list of customers, brand filter pills | No changes |
| `CustomerView/OrderRow.tsx` | Expandable product row — expand → inline form with status select + date + note. Calls `updateAllocationStatus`, `updateAllocationDelivery`, `updateAllocationNote`. | No changes — reused in drill-down panel |
| `CustomerView/StatusFunnel.tsx` | Visual 4-step pipeline dots | No changes |

**Customer stat box → BoxAllocationStatus mapping:**
```
Products  → 'ALL' (all items)
Needs PO  → ['NEEDS_PO']
Pending   → ['ORDERED']
In Box    → ['IN_BOX', 'DEL_PENDING']
Delivered → ['DELIVERED', 'GIVEN_OTHER']
```

---

## Rendering Product Rows (editable)

| File | What it does |
|---|---|
| `EditableCell.tsx` | Generic click-to-edit (text / number / select). Optimistic save, Sonner toast on error. Revert on failure. |
| `procurement-store.ts` | Data mutations: `updateAllocationStatus()`, `updateAllocationDelivery()`, `updateAllocationNote()`. All Zustand immer — reactive instantly. |
| `mock/procurement-data.ts` | Types: `BoxAllocationStatus`, `CustomerAllocation`, `MockPOLineItem`, `ALLOC_STATUS_CONFIG`. |

---

## File to Create

| File | Purpose |
|---|---|
| `StatDrillDownPanel.tsx` | Slide-down panel below KPI strip. Reads `openKPICard` from store, filters `orders` via `getLinesForKPIDrillDown()`. Table: product image \| SKU + brand \| customer \| qty \| status (editable via `EditableCell`). Search + customer filter. Animates open/close. |

---

## Reactivity (zero stale numbers)

All mutations go through `useProcurementStore` (Zustand immer). Both `TrackerKPIStrip` and `StatDrillDownPanel` derive their values from the same `orders` array via `computeKPIs()` / `getLinesForKPIDrillDown()` — so any status edit in the drill-down panel instantly recomputes all KPI chips and customer stat boxes with no extra wiring needed.

---

## Change Summary

```
MODIFY  apps/web/src/lib/usePurchasesStore.ts           + openKPICard state
MODIFY  apps/web/src/lib/tracker-utils.ts               + KPICardKey + getLinesForKPIDrillDown
MODIFY  apps/web/src/components/procurement/TrackerKPIStrip.tsx        clickable chips
MODIFY  apps/web/src/components/procurement/PurchaseTrackerView.tsx    add panel slot
MODIFY  apps/web/src/components/procurement/CustomerView/CustomerDetailPanel.tsx  filter + footer
CREATE  apps/web/src/components/procurement/StatDrillDownPanel.tsx     new component
```
