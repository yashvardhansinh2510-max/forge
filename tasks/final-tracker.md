# Purchase Tracker — Final Complete Overhaul
# File Audit (Step 1 of 12)
# Generated: 2026-03-31

---

## PRISMA SCHEMA

| File | Description |
|------|-------------|
| `packages/db/prisma/schema.prisma` | Models: `PurchaseOrder`, `POLineItem`, `InventoryBox`, `BoxItem`. Enums: `POStatus`, `POMode`, `POLineStatus`, `BoxItemStatus`. NEEDS: stage qty fields + `StageMovement` model |

---

## API ROUTES (8 files)

| File | Description |
|------|-------------|
| `apps/web/src/app/api/purchase-orders/route.ts` | POST create PO; GET list POs |
| `apps/web/src/app/api/purchase-orders/[id]/route.ts` | GET detail; PATCH update metadata |
| `apps/web/src/app/api/purchase-orders/[id]/lines/route.ts` | POST add line item |
| `apps/web/src/app/api/purchase-orders/[id]/lines/[lineId]/route.ts` | PATCH update line |
| `apps/web/src/app/api/purchase-orders/[id]/lines/[lineId]/receive/route.ts` | PATCH record received qty |
| `apps/web/src/app/api/purchase-orders/needs-po/route.ts` | GET locked revisions with no PO — **DELETE (Needs PO removed)** |
| `apps/web/src/app/api/purchase-orders/from-revision/[revisionId]/route.ts` | POST create PO from quotation revision |
| `apps/web/src/app/api/purchase-orders/search/route.ts` | GET cross-PO SKU search |

**NEW routes to add:**
- `PATCH /api/purchase-orders/lines/[id]/move-stage` — validate + execute partial qty stage move
- `GET  /api/purchase-orders/by-stage` — products at a specific stage (stat card drill-down)
- `GET  /api/customers/[id]/by-stage` — customer-scoped stage filter

---

## PAGE ROUTES (4 files)

| File | Description |
|------|-------------|
| `apps/web/src/app/(dashboard)/purchases/page.tsx` | Entry point → `<PurchaseTrackerView />` |
| `apps/web/src/app/(dashboard)/purchases/layout.tsx` | Layout wrapper → `<PurchasesNav />` |
| `apps/web/src/app/(dashboard)/purchases/new/page.tsx` | New PO form → `<PurchaseGrid />` |
| `apps/web/src/app/(dashboard)/purchases/boxes/page.tsx` | Box tracker → `<InBoxTracker />` |

---

## ZUSTAND STORES (3 files)

| File | Description |
|------|-------------|
| `apps/web/src/lib/usePurchasesStore.ts` | UI filter state: viewMode, activeBrand, activeStatuses, selectedLineId, activeCustomerId, expandedLineId, searchQuery, openKPICard |
| `apps/web/src/lib/procurement-store.ts` | Data mutations: orders, boxes, line items (Zustand + Immer) |
| `apps/web/src/lib/purchases-store.ts` | **LEGACY** — old model, superseded |

---

## MOCK DATA (2 files)

| File | Description |
|------|-------------|
| `apps/web/src/lib/mock/procurement-data.ts` | **CURRENT** model: `MockPurchaseOrder`, `MockPOLineItem`, `MockInventoryBox`, `BRAND_COLORS`, `BRAND_DOMAINS`, `MOCK_PURCHASE_ORDERS`, `MOCK_INVENTORY_BOXES`, `MOCK_NEEDS_PO` — NEEDS stage qty fields added |
| `apps/web/src/lib/mock/purchases-data.ts` | **LEGACY** — brand-grouped funnel model, not used by new tracker |

---

## UTILITY LIBRARIES (4 files)

| File | Description |
|------|-------------|
| `apps/web/src/lib/tracker-utils.ts` | KPI & filtering: `getFilteredLines()`, `computeKPIs()`, `getLineAggregates()`, `getVendorCompanies()`, `getLinesForKPIDrillDown()`, `getLinesForCustomer()` — NEEDS rewrite for new 7-stage pipeline |
| `apps/web/src/lib/quotationToPO.ts` | `buildPOFromRevision()` — quotation → PO conversion |
| `apps/web/src/lib/poNumberGenerator.ts` | Sequential PO number generation |
| `apps/web/src/lib/poReceiver.ts` | PO receipt/inbound logic |

---

## TRACKER CORE COMPONENTS (5 files)

