# Purchase Orders Page — Full Redesign Checklist

## Status: AWAITING APPROVAL — paused after Step 1 (file discovery)

---

## Step 1 ✅ — File Discovery (complete — check in with user before continuing)

Affected files mapped below. No code written yet.

---

## Step 2 — Add `GET /api/purchase-orders/search?sku=` endpoint
- [ ] Create `apps/web/src/app/api/purchase-orders/search/route.ts`
- [ ] Scan all MockPOLineItems for `productSku` matching query
- [ ] Return grouped results: per-PO rows + aggregate totals
- [ ] Wire into procurement-store (or standalone fetch hook)

## Step 3 — Rewrite POLineItemsTable (pause after — show user before wiring data)
- [ ] Create `apps/web/src/components/procurement/POLineItemsTable.tsx`
- [ ] Image column: 48×48 thumbnail → brand logo fallback → SKU initials fallback
- [ ] SKU code as primary label (not product name)
- [ ] Quantity breakdown table per row: Ordered | Received | Pending | Status
- [ ] Replace current plain line-item list in `POListClient.tsx` PODetail section

## Step 4 — `<EditableCell />` generic inline-edit component
- [ ] Create `apps/web/src/components/procurement/EditableCell.tsx`
- [ ] Variants: text input, number input, select/dropdown, date picker, textarea
- [ ] Optimistic update → Zustand → PATCH on blur/Enter → revert + toast on error
- [ ] No Save button — auto-save every field

## Step 5 — Apply EditableCell to all PO detail fields
- [ ] PO status (dropdown)
- [ ] Vendor name (text)
- [ ] Expected delivery date (date picker)
- [ ] Notes (textarea)
- [ ] Each line item: SKU, qty ordered, qty received, landing cost, line status
- [ ] Project linkage (searchable dropdown)

## Step 6 — Rebuild left panel with brand-grouped sections
- [ ] Group POs by vendorName with collapsible `▼ BRAND` section headers
- [ ] Brand color accent on section header (from BRAND_COLORS map)
- [ ] Auto-collapse `FULLY_RECEIVED` sections; expand `DRAFT`/`SUBMITTED`/`PARTIALLY_RECEIVED`
- [ ] Replace status filter pills with two persistent sidebar sections:
  - PENDING ORDERS (Draft + Submitted + Partial)
  - PLACED ORDERS (Received + Cancelled)
- [ ] Each card: PO number, project name, date, line count, value, status badge

## Step 7 — SKU global search with aggregated results view
- [ ] Wire search input to SKU-first search (not just PO number / vendor)
- [ ] When query matches a SKU: show product header + per-PO quantity table + totals
- [ ] Clicking a result row → selects that PO + highlights that line item

## Step 8 — Product image fallback chain
- [ ] Priority 1: `productImage` field from mock data / DB
- [ ] Priority 2: brand SVG logo (from `/public/brands/` or inline SVG)
- [ ] Priority 3: styled placeholder showing first 2 chars of SKU
- [ ] Clicking image → modal with full product details + stock levels

## Step 9 — Verification
- [ ] Open a PO → edit every field → confirm Zustand updates optimistically
- [ ] Simulate PATCH failure → confirm field reverts + toast appears
- [ ] SKU search → confirm results group correctly with totals
- [ ] Brand-grouped view → collapse/expand sections

## Step 10 — Update this file with results

---

## Files Affected

| File | Action |
|------|--------|
| `apps/web/src/components/procurement/POListClient.tsx` | Rewrite left panel (brand grouping, sections) + right panel detail |
| `apps/web/src/components/procurement/POLineItemsTable.tsx` | **CREATE** — SKU-first table with images + qty breakdown |
| `apps/web/src/components/procurement/EditableCell.tsx` | **CREATE** — generic inline-edit component |
| `apps/web/src/app/api/purchase-orders/search/route.ts` | **CREATE** — SKU search endpoint |
| `apps/web/src/lib/mock/procurement-data.ts` | Possibly extend mock data with more SKU entries |
| `apps/web/src/lib/procurement-store.ts` | Add actions for line-item inline edits |

### Files NOT touched
- `apps/web/src/app/(dashboard)/purchases/page.tsx` — no change needed (just renders POListClient)
- `apps/web/src/app/(dashboard)/purchases/layout.tsx` — no change
- `apps/web/src/app/api/purchase-orders/route.ts` — no change
- `apps/web/src/app/api/purchase-orders/[id]/route.ts` — no change
- `apps/web/src/app/api/purchase-orders/[id]/lines/route.ts` — no change
- `apps/web/src/lib/mock/purchases-data.ts` — **legacy/unused**, not touched
- `apps/web/src/lib/purchases-store.ts` — **legacy/unused**, not touched
