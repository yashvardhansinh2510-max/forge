# Quotation PDF — Design Spec
**Date:** 2026-04-18  
**Status:** Approved

## Goal

When a user clicks **Print / Save PDF** inside the Quotation Builder slide-over, the browser opens a new tab that exactly replicates the Buildcon House quotation format (reference: `CHIRAGBHAI LAKHANI GROHE 24-03-2026.pdf`). Only the customer data and line-item numbers change — all branding, notes, contact info, and toll-free numbers are hardcoded.

---

## 1. Data Model Additions

All fields are optional — no breaking changes to existing data.

### `LineItem` (in `apps/web/src/lib/mock/sales-data.ts`)
```ts
section?: string    // e.g. "BATHROOM 1,2" — groups rows onto one detail page
imageUrl?: string   // product thumbnail URL — user pastes when adding item
```

### `Quotation` (same file)
```ts
customerPhone?: string  // maps to the NUM field on the cover page
```

---

## 2. Builder UI Changes (`quotation-builder.tsx`)

### Left panel
- New input **Customer Phone** directly below the existing "Customer *" input
- Maps to `customerPhone` on the quotation
- Placeholder: `e.g. 98989 58897`

### Line-item table (right panel)
Two new columns added after the existing "Disc%" column:

| Section | Image URL |
|---------|-----------|
| Text input — e.g. `BATHROOM 1,2` | Text input — paste a product image URL |

- Items sharing the same `section` string (case-sensitive) appear on the same detail page
- Items with no section go into a section named `GENERAL`

### Header bar
New button added between "Save Draft" and the status-dependent action button:

```
[Printer icon]  Print / Save PDF
```

**On click:**
1. Call `handleSave()` — persists current in-memory state
2. Call `generateQuotationPrintHTML({ quotation, lineItems, customerName, customerPhone, createdBy })`
3. `window.open()` → `document.write(html)` → `document.close()` → `window.print()`

---

## 3. Print Engine

### File
`apps/web/src/lib/quotation-print.ts`

### Signature
```ts
export function generateQuotationPrintHTML(data: {
  number: string
  customerName: string
  customerPhone?: string
  createdBy: string
  createdAt: Date
  lineItems: LineItem[]
}): string
```

### Logic
1. Group `lineItems` by `item.section` → ordered `[sectionName, items[]][]`
2. Compute per section:
   - `mrpTotal` = Σ (`unitPrice × qty`)
   - `offerTotal` = Σ (`unitPrice × (1 - discount/100) × qty`)
3. Compute document totals: `grandMrpTotal`, `grandOfferTotal` (= SPECIAL OFFER RATE)
4. Return a complete `<!DOCTYPE html>` string with:
   - All CSS inline in a `<style>` block
   - `@page { size: A4; margin: 15mm }`
   - `window.onload = () => window.print()` auto-fires the print dialog

### Brand logo URLs
Constructed as `${window.location.origin}/brands/<name>.svg` — works across environments.  
Available SVGs: `grohe`, `hansgrohe`, `axor`, `vitra`, `geberit`.  
Missing brands (Oyster, QUTONE, Nexion, DIMORE, ittimi) rendered as bold text.

---

## 4. Print Layout

### Page 1 — Cover / Summary

```
BUILDCON HOUSE · Let you live better          (centered, text logo)
[GROHE svg] [hansgrohe svg] [AXOR svg] [GEBERIT svg] [VitrA svg]
[Oyster] [QUTONE] [Nexion] [DIMORE] [ittimi]   (text for missing SVGs)

SUB: Quotation
Dear sir thanks you for positive approach to our products…

NAME :  <customerName>
DATE :  <dd-MM-yyyy>
NUM :   <customerPhone>
REF :   <createdBy>

[GROHE — gold background row spanning full width]

SL.NO. | BATHROOM/section name | MRP
  1    | BATHROOM 1,2          | ₹ 6,22,400.00
  2    | BATHROOM 3,4          | ₹ 1,57,400.00
  3    | KITCHEN               | ₹    77,840.00
       | TOTAL                 | ₹ 8,57,640.00     ← gold bg
       | SPECIAL OFFER RATE    | ₹ 4,28,820.00     ← gold bg, large bold

NOTE
1. All rate for Grohe are as per current MRP.
2. Company - Grohe and other Company, can revise MRP without notice.
3. Please confirm order with 100% advance for CP items.
4. Quote remains valid till company MRP remains unchanged. Force majure, w.r.t TAX, MRP,
5. For items with escalated MRP, confirm order with 100% payments, prior to cut off time line.
6. Delivery as per company schedule. Freight extra as per actual.
7. RATE VALID FOR THIS MONTH

Regards,
Buildcon House
MO : +91 9909906652
MAIL : buildconhouse10@gmail.com

TOLL FREE NUMBER
GEBERIT    18001024323
GROHE      18001024475
HANSGROHE  18002093246
VITRA      70451 32132
OYSTER     18001208999
```

### Pages 2+ — Section Detail (one per section, `page-break-before: always`)

```
[Section name — gold background]

Sr. | Article | Product        | Product | MRP    | QTY | MRP     | OFFER  | TOTAL
No. | No.     | Description    | Image   |        |     | TOTAL   | RATE   |
----+---------+----------------+---------+--------+-----+---------+--------+--------
 1  | 26559000| 310 Head shower| [img]   | 47,700 |  2  | 95,400  | 23,850 | 47,700
...
    |         | TOTAL          |         |        | 26  |6,22,400 |1,55,600|3,11,200  ← gold bg
```

**Column calculations:**
- `MRP` = `item.unitPrice` (per unit MRP)
- `OFFER RATE` = `item.unitPrice × (1 - item.discount / 100)` (discounted per-unit price)
- `MRP TOTAL` = `item.unitPrice × item.qty`
- `TOTAL` = `OFFER RATE × item.qty`

**Color scheme:**
- Section header rows, TOTAL rows, SPECIAL OFFER RATE row: background `#F2C50A`, black bold text
- Column headers (Sr. No., Article No., etc.): background `#F2C50A`
- Data rows: white background, thin black borders

---

## 5. Files Changed / Created

| File | Change |
|------|--------|
| `apps/web/src/lib/mock/sales-data.ts` | Add `section?`, `imageUrl?` to `LineItem`; add `customerPhone?` to `Quotation` |
| `apps/web/src/components/sales/quotations/quotation-builder.tsx` | Add `customerPhone` input, `section` + `imageUrl` columns per line item, "Print / Save PDF" button |
| `apps/web/src/lib/quotation-print.ts` | **New file** — `generateQuotationPrintHTML()` function |

No new npm packages required.

---

## 6. Out of Scope

- Product images fetched automatically from a product catalog (user pastes URL manually)
- Multi-brand summary pages (only GROHE brand header on cover — user can extend later)
- Server-side PDF generation / email delivery