| File | Lines | Description |
|------|-------|-------------|
| `apps/web/src/components/procurement/PurchaseTrackerView.tsx` | ~37 | **Root**: BrandTabBar + KPI strip + drill-down panel + view selector |
| `apps/web/src/components/procurement/TrackerBrandTabBar.tsx` | 85 | Brand logo tabs (ALL, GROHE, HANSGROHE, AXOR, VITRA, GEBERIT, KAJARIA) — **KAJARIA TO REMOVE; AXOR MERGE INTO HANSGROHE** |
| `apps/web/src/components/procurement/TrackerKPIStrip.tsx` | 112 | 6 KPI stat cards — **REDESIGN to 7 cards, new pipeline, new colors** |
| `apps/web/src/components/procurement/StatDrillDownPanel.tsx` | 367 | Drill-down panel — **REDESIGN with new columns + Excel export** |
| `apps/web/src/components/procurement/TrackerSidebar.tsx` | 191 | Left sidebar (view toggle, status pills, vendor filter) |

---

## COMPANY VIEW COMPONENTS (6 files)

| File | Lines | Description |
|------|-------|-------------|
| `apps/web/src/components/procurement/CompanyView/CompanyView.tsx` | 131 | Layout host |
| `apps/web/src/components/procurement/CompanyView/CodeTable.tsx` | 82 | SKU rows table |
| `apps/web/src/components/procurement/CompanyView/CodeTableRow.tsx` | 182 | Single SKU row with customer boxes |
| `apps/web/src/components/procurement/CompanyView/SkuDetailPanel.tsx` | 230 | Detail panel for selected SKU |
| `apps/web/src/components/procurement/CompanyView/CustomerBoxCard.tsx` | 251 | Customer allocation card |
| `apps/web/src/components/procurement/CompanyView/CustomerBoxGrid.tsx` | 54 | Grid of customer cards |

---

## CUSTOMER VIEW COMPONENTS (5 files)

| File | Lines | Description |
|------|-------|-------------|
| `apps/web/src/components/procurement/CustomerView/CustomerView.tsx` | 13 | Layout host |
| `apps/web/src/components/procurement/CustomerView/CustomerListPanel.tsx` | 161 | Searchable customer list |
| `apps/web/src/components/procurement/CustomerView/CustomerDetailPanel.tsx` | 340 | **MAJOR REWORK**: new 7 stat boxes, stage filter, per-row Excel, partial move modal |
| `apps/web/src/components/procurement/CustomerView/OrderRow.tsx` | 252 | Order row — **REWORK**: per-stage qty split + pipeline dots + Move qty → |
| `apps/web/src/components/procurement/CustomerView/StatusFunnel.tsx` | 87 | Funnel viz |

---

## SHARED PROCUREMENT COMPONENTS (12 files)

| File | Lines | Description |
|------|-------|-------------|
| `apps/web/src/components/procurement/PurchasesNav.tsx` | 62 | Top nav tabs (Tracker, Box Tracker, New PO) |
| `apps/web/src/components/procurement/PurchasesView.tsx` | 68 | Legacy layout coordinator |
| `apps/web/src/components/procurement/BrandLogo.tsx` | 117 | SVG/clearbit/placeholder logos — **KEEP, used for per-product brand display** |
| `apps/web/src/components/procurement/NeedsPOSection.tsx` | 177 | **DELETE** — "Needs PO" removed entirely |
| `apps/web/src/components/procurement/SKUSearchResults.tsx` | 268 | Debounced cross-PO search |
| `apps/web/src/components/procurement/EditableCell.tsx` | 261 | Inline edit primitive |
| `apps/web/src/components/procurement/BoxStatusCell.tsx` | 259 | Progress bar + dispatch tracker |
| `apps/web/src/components/procurement/CompanyFilterPanel.tsx` | 307 | Vendor company multi-select |
| `apps/web/src/components/procurement/POListColumn.tsx` | 439 | Column B: company/customer list + NEEDS PO — **NEEDS PO SECTION TO REMOVE** |
| `apps/web/src/components/procurement/POCodePanel.tsx` | 396 | Column C: header + code table |
| `apps/web/src/components/procurement/POCodeTable.tsx` | 554 | SKU-first table with expandable rows |
| `apps/web/src/components/procurement/POLineItemsTable.tsx` | 539 | Legacy line items table |

---

