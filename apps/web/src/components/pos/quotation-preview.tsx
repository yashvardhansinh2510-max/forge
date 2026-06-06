'use client'

import * as React from 'react'
import { X, Printer, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Room, ActiveProject } from '@/lib/pos-store'
import { skuWithFinish, unitMRP, productImageDataUri } from '@/lib/mock/pos-data'
import { ProductVisual } from './product-visual'
import { generateQuotationPrintHTML } from '@/lib/quotation-print'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Print styles ─────────────────────────────────────────────────────────────

const PRINT_CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 10.5px; color: #111; background: #fff; }
  .quotation { max-width: 940px; margin: 0 auto; padding: 20px 24px; }

  /* ── Letterhead ─────────────────────────────────────────── */
  .lh-wrap {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 12px; margin-bottom: 12px;
    border-bottom: 3px solid #003087;
  }
  .lh-logo-mark {
    width: 46px; height: 46px; border-radius: 8px;
    background: linear-gradient(135deg,#003087,#0057D9);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900; color: #fff;
    flex-shrink: 0; margin-right: 12px;
  }
  .lh-brand { font-size: 21px; font-weight: 800; color: #003087; letter-spacing: -0.02em; line-height: 1; }
  .lh-brand span { color: #0057D9; }
  .lh-tagline { font-size: 9px; color: #64748b; margin-top: 3px; letter-spacing: 0.02em; }
  .lh-brands { font-size: 8.5px; color: #475569; margin-top: 2px; }
  .lh-address { font-size: 8.5px; color: #64748b; margin-top: 4px; line-height: 1.5; }
  .lh-right { text-align: right; }
  .lh-doc-title { font-size: 20px; font-weight: 800; color: #003087; letter-spacing: 0.08em; line-height: 1; }
  .lh-doc-no { font-size: 9.5px; color: #475569; margin-top: 4px; }
  .lh-doc-no strong { color: #111; }
  .lh-validity { font-size: 8.5px; color: #94a3b8; margin-top: 2px; }

  /* ── Salutation ─────────────────────────────────────────── */
  .salutation {
    background: #f0f6ff; border-left: 3px solid #003087;
    padding: 8px 12px; margin-bottom: 12px; font-size: 10px; color: #374151; line-height: 1.5;
  }

  /* ── Client meta ────────────────────────────────────────── */
  .meta-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4px 20px; margin-bottom: 14px;
    border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px;
    background: #fafbfc;
  }
  .meta-row { display: flex; gap: 6px; align-items: baseline; }
  .meta-lbl { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; min-width: 64px; flex-shrink: 0; }
  .meta-val { font-size: 10px; color: #111; font-weight: 500; }
  .meta-val.accent { color: #16a34a; font-weight: 700; }

  /* ── Summary table ──────────────────────────────────────── */
  .summary-head { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #003087; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #003087; color: #fff;
    padding: 6px 8px; font-size: 8.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  td { padding: 5px 8px; border-bottom: 1px solid #e9edf2; font-size: 10px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sum-total td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1; }
  .sum-offer td { font-weight: 800; font-size: 11px; background: #003087 !important; color: #fff; }

  /* ── Room section ───────────────────────────────────────── */
  .room-section { margin-bottom: 22px; }
  .room-title {
    background: #1a3a5c; color: #fff;
    padding: 7px 10px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    display: flex; justify-content: space-between; align-items: center;
  }
  .room-subtitle { font-size: 8.5px; color: #94a3b8; font-weight: 400; text-transform: none; letter-spacing: 0; }

  /* detail table */
  .dt th { background: #1a3a5c; font-size: 8px; padding: 5px 7px; }
  .dt td { padding: 5px 7px; font-size: 9.5px; vertical-align: middle; }
  .dt td.sku { font-size: 8px; color: #64748b; font-family: 'Courier New', monospace; white-space: nowrap; }
  .dt td.pname { font-weight: 600; font-size: 9.5px; line-height: 1.3; }
  .dt td.pname small { display: block; font-weight: 400; color: #64748b; font-size: 8px; margin-top: 1px; }
  .dt td.img-cell { padding: 3px 7px; }
  .prod-img {
    width: 36px; height: 36px; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .disc-val { color: #16a34a; font-weight: 700; }
  .bundled-banner td {
    background: #fffbeb !important;
    font-size: 8px; font-weight: 600; color: #92400e;
    font-style: italic; padding: 3px 7px;
    border-top: 1px dashed #fcd34d;
  }
  .dt .dim td { color: #94a3b8; font-size: 9px; }
  .room-total td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1; }

  /* ── Grand totals ───────────────────────────────────────── */
  .totals-wrap { display: flex; justify-content: flex-end; margin: 14px 0 20px; }
  .totals-box { min-width: 280px; border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; }
  .totals-box td { padding: 5px 14px; font-size: 10px; border-bottom: 1px solid #eef2f7; }
  .totals-box tr:last-child td { border-bottom: none; }
  .totals-box .tl { color: #555; }
  .totals-box .tv { text-align: right; font-variant-numeric: tabular-nums; }
  .totals-box .disc-row .tl { color: #16a34a; }
  .totals-box .disc-row .tv { color: #16a34a; font-weight: 700; }
  .totals-box .sub-row td { font-weight: 600; background: #f8fafc; }
  .totals-box .gst-row td { font-size: 9px; color: #64748b; }
  .totals-box .grand-row td { font-weight: 800; font-size: 12px; background: #003087; color: #fff; border-top: 2px solid #001f5b; }

  /* ── Project notes ──────────────────────────────────────────── */
  .notes-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; background: #fafbfc; }
  .notes-box h4 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; margin-bottom: 6px; }
  .notes-box p { font-size: 10px; color: #374151; line-height: 1.55; white-space: pre-wrap; }

  /* ── Terms ──────────────────────────────────────────────── */
  .terms-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .terms-box h4 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; margin-bottom: 7px; }
  .terms-box ul { padding-left: 14px; list-style: disc; }
  .terms-box li { margin-bottom: 3px; font-size: 9px; color: #374151; line-height: 1.5; }

  /* ── Toll-free ──────────────────────────────────────────── */
  .toll { display: flex; gap: 20px; flex-wrap: wrap; font-size: 8.5px; color: #555; margin-bottom: 14px; }
  .toll strong { color: #111; }

  /* ── Footer sig ─────────────────────────────────────────── */
  .sig-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
  .sig-box { text-align: center; font-size: 9px; color: #555; }
  .sig-box .sig-line { width: 140px; border-top: 1px solid #111; margin: 30px auto 4px; }
  .sig-box .sig-name { font-weight: 700; color: #111; font-size: 10px; }
  .footer-note { text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #888; }
`

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  project: ActiveProject
  rooms: Room[]
  onClose: () => void
  /** DB-assigned quotation number, passed in once the quotation is saved. */
  quotationNumber?: string
  /** True when quotation has not been saved yet — shows warning banner */
  isDraft?: boolean
}

export function QuotationPreview({ project, rooms, onClose, quotationNumber: savedNumber, isDraft = false }: Props) {
  const printRef = React.useRef<HTMLDivElement>(null)
  // Use the DB number if available; otherwise show a placeholder (save first)
  const quotationNumber = savedNumber ?? `DRAFT-${new Date().getFullYear()}`
  const [quotationDate] = React.useState(() => today())

  const discount           = project.globalDiscount
  const roomTotals = rooms.map((room) => {
    let mrpTotal = 0, offerTotal = 0
    for (const item of room.items) {
      const unitPrice = unitMRP(item.product, item.finish)
      mrpTotal  += unitPrice * item.quantity
      const effectiveDiscount = Math.max(discount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
      offerTotal += unitPrice * item.quantity * (1 - effectiveDiscount / 100)
    }
    return { room, mrpTotal, offerTotal }
  })

  const filledRooms   = roomTotals.filter((r) => r.room.items.length > 0)
  const grandMRP      = filledRooms.reduce((s, r) => s + r.mrpTotal, 0)
  const grandOffer    = filledRooms.reduce((s, r) => s + r.offerTotal, 0)
  const totalDiscount = grandMRP - grandOffer
  const cgst          = grandOffer * 0.14
  const sgst          = grandOffer * 0.14
  const grandTotal    = grandOffer + cgst + sgst

  // Validity: 30 days from today
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 30)
  const validUntilStr = validUntil.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  async function handlePrint() {
    // Gap 2: client phone required (maps to NUM field in PDF)
    if (!project.clientPhone.trim()) {
      toast.error('Client phone number is required before generating the PDF')
      return
    }
    // Gap 3: reference person required (maps to REF field in PDF)
    if (!project.referenceBy.trim()) {
      toast.error('Reference person is required before generating the PDF')
      return
    }

    // Convert POS rooms → LineItems in Buildcon format
    const lineItems = rooms.flatMap((room) =>
      room.items.map((item) => {
        // Rate-only custom items (no MRP, discount=0) must not have global/room discount applied —
        // the stored unitPrice IS the final rate with no further reduction.
        const isRateOnly = (item.product.isCustom ?? false) && item.itemDiscount === 0
        const effectiveDiscount = isRateOnly
          ? 0
          : Math.max(project.globalDiscount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
        // Resolve image: finish-specific → base imageUrl → SVG data URI placeholder.
        // Puppeteer runs in about:blank context, so relative paths must be absolutified.
        const rawImage =
          item.product.finishImages?.[item.finish.code] ??
          item.product.imageUrl ??
          null
        const resolvedImage = rawImage
          ? (rawImage.startsWith('/') ? `${window.location.origin}${rawImage}` : rawImage)
          : productImageDataUri(item.product, item.finish)
        return {
          id:            item.id,
          productId:     item.product.id,
          productName:   item.product.name,
          sku:           item.product.sku,
          articleNumber: item.product.articleNumber,
          finishName:    item.finish.name || undefined,
          brand:         item.product.brand,
          description:   item.product.description ?? '',
          unit:          item.product.unit,
          qty:           item.quantity,
          unitPrice:     unitMRP(item.product, item.finish),
          discount:      effectiveDiscount,
          gstRate:       item.product.gstRate,
          section:       room.name,
          imageUrl:      resolvedImage,
          isCustom:      item.product.isCustom ?? false,
        }
      })
    )

    const html = generateQuotationPrintHTML({
      number:        quotationNumber,
      customerName:  project.clientName || 'Valued Customer',
      customerPhone: project.clientPhone.trim(),
      createdBy:     project.referenceBy.trim(),
      createdAt:     new Date(),
      lineItems,
      projectNotes:  project.notes?.trim() || undefined,
    })

    // Gap 1: server-side PDF — no browser print chrome
    try {
      const res = await fetch('/api/quotations/pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ html, filename: `${quotationNumber}.pdf` }),
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${quotationNumber}.pdf` })
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation failed — please try again')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Draft warning banner */}
      {isDraft && (
        <div
          className="no-print"
          style={{
            width: '100%', maxWidth: 980,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px',
            background: 'rgba(251,191,36,0.15)',
            borderBottom: '1px solid rgba(251,191,36,0.3)',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ color: '#92400e', fontSize: 12, fontWeight: 600 }}>
            Unsaved draft — this document has no quotation number.
          </span>
          <span style={{ color: '#b45309', fontSize: 11 }}>
            Close this preview, click <strong>Save</strong>, then return to print a numbered quotation.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div
        className="no-print"
        style={{
          width: '100%', maxWidth: 980,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: '#1e293b', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: isDraft ? '#fbbf24' : '#fff', fontSize: 13, fontWeight: 600 }}>
            {quotationNumber}
            {isDraft && <span style={{ color: '#f59e0b', marginLeft: 6, fontWeight: 400 }}>(draft)</span>}
          </span>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            {project.name ? `${project.name} · ` : ''}{project.clientName}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: isDraft ? '#d97706' : '#3b82f6',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            title={isDraft ? 'Warning: printing draft without quotation number' : 'Generate PDF'}
          >
            <Printer size={14} />
            {isDraft ? 'Print Draft (no QT#)' : 'Print / Save PDF'}
          </button>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, overflowY: 'auto', width: '100%', background: '#475569', padding: '24px 0' }}>
        <div
          ref={printRef}
          style={{ maxWidth: 980, margin: '0 auto', background: '#fff', boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
        >
          <style>{PRINT_CSS}</style>
          <div className="quotation">

            {/* ── Letterhead ─────────────────────────────────────────────────── */}
            <div className="lh-wrap">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                <div className="lh-logo-mark">B</div>
                <div>
                  <div className="lh-brand">Build<span>con</span> House</div>
                  <div className="lh-tagline">LUXURY SANITARYWARE &amp; BATH SOLUTIONS</div>
                  <div className="lh-brands">
                    Authorised Dealers: <strong>GROHE · AXOR · HANSGROHE · VITRA · GEBERIT · KAJARIA</strong>
                  </div>
                  <div className="lh-address">
                    Showroom &amp; Experience Centre, Andheri West, Mumbai 400 058<br />
                    GSTIN: 27AABCB1234F1ZX &nbsp;|&nbsp; +91 98200 12345 &nbsp;|&nbsp; buildconhouse@gmail.com
                  </div>
                </div>
              </div>
              <div className="lh-right">
                <div className="lh-doc-title">QUOTATION</div>
                <div className="lh-doc-no">No: <strong>{quotationNumber}</strong></div>
                <div className="lh-doc-no">Date: <strong>{quotationDate}</strong></div>
                <div className="lh-validity">Valid until: {validUntilStr}</div>
              </div>
            </div>

            {/* ── Salutation ─────────────────────────────────────────────────── */}
            <div className="salutation">
              Dear Sir / Ma&apos;am, &nbsp;thank you for your positive approach to our products.
              We are glad to offer you our best competitive pricing as per your requirement.
              Please find below our quotation for your kind consideration.
            </div>

            {/* ── Client Meta ────────────────────────────────────────────────── */}
            <div className="meta-grid">
              <div className="meta-row">
                <span className="meta-lbl">Client</span>
                <span className="meta-val" style={{ fontWeight: 700 }}>{project.clientName}</span>
              </div>
              <div className="meta-row">
                <span className="meta-lbl">Quotation Date</span>
                <span className="meta-val">{quotationDate}</span>
              </div>
              <div className="meta-row">
                <span className="meta-lbl">Project</span>
                <span className="meta-val" style={{ fontWeight: 600 }}>{project.name}</span>
              </div>
              <div className="meta-row">
                <span className="meta-lbl">Discount</span>
                <span className="meta-val accent">{discount}% on MRP (all items)</span>
              </div>
              <div className="meta-row">
                <span className="meta-lbl">Rooms</span>
                <span className="meta-val">{filledRooms.length} area{filledRooms.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="meta-row">
                <span className="meta-lbl">Valid Until</span>
                <span className="meta-val">{validUntilStr}</span>
              </div>
            </div>

            {/* ── Project Notes ─────────────────────────────────────────────── */}
            {project.notes && project.notes.trim() && (
              <div className="notes-box">
                <h4>Project Notes</h4>
                <p>{project.notes.trim()}</p>
              </div>
            )}

            {/* ── Summary Table ──────────────────────────────────────────────── */}
            {filledRooms.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div className="summary-head">Summary — Area-wise Totals</div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>Sl. No.</th>
                      <th>Area / Room</th>
                      <th style={{ width: 80 }}>Items</th>
                      <th className="r" style={{ width: 110 }}>MRP (₹)</th>
                      <th className="r" style={{ width: 130 }}>Offer Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledRooms.map(({ room, mrpTotal, offerTotal }, i) => (
                      <tr key={room.id}>
                        <td className="c">{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{room.name}</td>
                        <td className="c">{room.items.length}</td>
                        <td className="r">{fmtINR(mrpTotal)}</td>
                        <td className="r" style={{ fontWeight: 600, color: '#003087' }}>{fmtINR(offerTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="sum-total">
                      <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
                      <td className="r">{fmtINR(grandMRP)}</td>
                      <td className="r">{fmtINR(grandOffer)}</td>
                    </tr>
                    <tr className="sum-offer">
                      <td colSpan={3}>SPECIAL OFFER (EX-GST)</td>
                      <td colSpan={2} className="r" style={{ fontSize: 12 }}>{fmtINR(grandOffer)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {filledRooms.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 4, marginBottom: 18 }}>
                No items added yet. Add products to rooms to generate a quotation.
              </div>
            )}

            {/* ── Per-Room Detail Tables ─────────────────────────────────────── */}
            {filledRooms.map(({ room, offerTotal }, ri) => {
              const mainItems    = room.items.filter((i) => !i.isAutoAdded)
              const bundledItems = room.items.filter((i) => i.isAutoAdded)
              let srNo = 0

              return (
                <div key={room.id} className={`room-section${ri > 0 ? ' page-break' : ''}`}>
                  <div className="room-title">
                    <span>{room.name}</span>
                    <span className="room-subtitle">{room.items.length} item{room.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="dt">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>Sr.</th>
                        <th style={{ width: 42 }} className="c">Image</th>
                        <th style={{ width: 96 }}>Article No.</th>
                        <th>Product Description</th>
                        <th className="r" style={{ width: 78 }}>MRP (₹)</th>
                        <th className="c" style={{ width: 36 }}>Qty</th>
                        <th className="c" style={{ width: 46 }}>Disc%</th>
                        <th className="r" style={{ width: 84 }}>Offer Rate (₹)</th>
                        <th className="r" style={{ width: 90 }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainItems.map((item) => {
                        srNo++
                        const unitPrice = unitMRP(item.product, item.finish)
                        const effectiveDiscount = Math.max(discount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
                        const offerUnit = unitPrice * (1 - effectiveDiscount / 100)
                        const offerLine = offerUnit * item.quantity
                        return (
                          <tr key={item.id}>
                            <td className="c">{srNo}</td>
                            <td className="img-cell c">
                              <div className="prod-img" style={{ margin: '0 auto' }}>
                                <ProductVisual product={item.product} finish={item.finish} size={36} />
                              </div>
                            </td>
                            <td className="sku">{skuWithFinish(item.product, item.finish)}</td>
                            <td className="pname">
                              {item.product.name}
                              <small>
                                {item.finish.name !== '' ? `Finish: ${item.finish.name}` : ''}
                                {item.product.brand !== '' ? ` · ${item.product.brand}` : ''}
                              </small>
                            </td>
                            <td className="r">{fmtINR(unitPrice)}</td>
                            <td className="c">{item.quantity}</td>
                            <td className="c disc-val">{effectiveDiscount}%</td>
                            <td className="r">{fmtINR(offerUnit)}</td>
                            <td className="r" style={{ fontWeight: 600 }}>{fmtINR(offerLine)}</td>
                          </tr>
                        )
                      })}

                      {bundledItems.length > 0 && (
                        <>
                          <tr className="bundled-banner">
                            <td colSpan={9}>
                              ↪ Auto-bundled concealed parts — included in product pricing
                            </td>
                          </tr>
                          {bundledItems.map((item) => {
                            srNo++
                            const unitPrice = unitMRP(item.product, item.finish)
                            const effectiveDiscount = Math.max(discount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
                            const offerUnit = unitPrice * (1 - effectiveDiscount / 100)
                            const offerLine = offerUnit * item.quantity
                            return (
                              <tr key={item.id} className="dim">
                                <td className="c">{srNo}</td>
                                <td className="img-cell c">
                                  <div className="prod-img" style={{ margin: '0 auto' }}>
                                    <ProductVisual product={item.product} finish={item.finish} size={36} muted />
                                  </div>
                                </td>
                                <td className="sku">{skuWithFinish(item.product, item.finish)}</td>
                                <td className="pname">
                                  {item.product.name}
                                  <small>Concealed part (auto-bundled) · {item.product.brand}</small>
                                </td>
                                <td className="r">{fmtINR(unitPrice)}</td>
                                <td className="c">{item.quantity}</td>
                                <td className="c disc-val">{effectiveDiscount}%</td>
                                <td className="r">{fmtINR(offerUnit)}</td>
                                <td className="r" style={{ fontWeight: 600 }}>{fmtINR(offerLine)}</td>
                              </tr>
                            )
                          })}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="room-total">
                        <td colSpan={7} style={{ fontWeight: 700 }}>ROOM TOTAL — {room.name}</td>
                        <td />
                        <td className="r">{fmtINR(offerTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })}

            {/* ── Grand Totals + GST ─────────────────────────────────────────── */}
            {filledRooms.length > 0 && (
              <div className="totals-wrap">
                <table className="totals-box">
                  <tbody>
                    <tr>
                      <td className="tl">Total MRP (before discount)</td>
                      <td className="tv">{fmtINR(grandMRP)}</td>
                    </tr>
                    <tr className="disc-row">
                      <td className="tl">Discount (blended avg)</td>
                      <td className="tv">− {fmtINR(totalDiscount)}</td>
                    </tr>
                    <tr className="sub-row">
                      <td className="tl">Offer Price (ex-GST)</td>
                      <td className="tv">{fmtINR(grandOffer)}</td>
                    </tr>
                    <tr className="gst-row">
                      <td className="tl">CGST @ 14%</td>
                      <td className="tv">{fmtINR(cgst)}</td>
                    </tr>
                    <tr className="gst-row">
                      <td className="tl">SGST @ 14%</td>
                      <td className="tv">{fmtINR(sgst)}</td>
                    </tr>
                    <tr className="grand-row">
                      <td className="tl">GRAND TOTAL (incl. GST)</td>
                      <td className="tv">{fmtINR(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Terms & Conditions ─────────────────────────────────────────── */}
            <div className="terms-box">
              <h4>Terms &amp; Conditions</h4>
              <ul>
                <li>All prices are in Indian Rupees (₹). GST @ 28% applicable on accessories; 18% on sanitaryware &amp; fittings as per HSN rates.</li>
                <li>Quotation valid for 30 days from date of issue.</li>
                <li>Delivery: 4–6 weeks from order confirmation and advance receipt. Site delivery charged extra.</li>
                <li>Payment: 50% advance against order; balance before dispatch.</li>
                <li>Installation and civil work not included unless specified separately.</li>
                <li>MRP subject to revision by manufacturer without prior notice. This offer is based on current MRP.</li>
                <li>Force majeure clause applies for tax and MRP changes after order placement.</li>
                <li>Warranty as per respective brand policy. Buildcon House facilitates warranty claims.</li>
              </ul>
            </div>

            {/* ── Toll-Free ──────────────────────────────────────────────────── */}
            <div className="toll">
              <strong>Toll-Free:</strong>
              <span><strong>GROHE</strong> 1800-102-4475</span>
              <span><strong>HANSGROHE</strong> 1800-209-3246</span>
              <span><strong>VITRA</strong> 70451-32132</span>
              <span><strong>GEBERIT</strong> 1800-103-8538</span>
            </div>

            {/* ── Signature ──────────────────────────────────────────────────── */}
            <div className="sig-wrap">
              <div style={{ fontSize: 9, color: '#64748b', maxWidth: 260, lineHeight: 1.5 }}>
                Hope all details meet your requirement.<br />
                Please call or write for any clarifications.
              </div>
              <div className="sig-box">
                <div className="sig-line" />
                <div className="sig-name">For Buildcon House</div>
                <div>Authorised Signatory</div>
              </div>
            </div>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <div className="footer-note" style={{ marginTop: 14 }}>
              <strong>Buildcon House</strong> &nbsp;·&nbsp; Andheri West, Mumbai 400 058 &nbsp;·&nbsp;
              +91 98200 12345 &nbsp;·&nbsp; buildconhouse@gmail.com &nbsp;·&nbsp;
              GSTIN: 27AABCB1234F1ZX
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
