# Quotation PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Print / Save PDF" button to the Quotation Builder that generates a browser-print-ready HTML page exactly matching the Buildcon House quotation format (reference PDF: `CHIRAGBHAI LAKHANI GROHE 24-03-2026.pdf`).

**Architecture:** Client-side only — `generateQuotationPrintHTML()` builds a complete `<!DOCTYPE html>` string from in-memory quotation state, opens a new tab via `window.open()`, writes the HTML, and auto-fires `window.print()`. Brand logos are served from `/public/brands/*.svg` using `window.location.origin`. No new packages required.

**Tech Stack:** Next.js 15 App Router, TypeScript, date-fns (already installed), Lucide React (already installed)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/lib/mock/sales-data.ts` | Modify | Add `section?` + `imageUrl?` to `LineItem`; `customerPhone?` to `Quotation` |
| `apps/web/src/lib/quotation-print.ts` | **Create** | `generateQuotationPrintHTML()` — pure function, returns complete HTML string |
| `apps/web/src/components/sales/quotations/quotation-builder.tsx` | Modify | `customerPhone` state + input; `section`/`imageUrl` columns in row; Print button |

---

## Task 1: Extend the data model

**Files:**
- Modify: `apps/web/src/lib/mock/sales-data.ts:10-21` (LineItem interface)
- Modify: `apps/web/src/lib/mock/sales-data.ts:23-46` (Quotation interface)

- [ ] **Step 1: Add `section?` and `imageUrl?` to `LineItem`**

Open `apps/web/src/lib/mock/sales-data.ts`. Find the `LineItem` interface (lines 10–21) and add two optional fields at the end:

```ts
export interface LineItem {
  id: string
  productId: string
  productName: string
  sku: string
  description: string
  unit: string
  qty: number
  unitPrice: number
  discount: number   // percentage, 0–100
  gstRate: number    // 5 | 12 | 18 | 28
  section?: string   // room grouping for PDF, e.g. "BATHROOM 1,2"
  imageUrl?: string  // product thumbnail URL for PDF
}
```

- [ ] **Step 2: Add `customerPhone?` to `Quotation`**

In the same file, find the `Quotation` interface (lines 23–46) and add `customerPhone?` directly after `customerName`:

```ts
export interface Quotation {
  id: string
  revisionId?: string
  number: string
  customerId: string
  customerName: string
  customerPhone?: string      // ← add this line
  customerGST: string
  billingAddress: string
  siteAddress: string
  revisionStatus?: 'DRAFT' | 'LOCKED'
  projectName: string
  grandTotal?: number
  lineItemCount?: number
  status: QuotationStatus
  validUntil: Date
  lineItems: LineItem[]
  notes: string
  termsAndConditions: string
  createdBy: string
  createdAt: Date
  sentAt?: Date
  viewedAt?: Date
  acceptedAt?: Date
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/yashvardhansinhjhala/forge && pnpm type-check
```

Expected: no errors related to `LineItem` or `Quotation`. (Other pre-existing errors are acceptable.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/mock/sales-data.ts
git commit -m "feat: add section, imageUrl to LineItem and customerPhone to Quotation"
```

---

## Task 2: Create the print HTML generator

**Files:**
- Create: `apps/web/src/lib/quotation-print.ts`

- [ ] **Step 1: Create the file**

Create `apps/web/src/lib/quotation-print.ts` with the full content below:

```ts
import { format } from 'date-fns'
import type { LineItem } from '@/lib/mock/sales-data'

interface PrintData {
  number: string
  customerName: string
  customerPhone?: string
  createdBy: string
  createdAt: Date
  lineItems: LineItem[]
}

interface SectionData {
  name: string
  items: LineItem[]
  mrpTotal: number
  offerTotal: number
  offerDiscountTotal: number
  totalQty: number
}

/** Indian-formatted currency: ₹ 8,57,640.00 */
function fmt(n: number): string {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Plain Indian number: 8,57,640.00 */
function fmtN(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupBySection(lineItems: LineItem[]): SectionData[] {
  const map = new Map<string, LineItem[]>()
  for (const item of lineItems.filter(li => li.sku)) {
    const key = item.section?.trim() || 'GENERAL'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([name, items]) => {
    const mrpTotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    const offerTotal = items.reduce((s, i) => s + i.unitPrice * (1 - i.discount / 100) * i.qty, 0)
    const offerDiscountTotal = items.reduce((s, i) => s + i.unitPrice * (i.discount / 100) * i.qty, 0)
    const totalQty = items.reduce((s, i) => s + i.qty, 0)
    return { name, items, mrpTotal, offerTotal, offerDiscountTotal, totalQty }
  })
}

const CSS = `
  @page { size: A4; margin: 15mm }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #555; padding: 4px 6px; vertical-align: middle; }
  .gold { background: #F2C50A !important; font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .page-break { page-break-before: always; margin-top: 0; }
  .header-box { border: 2px solid #444; padding: 10px 14px; margin-bottom: 10px; }
  .buildcon-title { font-size: 26pt; font-weight: 900; letter-spacing: 3px; text-align: center; font-family: Arial Black, Arial, sans-serif; }
  .tagline { font-size: 10pt; text-align: center; font-style: italic; margin-top: 3px; color: #333; }
  .brand-row { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 0; flex-wrap: wrap; }
  .brand-img { height: 26px; width: auto; object-fit: contain; }
  .brand-text { font-weight: bold; font-size: 9.5pt; letter-spacing: 0.5px; }
  .sub-title { font-size: 12pt; font-weight: bold; text-align: center; margin: 10px 0 4px; text-decoration: underline; }
  .intro { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 10pt; line-height: 1.5; }
  .info-table td { padding: 5px 10px; font-size: 11pt; }
  .info-label { font-weight: bold; width: 100px; white-space: nowrap; }
  .info-value { font-weight: bold; font-size: 12pt; }
  .section-header { font-size: 13pt; font-weight: bold; padding: 6px 8px; }
  .summary-sl { width: 70px; }
  .summary-mrp { width: 150px; }
  .total-label { font-size: 12pt; font-weight: bold; padding: 6px 8px; }
  .note-block { margin-top: 10px; font-size: 8.5pt; line-height: 1.6; }
  .note-block .note-title { font-weight: bold; margin-bottom: 2px; }
  .regards-block { margin-top: 8px; font-size: 9pt; line-height: 1.6; }
  .toll-table td { font-size: 9pt; padding: 3px 8px; }
  .detail-th { background: #F2C50A; font-weight: bold; font-size: 9pt; }
  .detail-img { width: 58px; height: 48px; object-fit: contain; display: block; margin: auto; }
  .detail-total-row td { background: #F2C50A; font-weight: bold; font-size: 10pt; }
  @media print {
    .page-break { page-break-before: always; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

function coverPage(data: PrintData, sections: SectionData[], grandMrp: number, grandOffer: number, baseUrl: string): string {
  const dateStr = format(data.createdAt, 'dd-MM-yyyy')

  const logoRow1 = [
    { name: 'GROHE', src: `${baseUrl}/brands/grohe.svg` },
    { name: 'hansgrohe', src: `${baseUrl}/brands/hansgrohe.svg` },
    { name: 'AXOR', src: `${baseUrl}/brands/axor.svg` },
    { name: 'GEBERIT', src: `${baseUrl}/brands/geberit.svg` },
    { name: 'VitrA', src: `${baseUrl}/brands/vitra.svg` },
  ]
  const logoRow2Text = ['Oyster', 'QUTONE', 'Nexion', 'DIMORE', 'ittimi']

  const summaryRows = sections.map((s, i) => `
    <tr>
      <td class="center bold">${i + 1}</td>
      <td class="center bold">${s.name}</td>
      <td class="right bold">${fmt(s.mrpTotal)}</td>
    </tr>`).join('')

  return `
    <div class="header-box">
      <div class="buildcon-title">BUILDCON HOUSE</div>
      <div class="tagline">Let you live better</div>
      <div class="brand-row" style="margin-top:10px; border-top:1px solid #ccc; padding-top:8px;">
        ${logoRow1.map(b => `<img src="${b.src}" alt="${b.name}" class="brand-img" />`).join('')}
      </div>
      <div class="brand-row" style="border-top:1px solid #ccc; padding-top:6px;">
        ${logoRow2Text.map(b => `<span class="brand-text">${b}</span>`).join('')}
      </div>
    </div>

    <div class="sub-title">SUB: Quotation</div>
    <div class="intro">
      Dear sir thanks you for positive approach to our products. We are glad to give you our<br>
      best competitive rate, as per your requirement.
    </div>

    <table class="info-table" style="margin-bottom:12px;">
      <tr><td class="info-label">NAME :</td><td class="info-value center">${data.customerName}</td></tr>
      <tr><td class="info-label">DATE :</td><td class="info-value center">${dateStr}</td></tr>
      <tr><td class="info-label">NUM :</td><td class="info-value center">${data.customerPhone ?? ''}</td></tr>
      <tr><td class="info-label">REF :</td><td class="info-value center">${data.createdBy}</td></tr>
    </table>

    <table>
      <tr><td colspan="3" class="gold center section-header">GROHE</td></tr>
      <tr>
        <th class="gold center summary-sl">SL,NO.</th>
        <th class="gold center">BATHROOM</th>
        <th class="gold center summary-mrp">MRP</th>
      </tr>
      ${summaryRows}
      <tr>
        <td colspan="2" class="gold center total-label">TOTAL</td>
        <td class="gold right total-label">${fmt(grandMrp)}</td>
      </tr>
      <tr>
        <td colspan="2" class="gold center" style="font-size:13pt; font-weight:bold; padding:7px 8px;">SPECIAL OFFER RATE</td>
        <td class="gold right" style="font-size:13pt; font-weight:bold; padding:7px 8px;">₹ ${fmtN(grandOffer)}</td>
      </tr>
    </table>

    <div class="note-block">
      <p class="note-title">NOTE</p>
      <p>1. All rate for Grohe are as per current MRP.</p>
      <p>2. Company - Grohe and other Company, can revise MRP without notice.</p>
      <p>3. Please confirm order with 100 % advance for CP items.</p>
      <p>4. Quote remains valid till company MRP remains unchanged. Force majure, w.r.t TAX, MRP,</p>
      <p>5. For items with escalated MRP, confirm order with 100 % payments, prior to cut off time line.</p>
      <p>6. Delivery as per company schedule. Freight extra as per actual.</p>
      <p><strong>7. RATE VALID FOR THIS MONTH</strong></p>
      <p style="margin-top:6px;">Hope all details submitted are as per your requirements. Please call or mail for any alteration or clarifications.</p>
    </div>

    <div class="regards-block">
      <p>Regards,</p>
      <p><strong>Buildcon House</strong></p>
      <p>MO : +91 9909906652</p>
      <p>MAIL : buildconhouse10@gmail.com</p>
    </div>

    <table style="margin-top:8px; width:220px;" class="toll-table">
      <tr><td colspan="2" class="gold bold">TOLL FREE NUMBER</td></tr>
      <tr><td>GEBERIT</td><td>18001024323</td></tr>
      <tr><td>GROHE</td><td>18001024475</td></tr>
      <tr><td>HANSGROHE</td><td>18002093246</td></tr>
      <tr><td>VITRA</td><td>70451 32132</td></tr>
      <tr><td>OYSTER</td><td>18001208999</td></tr>
    </table>
  `
}

function sectionDetailPage(section: SectionData): string {
  const rows = section.items.map((item, idx) => {
    const offerRate = item.unitPrice * (1 - item.discount / 100)
    const mrpTotal = item.unitPrice * item.qty
    const offerTotal = offerRate * item.qty
    const imgCell = item.imageUrl
      ? `<img src="${item.imageUrl}" class="detail-img" alt="${item.productName}" />`
      : ''
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center" style="font-size:8.5pt;">${item.sku}</td>
        <td class="center" style="font-size:8.5pt;">${item.productName}${item.description ? `<br><span style="font-size:7.5pt;color:#555;">${item.description}</span>` : ''}</td>
        <td class="center">${imgCell}</td>
        <td class="right">₹ ${fmtN(item.unitPrice)}</td>
        <td class="center">${item.qty}</td>
        <td class="right">₹ ${fmtN(mrpTotal)}</td>
        <td class="right">₹ ${fmtN(offerRate)}</td>
        <td class="right">₹ ${fmtN(offerTotal)}</td>
      </tr>`
  }).join('')

  return `
    <div class="page-break">
      <table>
        <tr><td colspan="9" class="gold bold section-header">${section.name}</td></tr>
        <tr>
          <th class="detail-th center" style="width:36px;">Sr.<br>No.</th>
          <th class="detail-th center" style="width:78px;">Article<br>No.</th>
          <th class="detail-th center">Product Description</th>
          <th class="detail-th center" style="width:72px;">Product Image</th>
          <th class="detail-th center" style="width:68px;">MRP</th>
          <th class="detail-th center" style="width:36px;">QTY</th>
          <th class="detail-th center" style="width:90px;">MRP TOTAL</th>
          <th class="detail-th center" style="width:82px;">OFFER RATE</th>
          <th class="detail-th center" style="width:90px;">TOTAL</th>
        </tr>
        ${rows}
        <tr class="detail-total-row">
          <td colspan="4" class="center" style="font-size:11pt;">TOTAL</td>
          <td></td>
          <td class="center">${section.totalQty}</td>
          <td class="right">${fmt(section.mrpTotal)}</td>
          <td class="right">₹ ${fmtN(section.offerDiscountTotal)}</td>
          <td class="right">₹ ${fmtN(section.offerTotal)}</td>
        </tr>
      </table>
    </div>`
}

export function generateQuotationPrintHTML(data: PrintData): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const sections = groupBySection(data.lineItems)
  const grandMrp = sections.reduce((s, sec) => s + sec.mrpTotal, 0)
  const grandOffer = sections.reduce((s, sec) => s + sec.offerTotal, 0)

  const cover = coverPage(data, sections, grandMrp, grandOffer, baseUrl)
  const details = sections.map(sectionDetailPage).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quotation ${data.number} — ${data.customerName}</title>
  <style>${CSS}</style>
</head>
<body>
  ${cover}
  ${details}
  <script>window.onload = function () { window.print() }</script>
</body>
</html>`
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/yashvardhansinhjhala/forge && pnpm type-check
```

Expected: no new errors from `quotation-print.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/quotation-print.ts
git commit -m "feat: add generateQuotationPrintHTML for Buildcon House PDF format"
```

---

## Task 3: Update QuotationBuilder — customer phone + state wiring

**Files:**
- Modify: `apps/web/src/components/sales/quotations/quotation-builder.tsx`

- [ ] **Step 1: Add `Printer` to the lucide-react import**

Find line 14 in `quotation-builder.tsx`:
```tsx
import {
  X, GripVertical, Plus, Send, Check, ChevronRight, Search, Trash2, Lock,
} from 'lucide-react'
```

Replace with:
```tsx
import {
  X, GripVertical, Plus, Send, Check, ChevronRight, Search, Trash2, Lock, Printer,
} from 'lucide-react'
```

- [ ] **Step 2: Import `generateQuotationPrintHTML`**

After the existing import on line 26:
```tsx
import { formatINR } from '@/lib/format'
```

Add:
```tsx
import { generateQuotationPrintHTML } from '@/lib/quotation-print'
```

- [ ] **Step 3: Add `customerPhone` state**

In `QuotationBuilder`, find the existing state declarations (around line 322). After:
```tsx
const [customerName, setCustomerName] = React.useState('')
```

Add:
```tsx
const [customerPhone, setCustomerPhone] = React.useState('')
```

- [ ] **Step 4: Populate `customerPhone` from quotation in `useEffect`**

Find the `useEffect` that loads quotation data (lines 335–346). Add one line for `customerPhone`:

```tsx
React.useEffect(() => {
  if (quotation) {
    setLineItems(quotation.lineItems)
    setStatus(quotation.status)
    setCustomerName(quotation.customerName)
    setCustomerPhone(quotation.customerPhone ?? '')    // ← add this
    setSiteAddress(quotation.siteAddress)
    setProjectName(quotation.projectName)
    setNotes(quotation.notes)
    setRevisionStatus(quotation.revisionStatus ?? 'DRAFT')
    setRevisionId(quotation.revisionId ?? null)
  }
}, [quotation?.id])
```

- [ ] **Step 5: Add `handlePrint` function**

After the `handleSend` function (around line 378), add:

```tsx
function handlePrint() {
  const html = generateQuotationPrintHTML({
    number: quotation!.number,
    customerName,
    customerPhone: customerPhone || undefined,
    createdBy: quotation!.createdBy,
    createdAt: quotation!.createdAt,
    lineItems,
  })
  const win = window.open('', '_blank')
  if (!win) {
    toast.error('Pop-ups blocked — allow pop-ups for this site and try again')
    return
  }
  win.document.write(html)
  win.document.close()
}
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/yashvardhansinhjhala/forge && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/sales/quotations/quotation-builder.tsx
git commit -m "feat: wire customerPhone state and handlePrint to quotation builder"
```

---

## Task 4: Update QuotationBuilder — UI elements

**Files:**
- Modify: `apps/web/src/components/sales/quotations/quotation-builder.tsx`

- [ ] **Step 1: Add Customer Phone input to left panel**

Find the "Customer *" input block in the left panel (around line 580):
```tsx
<div style={{ marginBottom: 14 }}>
  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Customer *</label>
  <input
    value={customerName}
    onChange={(e) => setCustomerName(e.target.value)}
    ...
  />
</div>
```

Add the following block **directly after** it (before the "Site / Project Address" block):

```tsx
{/* Customer Phone */}
<div style={{ marginBottom: 14 }}>
  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Customer Phone</label>
  <input
    value={customerPhone}
    onChange={(e) => setCustomerPhone(e.target.value)}
    placeholder="e.g. 98989 58897"
    style={{ width: '100%', fontSize: 13, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
  />
</div>
```

- [ ] **Step 2: Add Section and Image URL columns to the table header**

Find the `<thead>` block (around lines 643–653):

```tsx
<thead>
  <tr style={{ background: 'rgba(0,0,0,0.02)', position: 'sticky', top: 0 }}>
    <th style={{ width: 24 }} />
    <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Qty</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 100 }}>Price</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Disc%</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>GST</th>
    <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: 100 }}>Total</th>
    <th style={{ width: 32 }} />
  </tr>
</thead>
```

Replace with:

```tsx
<thead>
  <tr style={{ background: 'rgba(0,0,0,0.02)', position: 'sticky', top: 0 }}>
    <th style={{ width: 24 }} />
    <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Qty</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 100 }}>Price</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Disc%</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 86 }}>Section</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 80 }}>Image URL</th>
    <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>GST</th>
    <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: 100 }}>Total</th>
    <th style={{ width: 32 }} />
  </tr>
</thead>
```

- [ ] **Step 3: Add Section and Image URL cells to `SortableRow`**

Find `SortableRow` (line 216). Locate the "Disc %" cell (around line 264–267):

```tsx
{/* Disc % */}
<td style={{ padding: '8px 4px', verticalAlign: 'top', width: 60 }}>
  <InlineNumberInput value={item.discount} onChange={(v) => onUpdate({ discount: Math.min(100, v) })} />
</td>
{/* GST */}
```

Add two new cells **between** "Disc %" and "GST":

```tsx
{/* Disc % */}
<td style={{ padding: '8px 4px', verticalAlign: 'top', width: 60 }}>
  <InlineNumberInput value={item.discount} onChange={(v) => onUpdate({ discount: Math.min(100, v) })} />
</td>
{/* Section */}
<td style={{ padding: '8px 4px', verticalAlign: 'top', width: 86 }}>
  <input
    value={item.section ?? ''}
    onChange={(e) => onUpdate({ section: e.target.value || undefined })}
    placeholder="Room…"
    style={{ width: '100%', fontSize: 11, padding: '3px 5px', border: '1px solid var(--border-default)', borderRadius: 4, outline: 'none', boxSizing: 'border-box', color: 'var(--text-primary)' }}
  />
</td>
{/* Image URL */}
<td style={{ padding: '8px 4px', verticalAlign: 'top', width: 80 }}>
  <input
    value={item.imageUrl ?? ''}
    onChange={(e) => onUpdate({ imageUrl: e.target.value || undefined })}
    placeholder="https://…"
    style={{ width: '100%', fontSize: 11, padding: '3px 5px', border: '1px solid var(--border-default)', borderRadius: 4, outline: 'none', boxSizing: 'border-box', color: 'var(--text-primary)' }}
  />
</td>
{/* GST */}
```

- [ ] **Step 4: Add Print / Save PDF button to header bar**

Find the header bar buttons section (around line 531–562). Locate the existing "Save Draft" button:

```tsx
<button onClick={() => void handleSave()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
  Save Draft
</button>
```

Add the Print button **directly after** it:

```tsx
<button onClick={() => void handleSave()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
  Save Draft
</button>
<button
  onClick={handlePrint}
  style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}
>
  <Printer size={12} />
  Print / Save PDF
</button>
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/yashvardhansinhjhala/forge && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/sales/quotations/quotation-builder.tsx
git commit -m "feat: add Print/Save PDF button, section and imageUrl columns to quotation builder"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/yashvardhansinhjhala/forge && pnpm dev
```

Open `http://localhost:3000/sales/quotations`.

- [ ] **Step 2: Open a quotation**

Click any quotation row to open the builder slide-over.

- [ ] **Step 3: Fill in the new fields**

In the left panel, enter a Customer Phone.

In the line items table, enter a Section name (e.g. `BATHROOM 1,2`) on the first few rows and a different section (e.g. `KITCHEN`) on later rows.

Optionally paste a product image URL for one item.

- [ ] **Step 4: Click Print / Save PDF**

Expected:
- A new browser tab opens
- Tab title: `Quotation Q-XXXX — <Customer Name>`
- Page 1: Buildcon House header, brand logos, customer info table (NAME/DATE/NUM/REF), GROHE gold header, section summary table, TOTAL, SPECIAL OFFER RATE, 7 notes, Regards, toll-free numbers
- Pages 2+: One detail page per unique section, each with a gold header matching the section name
- Browser print dialog fires automatically
- "Save as PDF" in the print dialog produces a file matching the reference PDF layout

- [ ] **Step 5: Verify OFFER RATE math**

For any row with MRP = ₹47,700 and Disc% = 50:
- OFFER RATE column should show ₹ 23,850.00
- TOTAL column (qty 2) should show ₹ 47,700.00
- SPECIAL OFFER RATE on page 1 = sum of all TOTAL columns across all sections

---

## Self-Review Checklist (completed inline)

- **Spec coverage:** ✅ All three data model additions covered in Task 1. Print engine in Task 2. Builder UI (phone input, two columns, Print button) in Tasks 3–4. Manual verification in Task 5.
- **Placeholder scan:** ✅ No TBDs — all code is complete.
- **Type consistency:** ✅ `LineItem` extended in Task 1 is consumed correctly in Task 2 (`item.section`, `item.imageUrl`, `item.unitPrice`, `item.discount`, `item.qty`). `customerPhone` added to state in Task 3, passed to `generateQuotationPrintHTML` in Task 3 Step 5, rendered in Task 4. `Printer` icon imported in Task 3 Step 1 and used in Task 4 Step 4. `handlePrint` defined in Task 3 Step 5 and wired in Task 4 Step 4.