## LEGACY / SUPPORTING COMPONENTS (7 files)

| File | Lines | Description |
|------|-------|-------------|
| `apps/web/src/components/procurement/POListClient.tsx` | 429 | **DEAD** — old UI, superseded |
| `apps/web/src/components/procurement/PODraftSidebar.tsx` | 354 | Draft PO creation sidebar |
| `apps/web/src/components/procurement/PurchaseGrid.tsx` | 421 | New PO grid/form |
| `apps/web/src/components/procurement/ProductPurchaseCard.tsx` | 259 | Product card for PO creation |
| `apps/web/src/components/procurement/InBoxTracker.tsx` | 384 | Box tracker UI |
| `apps/web/src/components/purchases/purchases-client.tsx` | — | **DEAD CODE** — not imported anywhere |

---

## NEW FILES TO CREATE

| File | Purpose |
|------|---------|
| `apps/web/src/lib/excelExporter.ts` | Client-side Excel export with exceljs |
| `apps/web/src/components/procurement/PartialMoveModal.tsx` | Qty selector + legal stages only |

---

## DOCUMENTATION

| File | Description |
|------|-------------|
| `docs/superpowers/specs/2026-03-28-purchases-tracker-design.md` | Prior design spec |
| `tasks/purchases-redesign.md` | Prior file audit & execution checklist |
| `apps/web/tasks/purchases-v2.md` | Prior implementation plan |
| `.superpowers/brainstorm/14754-1774699378/content/purchases-mockup-v1.html` | HTML mockup v1 |
| `.superpowers/brainstorm/14754-1774699378/content/purchases-light-v2.html` | HTML mockup v2 (light) |

---

## NAVIGATION

| File | Description |
|------|-------------|
| `apps/web/src/lib/navigation.ts` | `/purchases` under "Inventory" section with ShoppingBag icon |

---

## EXECUTION CHECKLIST (12 Steps)

- [ ] 1. **File audit** ← YOU ARE HERE (confirmed by user)
- [ ] 2. Schema migration — stage qty fields + `StageMovement` model
- [ ] 3. Remove Kajaria everywhere; merge Axor under Hansgrohe tab
- [ ] 4. Remove "Needs PO" from all surfaces (`NeedsPOSection.tsx`, `needs-po/route.ts`, `POListColumn.tsx`, `TrackerKPIStrip.tsx`)
- [ ] 5. Update API routes — `move-stage` with validation + `by-stage` queries ← **STOP BEFORE UI**
- [ ] 6. `lib/excelExporter.ts`
- [ ] 7. `<PartialMoveModal>` — qty selector + legal stages
- [ ] 8. Stat cards redesign + drill-down panels ← **STOP AFTER (show before customer panel)**
- [ ] 9. Product rows — per-stage qty split + pipeline dots
- [ ] 10. Customer panel — new 7 stat boxes + stage filter + Excel per tab
- [ ] 11. Reactive cascade — every mutation recomputes all counts
- [ ] 12. UI pass — new color system, typography, spacing

---

## BRAND GROUPS (Post-Step-3)

```typescript
const BRAND_GROUPS = {
  'HANSGROHE': ['HANSGROHE', 'AXOR'],
  'GROHE':     ['GROHE'],
  'VITRA':     ['VITRA'],
  'GEBERIT':   ['GEBERIT'],
}
// Tabs: ALL | GROHE | HANSGROHE+AXOR | VITRA | GEBERIT
// KAJARIA: removed entirely
```

## NEW 7-STAGE PIPELINE

```
TOTAL ORDERED → PENDING FROM CO. → PENDING FROM DIST. → AT GODOWN → IN BOX → DISPATCHED → NOT DISPLAYED
```

| Status | Color |
|--------|-------|
| Pending Co. | #F5A623 (amber) |
| Pending Dist. | #E8762C (orange) |
| At Godown | #4A90D9 (blue) |
| In Box | #7B68EE (purple) |
| Dispatched | #27AE60 (green) |
| Not Displayed | #95A5A6 (grey) |

## LEGAL TRANSITIONS (enforced in move-stage API + PartialMoveModal)

```
Total Ordered    → Pending Co. OR Pending Dist.
Pending Co.      → Pending Dist. OR At Godown
Pending Dist.    → At Godown only
At Godown        → In Box only
In Box           → Dispatched only
Dispatched       → Not Displayed only
Not Displayed    → terminal (no movement)
```
