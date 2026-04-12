# Quotation Builder — Full-Page Editor + PDF Generation

**Date:** 2026-04-13
**Status:** Approved — ready for implementation

---

## Overview

Two features built together:

1. **Full-page quotation builder** — replaces the existing 720px slide-over with a dedicated route that supports named rooms/sections, per-room item tables, and inline editing.
2. **PDF generation** — a server-side API route that renders an exact replica of the Buildcon House quotation PDF (as supplied) using `@react-pdf/renderer`.

Secondary capability: **load and edit saved quotations** — any saved quotation opens in the full-page builder; edits mutate the same revision (no version history).

---

## Routing

| Route | Purpose |
|---|---|
| `/sales/quotations` | Existing list — rows now navigate to `[revisionId]` instead of opening slide-over |
| `/sales/quotations/new` | Blank full-page builder |
| `/sales/quotations/[id]` | Full-page builder loaded with saved quotation (`id` = revisionId) |

**"New Quotation" flow:**
- User fills customer/project meta + adds rooms + items
- Clicks Save → `POST /api/quotations` creates record → redirects to `/sales/quotations/[revisionId]`

**"Load previous" flow:**
- Click any row in the list → navigate to `/sales/quotations/[revisionId]`
- Builder loads with all existing rooms + items
- Edits → `PATCH /api/quotations/[id]` (mutates same revision)

The existing `QuotationBuilder` slide-over component is no longer triggered from the list (can be removed in a follow-up cleanup).

---

## Data Model

**Schema changes required** — add missing fields to `packages/db/prisma/schema.prisma`:

```prisma
model Quotation {
  // existing fields unchanged…
  customerPhone  String?   // NUM field in PDF
  billingAddress String?   // billing address
  salesRep       String?   // REF field in PDF
  brandLabel     String?   // e.g. "GROHE" — shown as section header on summary page
}

model QuotationRevision {
  // existing fields unchanged…
  validUntil         DateTime?  // quote expiry date
  termsAndConditions String?    // editable notes + footer text (pre-filled with Buildcon House standard)
}
```

Run `prisma migrate dev` after adding fields.

Existing shape (unchanged):

```
Quotation
  └── QuotationRevision (id used as URL param)
        └── QuotationRoom[] (ordered, named)
              └── QuotationItem[] (ordered, per room)
```

### In-memory builder state

```ts
type BuilderRoom = {
  id: string        // 'new-{timestamp}' before save, DB uuid after
  name: string      // e.g. "BATHROOM 1,2"
  items: BuilderItem[]
}

type BuilderItem = {
  id: string
  productId: string
  sku: string           // Article No in PDF
  productName: string
  mrp: number           // from catalogue, auto-filled on product select, read-only
  qty: number           // default 1
  offerRate: number     // editable, defaults to mrp
}
```

Derived (never stored):
- `mrpTotal = mrp × qty` (per item)
- `itemTotal = offerRate × qty` (per item)
- Per-room: `roomMrpTotal`, `roomOfferTotal`
- Grand: `grandMrpTotal`, `grandOfferTotal`

---

## API Changes

### `GET /api/quotations/[id]` — extend
Currently returns minimal data. Extend to return:

```json
{
  "id": "rev-uuid",
  "quotationNumber": "Q-2026-0001",
  "status": "DRAFT",
  "customerName": "Chiragbhai Lakhani",
  "customerPhone": "9898958897",
  "billingAddress": "...",
  "siteAddress": "...",
  "projectName": "...",
  "notes": "...",
  "termsAndConditions": "...",
  "createdAt": "2026-03-24T00:00:00Z",
  "validUntil": "2026-04-24T00:00:00Z",
  "salesRep": "Prkashbhai Punjabi",
  "rooms": [
    {
      "id": "room-uuid",
      "name": "BATHROOM 1,2",
      "order": 0,
      "items": [
        {
          "id": "item-uuid",
          "sku": "26559000",
          "productName": "310 Head shower ROUND 1 spray ceiling-mounted",
          "mrp": 47700,
          "qty": 2,
          "offerRate": 23850,
          "order": 0
        }
      ]
    }
  ]
}
```

### `PATCH /api/quotations/[id]` — rewrite
Replace rooms strategy: delete all existing rooms for the revision, re-insert from payload. Simpler than diffing.

Payload:
```json
{
  "customerName": "...",
  "customerPhone": "...",
  "siteAddress": "...",
  "projectName": "...",
  "notes": "...",
  "termsAndConditions": "...",
  "salesRep": "...",
  "validUntil": "2026-04-24T00:00:00Z",
  "rooms": [
    {
      "name": "BATHROOM 1,2",
      "items": [
        { "sku": "26559000", "productName": "...", "mrp": 47700, "qty": 2, "offerRate": 23850 }
      ]
    }
  ]
}
```

### `GET /api/quotations/[id]/pdf` — new
- Fetches full quotation data from DB
- Renders PDF with `@react-pdf/renderer`
- Returns: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Q-2026-0001.pdf"`

---

