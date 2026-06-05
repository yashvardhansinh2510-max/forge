import { format } from 'date-fns'
import type { LineItem } from '@/lib/mock/sales-data'

interface PrintData {
  number: string
  customerName: string
  customerPhone?: string
  createdBy: string
  createdAt: Date
  lineItems: LineItem[]
  projectNotes?: string
}

interface SectionData {
  name: string
  items: LineItem[]
  mrpTotal: number
  offerTotal: number
  totalQty: number
}

function fmt(n: number): string {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtN(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Unit price: no decimal (matches reference — ₹ 47,700 not ₹ 47,700.00) */
function fmtUnit(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function deriveBrand(lineItems: LineItem[]): string {
  const counts = new Map<string, number>()
  for (const item of lineItems) {
    if (item.brand) counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1)
  }
  let max = 0, best = 'GROHE'
  for (const [b, c] of counts) if (c > max) { max = c; best = b }
  return best
}

function groupBySection(lineItems: LineItem[]): SectionData[] {
  const map = new Map<string, LineItem[]>()
  for (const item of lineItems.filter(li => li.sku)) {
    const key = item.section?.trim() || 'GENERAL'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([name, items]) => {
    const mrpTotal   = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    const offerTotal = items.reduce((s, i) => s + i.unitPrice * (1 - i.discount / 100) * i.qty, 0)
    const totalQty   = items.reduce((s, i) => s + i.qty, 0)
    return { name, items, mrpTotal, offerTotal, totalQty }
  })
}

const CSS = `
  @page { size: A4; margin: 14mm 12mm }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 6px; vertical-align: middle; }
  /* #BF8F00 — pixel-sampled from original Buildcon House PDF (dominant: RGB 191,143,0) */
  .gold { background: #BF8F00 !important; }
  .bold { font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .page-break { page-break-before: always; }

  /* ── Letterhead ─────────────────────────────────────── */
  .lh-box { border: 1px solid #000; padding: 8px 12px 6px; margin-bottom: 8px; }
  .lh-logo-wrap { text-align: center; margin-bottom: 5px; }
  /* 107px = original logo height measured from source PDF (167px @150dpi → 107 CSS px) */
  .lh-logo-img { height: 107px; width: auto; }
  .lh-divider { border: none; border-top: 1px solid #ccc; margin: 5px 0; }
  .brand-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 2px 0; }
  .brand-img { height: 20px; width: auto; object-fit: contain; }

  /* ── Cover text ─────────────────────────────────────── */
  .sub-title { font-size: 11pt; font-weight: bold; text-align: center; text-decoration: underline; margin: 8px 0 4px; }
  .intro { text-align: center; font-size: 10pt; font-weight: bold; margin-bottom: 10px; }

  /* ── Info table ─────────────────────────────────────── */
  .info-label { font-weight: bold; width: 55px; white-space: nowrap; }
  .info-value { font-weight: bold; }

  /* ── Summary table ──────────────────────────────────── */
  .brand-hdr { font-size: 12pt; font-weight: bold; padding: 6px 8px; text-align: center; }
  .col-hdr { font-weight: bold; text-align: center; }
  .offer-val { font-size: 13pt; font-weight: bold; color: #c05000; }
  .offer-row { background: #FFFF00 !important; }
  .offer-row td { color: #E41B23; font-weight: bold; }

  /* ── Notes ──────────────────────────────────────────── */
  .note-block { margin-top: 10px; font-size: 8.5pt; line-height: 1.65; }
  .note-title { font-weight: bold; font-size: 9pt; }
  .regards-block { margin-top: 8px; font-size: 9pt; line-height: 1.7; }
  .toll-table { width: auto; margin-top: 8px; }
  .toll-table td { font-size: 8.5pt; padding: 2px 8px; border-color: #999; }

  /* ── Detail pages ───────────────────────────────────── */
  .detail-img { width: 80px; height: 60px; object-fit: contain; display: block; margin: auto; }
  .detail-total td { background: #BF8F00 !important; font-weight: bold; }

  @media print {
    .page-break { page-break-before: always; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

function pdfImageSrc(imageUrl: string | undefined, baseUrl: string, brand: string): string {
  if (imageUrl) {
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) return imageUrl
    return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
  }
  const initials = (brand ?? 'PR').slice(0, 2).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="48" viewBox="0 0 60 48"><rect width="60" height="48" rx="6" fill="#f1f5f9"/><text x="30" y="29" font-family="Arial,sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#94a3b8">${initials}</text></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function buildconHeader(baseUrl: string): string {
  const row1 = [
    { src: `${baseUrl}/brands-ref/brand-grohe.png`,     alt: 'GROHE'      },
    { src: `${baseUrl}/brands-ref/brand-hansgrohe.png`, alt: 'hansgrohe'  },
    { src: `${baseUrl}/brands-ref/brand-axor.png`,      alt: 'AXOR'       },
    { src: `${baseUrl}/brands-ref/brand-geberit.png`,   alt: 'GEBERIT'    },
    { src: `${baseUrl}/brands-ref/brand-vitra.png`,     alt: 'VitrA'      },
  ]
  const row2 = [
    { src: `${baseUrl}/brands-ref/brand-oyster.png`,    alt: 'Oyster'     },
    { src: `${baseUrl}/brands-ref/brand-qutone.png`,    alt: 'QUTONE'     },
    { src: `${baseUrl}/brands-ref/brand-nexion.png`,    alt: 'Nexion'     },
    { src: `${baseUrl}/brands-ref/brand-dimore.png`,    alt: 'DIMORE'     },
    { src: `${baseUrl}/brands-ref/brand-nln.png`,       alt: 'NLN ittimi' },
  ]

  const makeRow = (brands: { src: string; alt: string }[]) =>
    `<div class="brand-row">${brands.map(b =>
      `<img src="${b.src}" alt="${b.alt}" class="brand-img" />`
    ).join('')}</div>`

  return `
  <div class="lh-box">
    <div class="lh-logo-wrap">
      <img src="${baseUrl}/brands-ref/buildcon-logo.png" class="lh-logo-img" alt="Buildcon House" />
    </div>
    <hr class="lh-divider" />
    ${makeRow(row1)}
    ${makeRow(row2)}
  </div>`
}

function coverPage(
  data: PrintData,
  sections: SectionData[],
  grandMrp: number,
  grandOffer: number,
  brand: string,
  baseUrl: string,
): string {
  const notes = data.projectNotes?.trim()
  const dateStr = format(data.createdAt, 'dd-MM-yyyy')

  const summaryRows = sections.map((s, i) => `
    <tr>
      <td class="center bold">${i + 1}</td>
      <td class="bold">${s.name.toUpperCase()}</td>
      <td class="right bold">${fmt(s.mrpTotal)}</td>
    </tr>`).join('')

  return `
    ${buildconHeader(baseUrl)}

    <div class="sub-title">SUB: Quotation</div>
    <div class="intro">
       Dear sir thanks you for positive approach to our products. We are glad to give you our <br>
      best competitive rate, as per your requirement.
    </div>

    <table style="margin-bottom:10px;">
      <tr>
        <td class="info-label">NAME :</td>
        <td class="info-value">${data.customerName}</td>
        <td class="info-label">DATE :</td>
        <td class="info-value">${dateStr}</td>
      </tr>
      <tr>
        <td class="info-label">NUM :</td>
        <td class="info-value">${data.customerPhone ?? '—'}</td>
        <td class="info-label">REF :</td>
        <td class="info-value">${data.createdBy}</td>
      </tr>
    </table>

    <table style="margin-bottom:12px;">
      <tr><td colspan="3" class="gold brand-hdr">${brand.toUpperCase()}</td></tr>
      <tr>
        <th class="gold col-hdr" style="width:50px;">SL,NO.</th>
        <th class="gold col-hdr">BATHROOM</th>
        <th class="gold col-hdr" style="width:130px;">MRP</th>
      </tr>
      ${summaryRows}
      <tr>
        <td colspan="2" class="gold center bold" style="font-size:11pt;">TOTAL</td>
        <td class="gold right bold" style="font-size:11pt;">${fmt(grandMrp)}</td>
      </tr>
      <tr class="offer-row">
        <td colspan="2" class="center bold" style="font-size:12pt;">SPECIAL OFFER RATE</td>
        <td class="right bold" style="font-size:13pt;">${fmt(grandOffer)}</td>
      </tr>
    </table>

    ${notes ? `<div class="note-block" style="margin-bottom:10px; padding:6px 10px; border:1px solid #e2e8f0; border-radius:3px; background:#fafbfc;">
      <p class="note-title" style="margin-bottom:4px;">PROJECT NOTES</p>
      <p style="white-space:pre-wrap;">${notes}</p>
    </div>` : ''}

    <div class="note-block">
      <p class="note-title">NOTE</p>
      <p>1. All rate for${brand} are as per current MRP. </p>
      <p>2. Company -${brand} and other Company ,can revise MRP without  notice.</p>
      <p>3. Please confirm order with 100 % advance for CP items.</p>
      <p>4. Quote remains valid till company MRP remains unchanged. Force majure,w.r.t TAX,MRP,</p>
      <p>5. For items with escalated MRP, confirm order with 100 % payments, prior to cut off time line.</p>
      <p>6. Delivery as per company schedule. Freight extra  as per actual.</p>
      <p class="bold">7. RATE VALID FOR THIS MONTH</p>
      <p style="margin-top:6px;">Hope all details submitted are as per your requirements. Please call or mail for any alteration or clarifications.</p>
    </div>

    <div class="regards-block">
      <p>Regards,</p>
      <p><strong>Buildcon House</strong></p>
      <p>MO : +91 9909906652</p>
      <p>MAIL : buildconhouse10@gmail.com</p>
    </div>

    <table style="margin-top:8px; width:auto;" class="toll-table">
      <tr><td colspan="2" class="gold bold center" style="font-size:9pt;">TOLL FREE NUMBER</td></tr>
      <tr><td>GEBERIT</td><td>18001024323</td></tr>
      <tr><td>GROHE</td><td>18001024475</td></tr>
      <tr><td>HANSGROHE</td><td>18002093246</td></tr>
      <tr><td>VITRA</td><td>70451 32132</td></tr>
      <tr><td>OYSTER</td><td>18001208999</td></tr>
    </table>
  `
}

function sectionDetailPage(
  section: SectionData,
  baseUrl: string,
): string {
  const sumOfferRates = section.items.reduce(
    (s, i) => s + i.unitPrice * (1 - i.discount / 100),
    0,
  )

  const rows = section.items.map((item, idx) => {
    const offerRate  = item.unitPrice * (1 - item.discount / 100)
    const mrpTotal   = item.unitPrice * item.qty
    const offerTotal = offerRate * item.qty
    const imgCell = `<img src="${pdfImageSrc(item.imageUrl, baseUrl, item.brand ?? '')}" class="detail-img" alt="${item.productName}" />`
    return `
      <tr>
        <td class="center" style="width:28px;">${idx + 1}</td>
        <td class="center" style="width:65px; font-size:8pt;">${(item.articleNumber ?? item.sku) || item.sku}</td>
        <td style="font-size:8.5pt;">${item.productName}</td>
        <td class="center" style="width:78px;">${imgCell}</td>
        <td class="right" style="width:65px;">₹ ${fmtUnit(item.unitPrice)}</td>
        <td class="center" style="width:28px;">${item.qty}</td>
        <td class="right" style="width:80px;">₹ ${fmtN(mrpTotal)}</td>
        <td class="right" style="width:72px;">₹ ${fmtUnit(offerRate)}</td>
        <td class="right" style="width:80px;">₹ ${fmtN(offerTotal)}</td>
      </tr>`
  }).join('')

  return `
    <div class="page-break">
      <table>
        <tr><td colspan="9" class="gold bold" style="font-size:11pt; padding:5px 8px;">${section.name.toUpperCase()}</td></tr>
        <tr>
          <th class="col-hdr" style="font-size:8pt;">Sr.<br>No.</th>
          <th class="col-hdr" style="font-size:8pt;">Article<br>No.</th>
          <th class="col-hdr" style="font-size:8pt;">Product Discription</th>
          <th class="col-hdr" style="font-size:8pt;">Product Image</th>
          <th class="col-hdr" style="font-size:8pt;">MRP</th>
          <th class="col-hdr" style="font-size:8pt;">QTY</th>
          <th class="col-hdr" style="font-size:8pt;">MRP TOTAL</th>
          <th class="col-hdr" style="font-size:8pt;">OFFER RATE</th>
          <th class="col-hdr" style="font-size:8pt;">TOTAL</th>
        </tr>
        ${rows}
        <tr class="detail-total">
          <td colspan="4" class="center bold" style="font-size:10pt;">TOTAL</td>
          <td></td>
          <td class="center bold">${section.totalQty}</td>
          <td class="right bold">₹ ${fmtN(section.mrpTotal)}</td>
          <td class="right bold">₹ ${fmtUnit(sumOfferRates)}</td>
          <td class="right bold">₹ ${fmtN(section.offerTotal)}</td>
        </tr>
      </table>
    </div>`
}

/**
 * Generates the Buildcon House quotation HTML.
 *
 * Section naming convention (Gap 6):
 *   item.section must match how rooms appear in the original — e.g. "BATHROOM 1,2"
 *   groups two bathrooms into one printed section. Each unique section value becomes
 *   one row in the cover summary and one detail page. Enter section names in the POS
 *   room panel exactly as they should appear (ALL CAPS, e.g. "BATHROOM 1,2", "KITCHEN").
 *
 * @param data      Quotation data — customerPhone and createdBy are required for parity.
 * @param baseUrl   Override the asset base URL (used server-side; defaults to window.origin).
 */
export function generateQuotationPrintHTML(data: PrintData, baseUrl?: string): string {
  const resolvedBaseUrl = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const sections   = groupBySection(data.lineItems)
  const grandMrp   = sections.reduce((s, sec) => s + sec.mrpTotal,  0)
  const grandOffer = sections.reduce((s, sec) => s + sec.offerTotal, 0)
  const brand      = deriveBrand(data.lineItems)

  const cover   = coverPage(data, sections, grandMrp, grandOffer, brand, resolvedBaseUrl)
  const details = sections.map(s => sectionDetailPage(s, resolvedBaseUrl)).join('')

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
</body>
</html>`
}
