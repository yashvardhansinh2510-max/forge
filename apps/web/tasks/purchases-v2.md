# Purchases Page V2 — File Audit
# Generated: 2026-03-28

---

## STATUS LEGEND
# ✅ EXISTS & USABLE  — already built, can be kept or adapted
# 🔧 EXISTS, NEEDS REWRITE  — file exists but design needs replacement
# ❌ DOES NOT EXIST  — new file required by PRD
# 🗑️ DEAD CODE  — legacy, will be deleted or ignored

---

## ZONE A — Mock Data & Stores

| File | Status | Notes |
|---|---|---|
| `lib/mock/procurement-data.ts` | ✅ | Has MockPurchaseOrder, MockInventoryBox, BRAND_COLORS, BRAND_DOMAINS, MOCK_NEEDS_PO |
| `lib/mock/purchases-data.ts` | 🗑️ | Legacy data model, superseded by procurement-data |
| `lib/procurement-store.ts` | ✅ | Zustand+Immer: orders, boxes, updatePOField, updateLineItem, dispatchBoxItem |
| `lib/usePurchasesStore.ts` | ✅ | UI state: viewMode, activeBrand, activeStatus, selectedPOId, searchQuery, skuSearchActive, highlightLineId |
| `lib/purchases-store.ts` | 🗑️ | Legacy Zustand store, superseded |
| `lib/quotationToPO.ts` | ✅ | buildPOFromRevision() — used by from-revision API |
| `lib/poReceiver.ts` | ✅ | PO receipt logic |
| `lib/poNumberGenerator.ts` | ✅ | PO number generation |
| `lib/stockIntelligence.ts` | ✅ | Stock intelligence helpers |

---

## ZONE B — API Routes

| File | Status | Notes |
|---|---|---|
| `app/api/purchase-orders/route.ts` | ✅ | GET (list) + POST (create). Extend GET with ?brand filter |
| `app/api/purchase-orders/[id]/route.ts` | ✅ | GET detail + PATCH metadata |
| `app/api/purchase-orders/[id]/lines/route.ts` | ✅ | POST add line item |
| `app/api/purchase-orders/[id]/lines/[lineId]/route.ts` | ✅ | PATCH update line (check if exists) |
| `app/api/purchase-orders/[id]/lines/[lineId]/receive/route.ts` | ✅ | PATCH receive qty |
| `app/api/purchase-orders/needs-po/route.ts` | ✅ | Returns MOCK_NEEDS_PO |
| `app/api/purchase-orders/search/route.ts` | ✅ | GET ?sku= aggregated cross-PO search |
| `app/api/purchase-orders/from-revision/[revisionId]/route.ts` | ✅ | POST builds draft PO |
| `app/api/inventory-boxes/items/[itemId]/dispatch/route.ts` | ❌ | NEW — per-unit dispatch with recipientName, role, customNote |

---

## ZONE C — Procurement Components (current)

| File | Status | Notes |
|---|---|---|
| `components/procurement/BrandLogo.tsx` | ✅ | 3-level fallback (SVG→clearbit→placeholder). Needs size 'xs' (20px) added |
| `components/procurement/EditableCell.tsx` | ✅ | text/number/select types. Needs date + textarea + sku-search types |
| `components/procurement/NeedsPOSection.tsx` | ✅ | Collapsible amber alert. Needs pulsing red + "always visible regardless of brand filter" |
| `components/procurement/SKUSearchResults.tsx` | ✅ | Debounced SKU search overlay |
| `components/procurement/BoxStatusCell.tsx` | 🔧 | Aggregate view only. Replace with full BoxTracker |
| `components/procurement/POCodeTable.tsx` | 🔧 | Good foundation. Replace with new SKUTable with BoxTracker expand |
| `components/procurement/POCodePanel.tsx` | 🔧 | Replace with new RightPanel structure |
| `components/procurement/CompanyFilterPanel.tsx` | 🔧 | 160px — replace with new LeftPanel (280px) |
| `components/procurement/POListColumn.tsx` | 🔧 | 340px — replace with new CenterPanel (400px) |
| `components/procurement/PurchasesView.tsx` | 🔧 | Layout coordinator — rewire for new 3-panel with BrandTabBar |
| `components/procurement/InBoxTracker.tsx` | 🗑️ | Old tracker, superseded by new BoxTracker |
| `components/procurement/POListClient.tsx` | 🗑️ | Old list UI, superseded |
| `components/procurement/POLineItemsTable.tsx` | 🗑️ | Old table, superseded by SKUTable |
| `components/procurement/PODraftSidebar.tsx` | ✅ | Keep — draft creation flow unchanged |
| `components/procurement/ProductPurchaseCard.tsx` | ✅ | Keep |
| `components/procurement/PurchaseGrid.tsx` | ✅ | Keep |
| `components/procurement/PurchasesNav.tsx` | ✅ | Keep — nav bar |

---

## ZONE D — New Components Required