## Builder UI — Full-Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Top Bar                                                          │
│  Q-2026-0001  [DRAFT badge]        [Save]  [Download PDF]  [Send]│
├────────────┬─────────────────────────────────────────────────────┤
│ Left       │ Main Area                                           │
│ Sidebar    │                                                     │
│ (280px)    │  ┌─ BATHROOM 1,2 ──────────────────────── [rename][✕]┐│
│            │  │ #  Article No  Description  MRP  Qty  OfferRate  Total  [↕][⇄][✕]││
│ Customer   │  │ 1  26559000    310 Head...  47,700  2  23,850   47,700   ...    ││
│ Phone      │  │ + Add item                          Room MRP: ₹X  Room Offer: ₹X││
│ Billing    │  └─────────────────────────────────────────────────────┘│
│ Site addr  │                                                     │
│ Project    │  ┌─ KITCHEN ──────────────────────────── [rename][✕]┐│
│ Quote date │  │  ...                                             ││
│ Valid until│  └─────────────────────────────────────────────────────┘│
│ Sales rep  │                                                     │
│ Notes      │  [+ Add Room]                                       │
│ Terms      │                                                     │
│            │  ┌─ Grand Total ──────────────────────────────────┐ │
│            │  │  MRP Total: ₹8,57,640    Offer Total: ₹4,28,820│ │
│            │  └────────────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────┘
```

### Left Sidebar Fields (all editable)
- Customer Name (text)
- Customer Phone (text)
- Billing Address (textarea)
- Site Address (textarea)
- Project Name (text)
- Quote Date (date picker — defaults to today)
- Valid Until (date picker — defaults to +30 days)
- Sales Rep / REF (text)
- Notes (textarea — pre-filled with standard Buildcon House notes)
- Terms & Conditions (textarea)

### Room Sections
- Room name: click to rename inline
- Rooms drag-reorderable (dnd-kit — already a project dep)
- Delete room: [✕] button — confirmation if room has items

### Item Row Columns
| Col | Behaviour |
|---|---|
| Sr.No | Auto-numbered per room, 1-based |
| Article No | Editable text (SKU) — typing triggers product search |
| Product Description | Product search dropdown (same pattern as existing `ProductSearchCell`) |
| MRP | Auto-filled from catalogue on product select — read-only |
| Qty | Inline number input — default 1 |
| Offer Rate | Inline number input — defaults to MRP on product select |
| Total | Computed: `offerRate × qty` — read-only |
| [⇄] | Replace icon — clears row, opens product search, resets qty=1 offer=MRP |
| [✕] | Delete item |
| [↕] | Drag handle for reorder within room |

### Item Replace Behaviour
Clicking [⇄]:
1. Clears `productId`, `sku`, `productName`, `mrp`, `offerRate`
2. Resets `qty = 1`
3. Opens product search inline (same UX as adding a new item)
4. On product select: fills all fields from catalogue, `offerRate = mrp`

### Grand Total Bar
Sticky at bottom of main area:
- `Grand MRP Total = Σ (mrp × qty)` across all rooms
- `Grand Offer Total = Σ (offerRate × qty)` across all rooms

---

## PDF Layout — Exact Match

Library: `@react-pdf/renderer` (server-side in API route)
Font: Helvetica (built-in to react-pdf, closest to the document's sans-serif)
Highlight colour: `#FFC000` (yellow, matching TOTAL/SPECIAL OFFER RATE rows)

### Page 1 — Cover + Summary

**Header block:**
- "BUILDCON HOUSE" in large bold text + "Let you live better" tagline
- Brand name row: GROHE · hansgrohe · AXOR · GEBERIT · VitrA · Oyster · QUTONE · Nexion · DIMORE · ittimi

**Info table (2-column):**
```
NAME :  | <customerName>
DATE :  | <quoteDate formatted dd-MM-yyyy>
NUM  :  | <customerPhone>
REF  :  | <salesRep>
```

**Brand section header:** value of `Quotation.brandLabel` (centred, bold). Editable in the left sidebar. Defaults to "GROHE" for new quotations. If blank, the section header is omitted.

**Summary table:**
```
SL.NO | BATHROOM (room name)        | MRP
------+-----------------------------+-----------
1     | BATHROOM 1,2                | ₹6,22,400
2     | BATHROOM 3,4                | ₹1,57,400
3     | KITCHEN                     | ₹77,840
------+-----------------------------+-----------
      | TOTAL                       | ₹8,57,640   ← yellow background
      | SPECIAL OFFER RATE          | ₹4,28,820   ← yellow background, bold
```

**Notes section:** Numbered list from `quotation.notes` field (not hardcoded — stored per quotation)

**Footer:**
- "Regards, Buildcon House" + phone + email (Buildcon House contact details stored in `termsAndConditions` field — editable per quotation)
- Toll-free numbers block: rendered from `termsAndConditions` field. When creating a new quotation the field is pre-populated with the standard Buildcon House text (including toll-free numbers). User can edit freely in the sidebar before saving/printing.

### Detail Pages — One per Room

**Room header:** e.g. "BATHROOM 1,2" (bold, yellow background)

**Item table:**
```
Sr.No | Article No | Product Description | Product Image | MRP | QTY | MRP TOTAL | OFFER RATE | TOTAL
------+------------+---------------------+---------------+-----+-----+-----------+------------+------
1     | 26559000   | 310 Head shower...  | [blank box]   |47,700| 2  |  95,400   |  23,850    | 47,700
...
------+------------+---------------------+---------------+-----+-----+-----------+------------+------
TOTAL |            |                     |               |     | 26  |6,22,400   | 1,55,600   |3,11,200  ← yellow
```

All financial figures: `fontVariantNumeric: 'tabular-nums'`, right-aligned.
Product Image column: fixed-width blank white box (placeholder for future images).

---

## Error States

| State | Handling |
|---|---|
| Navigating away with unsaved changes | Browser `beforeunload` + in-app confirmation dialog |
| Save fails (API error) | Sonner toast with error message — state not cleared |
| PDF generation fails | Toast error; PDF button shows spinner during generation |
| Product not found in catalogue (manual SKU entry) | MRP shows as 0; user must set offer rate manually |
| Empty quotation (no items) | Save allowed; PDF still generates with empty tables |

---

## Out of Scope (this iteration)

- Product images in PDF (placeholder only)
- Quotation revision history / versioning
- Email sending from the builder
- GST breakdown in PDF
- Multi-currency
- Removing the old slide-over `QuotationBuilder` component (follow-up cleanup)
