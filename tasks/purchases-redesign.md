# Purchases Redesign — Complete File Audit
# Generated: 2026-03-28  Phase: Pre-Work

---

## ⚠️  Two Data Models Exist — Important Distinction

There are two separate purchase-order implementations in the codebase:

| | OLD model | NEW model |
|---|---|---|
| Data file | `lib/mock/purchases-data.ts` (473 lines) | `lib/mock/procurement-data.ts` (237 lines) |
| Store | `lib/purchases-store.ts` | `lib/procurement-store.ts` |
| Component | `components/purchases/purchases-client.tsx` | `components/procurement/POListClient.tsx` |
| Data shape | Brand-grouped funnel, complex | PO + line items, cleaner |

`/purchases/page.tsx` currently renders `<POListClient />` which uses the **NEW model**.
The old `purchases-client.tsx` appears to be dead code — it is NOT imported by the current page.

All redesign work builds on the **NEW model** (procurement-data / procurement-store).

---

## Files to REWRITE (scope of this redesign)

```
apps/web/src/app/(dashboard)/purchases/page.tsx
  → Full rewrite — 3-column layout host

apps/web/src/components/procurement/POListClient.tsx
  → Replaced entirely by the 3-column component set
```

---

## Files to CREATE (new)

### Brand logo assets
```
public/brands/grohe.svg
public/brands/hansgrohe.svg
public/brands/vitra.svg
public/brands/geberit.svg
public/brands/kohler.svg
public/brands/brand-placeholder.svg
```

### UI Components (procurement/)
```
components/procurement/BrandLogo.tsx          ← logo image + clearbit fallback + placeholder
components/procurement/CompanyFilterPanel.tsx ← Column A: view toggle + brand tiles + status pills
components/procurement/POListColumn.tsx       ← Column B: company/customer view + NEEDS PO section
components/procurement/POCodePanel.tsx        ← Column C: header + code table + footer totals
components/procurement/POCodeTable.tsx        ← the SKU-first table (evolves POLineItemsTable)
components/procurement/BoxStatusCell.tsx      ← progress bar + per-unit dispatch
components/procurement/NeedsPOSection.tsx     ← locked revisions without PO alert section
components/procurement/SKUSearchResults.tsx   ← aggregated cross-PO search result card
```

### State
```
lib/usePurchasesStore.ts   ← new Zustand store (viewMode, activeBrand, activeStatus, selectedPOId,
                              search, optimistic mutations). Absorbs what procurement-store.ts
                              already provides + adds the new filter state.
```
> NOTE: procurement-store.ts (already extended in phases 1–2) stays as the line-item
> mutation layer. usePurchasesStore handles UI filter state on top of it.

### API routes
```
app/api/purchase-orders/needs-po/route.ts
  GET → locked QuotationRevisions with no linked PurchaseOrder

app/api/purchase-orders/from-revision/[revisionId]/route.ts
  POST → calls buildPOFromRevision() from lib/quotationToPO.ts
```

---

## Files ALREADY BUILT (phases 1–2, keep as-is)

```
components/procurement/EditableCell.tsx        ✅  generic inline-edit primitive
components/procurement/POLineItemsTable.tsx    ✅  used by POListClient; may be adapted into POCodeTable
lib/procurement-store.ts                       ✅  updateLineItem, updatePOField, addLineItem added
app/api/purchase-orders/search/route.ts        ✅  GET ?sku= with aggregated totals
```

---

## Files to KEEP UNCHANGED (out of scope)

### App routes
```
app/(dashboard)/purchases/layout.tsx           ← PurchasesNav wrapper, leave alone
app/(dashboard)/purchases/new/page.tsx         ← new PO form, leave alone
app/(dashboard)/purchases/boxes/page.tsx       ← box tracker, leave alone
```

### Existing API routes (all already wired correctly)
```
app/api/purchase-orders/route.ts               ← list + create
app/api/purchase-orders/[id]/route.ts          ← GET + PATCH
app/api/purchase-orders/[id]/lines/route.ts    ← list + add lines
app/api/purchase-orders/[id]/lines/[lineId]/receive/route.ts   ← PATCH receive qty
app/api/inventory-boxes/route.ts               ← list + create boxes
app/api/inventory-boxes/[id]/route.ts          ← get box
app/api/inventory-boxes/[id]/items/[itemId]/dispatch/route.ts  ← PATCH dispatch item
```

### Lib files (keep, used by API routes)
```
lib/mock/procurement-data.ts                   ← MockPurchaseOrder, MockInventoryBox, BRAND_COLORS
lib/mock/purchases-data.ts                     ← OLD model (not used by new components, don't delete)
lib/procurement-store.ts                       ← already extended; line-item mutations live here
lib/purchases-store.ts                         ← OLD store (not used by new page, don't delete)
lib/quotationToPO.ts                           ← buildPOFromRevision() — called by new needs-po flow
lib/boxDispatcher.ts                           ← dispatchFromBox() — called by dispatch API
lib/poReceiver.ts                              ← receivePOLine() — called by receive API
lib/poNumberGenerator.ts                       ← generatePONumber() — called by create API
lib/stockIntelligence.ts                       ← refreshStockOnOrder()
```

### Other components (untouched)
```
components/procurement/PurchasesNav.tsx        ← top nav tabs
components/procurement/PODraftSidebar.tsx      ← draft PO drawer (used by POS)
components/procurement/InBoxTracker.tsx        ← box tracker UI
components/procurement/PurchaseGrid.tsx        ← grid view (if still used)
components/procurement/ProductPurchaseCard.tsx ← product card
components/pos/pos-header.tsx                  ← references procurement (don't touch)
components/pos/quotation-preview.tsx           ← references procurement (don't touch)
components/purchases/purchases-client.tsx      ← OLD component, dead code, leave alone
```

---

## Execution Checklist

- [ ] 1. ✅ File audit complete — confirm with user
- [ ] 2. `public/brands/` — fetch/create all brand SVG logos
- [ ] 3. `BrandLogo.tsx` — logo + clearbit + placeholder fallback chain
- [ ] 4. `lib/usePurchasesStore.ts` — filter state + view mode store
- [ ] 5. `app/api/purchase-orders/needs-po/route.ts`
- [ ] 6. `app/api/purchase-orders/from-revision/[revisionId]/route.ts`
- [ ] 7. `BoxStatusCell.tsx` — progress bar + per-unit dispatch tracker
- [ ] 8. `POCodeTable.tsx` — full SKU table (replaces POLineItemsTable in this context)
- [ ] 9. `POCodePanel.tsx` — Column C: header + table + footer
         ← STOP HERE, show POCodePanel before building filter columns
- [ ] 10. `NeedsPOSection.tsx`
- [ ] 11. `SKUSearchResults.tsx`
- [ ] 12. `CompanyFilterPanel.tsx` — Column A
- [ ] 13. `POListColumn.tsx` — Column B
- [ ] 14. `page.tsx` — wire all 3 columns
- [ ] 15. Verify: brand filter, customer view, SKU search, receive, dispatch, inline edit