| File | Status | Notes |
|---|---|---|
| `components/procurement/BrandTabBar.tsx` | ❌ | NEW — full-width 6-tab bar, logos only, count badges, brand-color border |
| `components/procurement/LeftPanel.tsx` | ❌ | NEW — 280px fixed, view toggle + pills + company/customer content |
| `components/procurement/StatusFilterPills.tsx` | ❌ | NEW — icon+count only, multi-select, ⚠️ pulsing when count > 0 |
| `components/procurement/CustomerList.tsx` | ❌ | NEW — searchable client list with pending/delivery/brand logos |
| `components/procurement/CenterPanel.tsx` | ❌ | NEW — 400px fixed, NeedsPOSection + POCard list |
| `components/procurement/POCard.tsx` | ❌ | NEW — compact card: 3 product thumbs, brand logo xs, status dot, value |
| `components/procurement/RightPanel/index.tsx` | ❌ | NEW — compose POHeader + SKUTable + BoxTracker |
| `components/procurement/RightPanel/POHeader.tsx` | ❌ | NEW — all editable: vendor, delivery, status, notes, margin |
| `components/procurement/RightPanel/SKUTable.tsx` | ❌ | NEW — SKU-primary, with ±qty, receive flow, in-box expand |
| `components/procurement/RightPanel/SKUTableRow.tsx` | ❌ | NEW — single row with expand state |
| `components/procurement/RightPanel/BoxTracker.tsx` | ❌ | NEW — per-unit dispatch history, progress bar |
| `components/procurement/RightPanel/DispatchForm.tsx` | ❌ | NEW — custom recipient, role, immutable note, date |

---

## ZONE E — Pages

| File | Status | Notes |
|---|---|---|
| `app/(dashboard)/purchases/page.tsx` | 🔧 | Full rewrite — wire BrandTabBar + 3 panels |
| `app/(dashboard)/purchases/layout.tsx` | ✅ | Keep PurchasesNav |
| `app/(dashboard)/purchases/boxes/page.tsx` | ✅ | Keep |
| `app/(dashboard)/purchases/new/page.tsx` | ✅ | Keep |

---

## ZONE F — Brand SVGs (public/brands/)

| File | Status | Notes |
|---|---|---|
| `public/brands/grohe.svg` | ✅ | Geometric G lettermark |
| `public/brands/hansgrohe.svg` | ✅ | H letterform |
| `public/brands/axor.svg` | ✅ | A letterform |
| `public/brands/vitra.svg` | ✅ | V letterform |
| `public/brands/geberit.svg` | ✅ | Rounded G |
| `public/brands/kajaria.svg` | ✅ | K letterform |
| `public/brands/brand-placeholder.svg` | ✅ | Gray 4-tile grid |
| `public/brands/all.svg` | ❌ | NEW — 6 mini logos in 2×3 grid |

---

## ZONE G — Old Purchases Components (to ignore)

| File | Status | Notes |
|---|---|---|
| `components/purchases/purchases-client.tsx` | 🗑️ | Legacy — do not touch |

---

## EXECUTION PLAN (STOP POINTS)

### STOP 1 — After this audit (waiting for "confirmed")

### Phase 1: Infrastructure
- [ ] 1. File audit → confirmed ← YOU ARE HERE
- [ ] 2. Extend mock data: add MOCK_CUSTOMERS with pending/delivery fields to procurement-data.ts
- [ ] 3. `public/brands/all.svg` — 2×3 mini-logo grid
- [ ] 4. Extend `BrandLogo.tsx` — add 'xs' (20px) size
- [ ] 5. Extend `usePurchasesStore.ts` — add expandedBoxItemId, activeCustomerId, multi-status select
- [ ] 6. `app/api/inventory-boxes/items/[itemId]/dispatch/route.ts` — new dispatch API

### STOP 2 — After step 6 (show all API routes)

### Phase 2: Layout Shell
- [ ] 7. `BrandTabBar.tsx` — 6 logo tabs, wired to store
- [ ] 8. `StatusFilterPills.tsx` — icon+count, multi-select, pulsing ⚠️
- [ ] 9. `POCard.tsx` — thumbnail strip, brand logo xs, status dot
- [ ] 10. `CenterPanel.tsx` — NeedsPOSection + POCard list
- [ ] 11. `CustomerList.tsx` — searchable, pending + delivery columns, company filter
- [ ] 12. `LeftPanel.tsx` — composes view toggle + pills + company/customer

### Phase 3: Right Panel
- [ ] 13. `RightPanel/POHeader.tsx` — all editable fields (vendor, delivery, status, notes, margin)
- [ ] 14. `RightPanel/BoxTracker.tsx` — per-unit rows, progress bar, dispatch history
- [ ] 15. `RightPanel/DispatchForm.tsx` — custom recipient, role selector, immutable note

### STOP 3 — After step 15 (show SKU table with BoxTracker)

- [ ] 16. `RightPanel/SKUTableRow.tsx` — expandable row with BoxTracker
- [ ] 17. `RightPanel/SKUTable.tsx` — full code table with ±qty, receive flow, add line
- [ ] 18. `RightPanel/index.tsx` — compose header + table + tracker
- [ ] 19. `page.tsx` + `PurchasesView.tsx` — wire all 3 zones

---

## KEY DESIGN DECISIONS

1. **Logos only** — no brand name text anywhere in the UI
2. **SKU is primary** — product names are secondary (shown smaller below SKU)
3. **280px left / 400px center / flex-1 right** — desktop-first, 1440px+ optimized
4. **BrandTabBar is top-level** — 72px full-width, above all 3 panels
5. **NeedsPOSection always visible** — regardless of brand filter
6. **BoxTracker is per-row expand** — clicking "IN BOX" count opens tracker below that row
7. **Custom dispatch notes are immutable** — append-only audit log
8. **Customer view** — shows pending/delivery/company-wise filter
9. **Cross-panel reactivity** — marking received in RightPanel updates CenterPanel card count instantly
10. **Receipt to godown** — "Mark Received" flow updates stock at Main Godown (Bhiwandi)
