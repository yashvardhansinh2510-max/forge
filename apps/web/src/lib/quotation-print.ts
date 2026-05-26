import { format } from 'date-fns'
import type { LineItem } from '@/lib/mock/sales-data'

interface PrintData {
  number: string
  customerName: string
  customerPhone?: string
  createdBy: string
  createdAt: Date
  lineItems: LineItem[]
  brandLabel?: string
}

interface SectionData {
  name: string
  items: LineItem[]
  mrpTotal: number
  offerTotal: number
  offerRateSum: number
  totalQty: number
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
  // Include catalog items (sku truthy) AND custom items (isCustom flag).
  // Custom items have no catalog SKU but are valid quotation line items.
  for (const item of lineItems.filter(li => li.sku || li.isCustom)) {
    const key = item.section?.trim() || 'GENERAL'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([name, items]) => {
    const mrpTotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    const offerTotal = items.reduce((s, i) => s + i.unitPrice * (1 - i.discount / 100) * i.qty, 0)
    const offerRateSum = items.reduce((s, i) => s + i.unitPrice * (1 - i.discount / 100), 0)
    const totalQty = items.reduce((s, i) => s + i.qty, 0)
    return { name, items, mrpTotal, offerTotal, offerRateSum, totalQty }
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
  .brand-pill {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 3px 8px; border-radius: 4px;
    background: #f3f4f6; border: 1px solid #d1d5db;
    font-size: 8pt; font-weight: 700; letter-spacing: 0.05em;
    color: #374151; font-family: Arial Black, Arial, sans-serif;
  }
  .brand-pill-oyster  { background: #fff0f0; border-color: #fca5a5; color: #991b1b; }
  .brand-pill-qutone  { background: #fff7ed; border-color: #fdba74; color: #9a3412; }
  .brand-pill-nexion  { background: #f9fafb; border-color: #6b7280; color: #111827; }
  .brand-pill-dimore  { background: #eff6ff; border-color: #93c5fd; color: #1e40af; }
  .brand-pill-ittimi  { background: #fdf4ff; border-color: #d8b4fe; color: #6b21a8; }
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
  const brandRow2Html = `<div class="brand-logos-row" style="margin-top:4px;">
    <span class="brand-pill brand-pill-oyster">Oyster®</span>
    <span class="brand-pill brand-pill-qutone">QUTONE</span>
    <span class="brand-pill brand-pill-nexion">✗ Nexion</span>
    <span class="brand-pill brand-pill-dimore">DIMORE</span>
    <span class="brand-pill brand-pill-ittimi">ittimi</span>
  </div>`

  const summaryRows = sections.map((s, i) => `
    <tr>
      <td class="center bold">${i + 1}</td>
      <td class="center bold">${esc(s.name)}</td>
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
        ${brandRow2Html}
      </div>
    </div>

    <div class="sub-title">SUB: Quotation</div>
    <div class="intro">
      Dear sir thanks you for positive approach to our products. We are glad to give you our<br>
      best competitive rate, as per your requirement.
    </div>

    <table class="info-table" style="margin-bottom:12px;">
      <tr><td class="info-label">NAME :</td><td class="info-value center">${esc(data.customerName)}</td></tr>
      <tr><td class="info-label">DATE :</td><td class="info-value center">${dateStr}</td></tr>
      <tr><td class="info-label">NUM :</td><td class="info-value center">${esc(data.customerPhone)}</td></tr>
      <tr><td class="info-label">REF :</td><td class="info-value center">${esc(data.createdBy)}</td></tr>
    </table>

    <table>
      <tr><td colspan="3" class="gold center section-header">${esc(data.brandLabel?.toUpperCase() || 'GROHE')}</td></tr>
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

function sectionDetailPage(section: SectionData, hasAnyDiscount: boolean): string {
  const colCount = hasAnyDiscount ? 11 : 8

  const rows = section.items.map((item, idx) => {
    const offerRate = item.unitPrice * (1 - item.discount / 100)
    const mrpTotal = item.unitPrice * item.qty
    const offerTotal = offerRate * item.qty
    const imgCell = item.imageUrl
      ? `<img src="${esc(item.imageUrl)}" class="detail-img" alt="${esc(item.productName)}" />`
      : ''
    const articleCell = `
      <td style="text-align:center;">
        ${esc(item.sku) || '—'}<br>
        ${item.selectedColor
          ? `<span style="font-size:7pt;color:#666;">${esc(item.selectedColor)}</span>`
          : ''}
      </td>`
    const descCell = `<td class="center" style="font-size:8.5pt;">${esc(item.productName)}${item.description ? `<br><span style="font-size:7.5pt;color:#555;">${esc(item.description)}</span>` : ''}</td>`
    const imgTd = `<td class="center">${imgCell}</td>`

    if (hasAnyDiscount) {
      const itemHasDiscount = item.discount > 0
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          ${articleCell}
          ${descCell}
          ${imgTd}
          <td class="right">₹ ${fmtN(item.unitPrice)}</td>
          <td class="center">${item.qty}</td>
          <td class="right">₹ ${fmtN(mrpTotal)}</td>
          <td class="center">${itemHasDiscount ? item.discount + '%' : '—'}</td>
          <td class="center">${item.gstRate !== undefined ? item.gstRate + '%' : '18%'}</td>
          <td class="right">${itemHasDiscount ? '₹ ' + fmtN(offerRate) : '—'}</td>
          <td class="right">₹ ${fmtN(offerTotal)}</td>
        </tr>`
    }

    // No discounts in this quotation — simplified columns
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        ${articleCell}
        ${descCell}
        ${imgTd}
        <td class="right">₹ ${fmtN(item.unitPrice)}</td>
        <td class="center">${item.qty}</td>
        <td class="center">${item.gstRate !== undefined ? item.gstRate + '%' : '18%'}</td>
        <td class="right">₹ ${fmtN(mrpTotal)}</td>
      </tr>`
  }).join('')

  const header = hasAnyDiscount
    ? `<tr>
        <th class="detail-th center" style="width:36px;">Sr.<br>No.</th>
        <th class="detail-th center" style="width:78px;">Article<br>No.</th>
        <th class="detail-th center">Product Description</th>
        <th class="detail-th center" style="width:72px;">Product Image</th>
        <th class="detail-th center" style="width:68px;">List Price</th>
        <th class="detail-th center" style="width:36px;">QTY</th>
        <th class="detail-th center" style="width:90px;">MRP TOTAL</th>
        <th class="detail-th center" style="width:44px;">DISC%</th>
        <th class="detail-th center" style="width:40px;">GST%</th>
        <th class="detail-th center" style="width:82px;">Special Offer Rate</th>
        <th class="detail-th center" style="width:90px;">TOTAL</th>
      </tr>`
    : `<tr>
        <th class="detail-th center" style="width:36px;">Sr.<br>No.</th>
        <th class="detail-th center" style="width:78px;">Article<br>No.</th>
        <th class="detail-th center">Product Description</th>
        <th class="detail-th center" style="width:72px;">Product Image</th>
        <th class="detail-th center" style="width:68px;">Unit Price</th>
        <th class="detail-th center" style="width:36px;">QTY</th>
        <th class="detail-th center" style="width:40px;">GST%</th>
        <th class="detail-th center" style="width:90px;">TOTAL</th>
      </tr>`

  const totalsRow = hasAnyDiscount
    ? `<tr class="detail-total-row">
        <td colspan="5" class="center" style="font-size:11pt;">TOTAL</td>
        <td class="center">${section.totalQty}</td>
        <td class="right">${fmt(section.mrpTotal)}</td>
        <td class="center">—</td>
        <td class="center">—</td>
        <td class="right">₹ ${fmtN(section.offerRateSum)}</td>
        <td class="right">₹ ${fmtN(section.offerTotal)}</td>
      </tr>`
    : `<tr class="detail-total-row">
        <td colspan="4" class="center" style="font-size:11pt;">TOTAL</td>
        <td class="right">—</td>
        <td class="center">${section.totalQty}</td>
        <td class="center">—</td>
        <td class="right">${fmt(section.mrpTotal)}</td>
      </tr>`

  return `
    <div class="page-break">
      <table>
        <tr><td colspan="${colCount}" class="gold bold section-header">${esc(section.name)}</td></tr>
        ${header}
        ${rows}
        ${totalsRow}
      </table>
    </div>`
}

export function generateQuotationPrintHTML(data: PrintData): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const sections = groupBySection(data.lineItems)
  const grandMrp = sections.reduce((s, sec) => s + sec.mrpTotal, 0)
  const grandOffer = sections.reduce((s, sec) => s + sec.offerTotal, 0)
  const hasAnyDiscount = data.lineItems.some(li => li.discount > 0)

  const cover = coverPage(data, sections, grandMrp, grandOffer, baseUrl)
  const details = sections.map(s => sectionDetailPage(s, hasAnyDiscount)).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quotation ${esc(data.number)} — ${esc(data.customerName)}</title>
  <style>${CSS}</style>
</head>
<body>
  ${cover}
  ${details}
  <script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 500); });</script>
</body>
</html>`
}
