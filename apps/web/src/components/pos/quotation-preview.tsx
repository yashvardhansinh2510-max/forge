'use client'

import * as React from 'react'
import { X, Printer, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Room, ActiveProject } from '@/lib/pos-store'
import { SECTION_PALETTE } from '@/lib/product-image'
import type { BrandFulfilment, PurchaseLineItem, PurchaseOrder } from '@/lib/mock/purchases-data'
import { usePurchasesStore } from '@/lib/purchases-store'

const LOGO_GROHE     = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjE4IiBmaWxsPSIjMDBBM0UwIi8+CiAgPCEtLSBXYXZlIG1hcmsgLS0+CiAgPHBhdGggZD0iTTIyIDYyIFEzNCA1MiA0NiA2MiBRNTggNzIgNzAgNjIgUTc2IDU3IDc4IDU0IgogICAgICAgIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjM1KSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIEcgbGV0dGVyZm9ybSAtLT4KICA8cGF0aCBkPSJNNjMgNDAgUTU1IDMwIDQzIDMwIFEyOCAzMCAyOCA1MCBRMjggNzAgNDQgNzAgUTU1IDcwIDYyIDYyIEw2MiA1MiBMNDggNTIiCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg=='
const LOGO_HANSGROHE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjE4IiBmaWxsPSIjRTMwNjEzIi8+CiAgPCEtLSBIIGxldHRlcmZvcm0gLS0+CiAgPGxpbmUgeDE9IjI4IiB5MT0iMjgiIHgyPSIyOCIgeTI9IjcyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNzIiIHkyPSI3MiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8bGluZSB4MT0iMjgiIHkxPSI1MCIgeDI9IjcyIiB5Mj0iNTAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo='
const LOGO_AXOR      = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjE4IiBmaWxsPSIjMUExQTFBIi8+CiAgPCEtLSBBIGxldHRlcmZvcm0sIGNsZWFuIGdlb21ldHJpYyAtLT4KICA8cGF0aCBkPSJNNTAgMjQgTDcyIDc0IE01MCAyNCBMMjggNzQgTTM2IDU4IEw2NCA1OCIKICAgICAgICBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K'
const LOGO_GEBERIT   = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjE4IiBmaWxsPSIjMDAzMDg3Ii8+CiAgPCEtLSBHIGxldHRlcmZvcm0sIHJvdW5kZWQgLS0+CiAgPHBhdGggZD0iTTY2IDM2IFE1NiAyNCA0MiAyNCBRMjQgMjQgMjQgNTAgUTI0IDc2IDQyIDc2IFE1NiA3NiA2NCA2NiBMNjQgNTAgTDQ3IDUwIgogICAgICAgIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo='
const LOGO_VITRA     = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjE4IiBmaWxsPSIjMDA1QkFDIi8+CiAgPCEtLSBWIGxldHRlcmZvcm0gLS0+CiAgPHBhdGggZD0iTTI0IDI4IEw1MCA3NCBMNzYgMjgiCiAgICAgICAgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg=='

const BRAND_COLOR_MAP: Record<string, string> = {
  Grohe:      '#0057A8',
  Axor:       '#1a1a2e',
  Hansgrohe:  '#c41e3a',
  Vitra:      '#e63946',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function genQuotationNumber(): string {
  const y = new Date().getFullYear()
  const n = Math.floor(Math.random() * 9000) + 1000
  return `BCH-${y}-${n}`
}

// ─── Print styles ─────────────────────────────────────────────────────────────

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt;
    color: #000; background: #fff; -webkit-print-color-adjust: exact;
    print-color-adjust: exact; }
  @media print {
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }

  /* GOLD colour used throughout */
  .gold { background: #F2C50A !important; }

  /* ── COVER PAGE ─────────────────────────────── */

  .cover-header-box {
    border: 2px solid #555;
    padding: 10px 16px 8px;
    margin-bottom: 10px;
    text-align: center;
  }

  .buildcon-name {
    font-family: Arial Black, Arial, sans-serif;
    font-size: 28pt; font-weight: 900;
    letter-spacing: 4px; color: #1a1a1a;
    line-height: 1; display: inline-block;
  }
  .buildcon-dot { color: #F2C50A; }
  .buildcon-tagline {
    font-size: 10pt; font-style: italic;
    color: #444; margin-top: 2px; display: block;
  }

  .brand-row-1, .brand-row-2 {
    display: flex; align-items: center;
    justify-content: space-around;
    gap: 8px; padding: 6px 0;
    border-top: 1px solid #ccc;
    margin-top: 6px;
  }
  .brand-logo { height: 24px; width: auto; object-fit: contain; }

  .r2-oyster  { font-family: Arial Black,Arial,sans-serif; font-size:13pt;
    font-weight:900; color:#CC0000; letter-spacing:0.5px; }
  .r2-qutone  { font-family: Arial Black,Arial,sans-serif; font-size:13pt;
    font-weight:900; color:#E87722; letter-spacing:0.5px; }
  .r2-nexion  { font-family: Arial Black,Arial,sans-serif; font-size:11pt;
    font-weight:900; color:#333333; letter-spacing:0.3px; }
  .r2-dimore  { font-family: Arial Black,Arial,sans-serif; font-size:11pt;
    font-weight:900; color:#00609C; letter-spacing:0.5px; }
  .r2-ittimi  { font-family: Arial Black,Arial,sans-serif; font-size:11pt;
    font-weight:900; color:#5A3E28; letter-spacing:0.5px; }

  .sub-heading {
    background: #F2C50A; text-align: center;
    font-size: 12pt; font-weight: bold;
    padding: 4px 0; margin: 8px 0 4px;
    text-decoration: underline;
  }

  .intro-text {
    text-align: center; font-weight: bold;
    font-size: 10pt; margin-bottom: 8px;
    line-height: 1.5;
  }

  table.info-table { width: 100%; border-collapse: collapse;
    margin-bottom: 10px; }
  table.info-table td {
    border: 1px solid #555; padding: 5px 10px;
    font-size: 11pt; vertical-align: middle;
  }
  table.info-table td.info-label {
    font-weight: bold; width: 100px;
    background: #fff; border-right: 1px solid #555;
  }
  table.info-table td.info-value {
    font-weight: bold; font-size: 12pt;
    text-align: center; color: #000;
  }

  .brand-section-header {
    background: #F2C50A; text-align: center;
    font-size: 13pt; font-weight: bold;
    padding: 5px; width: 100%;
    border: 1px solid #555;
  }

  table.summary-table { width: 100%; border-collapse: collapse;
    margin-bottom: 10px; }
  table.summary-table th {
    background: #F2C50A; border: 1px solid #555;
    font-size: 10pt; font-weight: bold;
    padding: 5px 8px; text-align: center;
  }
  table.summary-table td {
    border: 1px solid #555; padding: 5px 10px;
    font-size: 11pt; font-weight: bold;
    text-align: center; vertical-align: middle;
  }
  table.summary-table .total-row td {
    background: #F2C50A; font-size: 13pt;
    font-weight: bold; text-align: center;
  }
  table.summary-table .offer-row td {
    background: #F2C50A; font-size: 14pt;
    font-weight: bold; text-align: center; padding: 8px;
  }

  .note-block { margin-top: 12px; font-size: 9pt; line-height: 1.8; }
  .note-block .note-title { font-weight: bold; }
  .note-block .note-7 { font-weight: bold; }

  .regards { font-size: 9.5pt; line-height: 1.8; margin-top: 8px; }

  table.toll-table { width: 220px; border-collapse: collapse;
    margin-top: 10px; }
  table.toll-table th {
    background: #F2C50A; border: 1px solid #555;
    font-size: 9pt; font-weight: bold;
    padding: 4px 8px; text-align: center;
  }
  table.toll-table td {
    border: 1px solid #555; padding: 3px 8px;
    font-size: 9pt; vertical-align: middle;
  }

  /* ── DETAIL PAGES ───────────────────────────── */
  .page-break { page-break-before: always; }

  .section-header {
    font-weight: bold;
    font-size: 13pt; padding: 7px 10px;
    margin-bottom: 0; border: 1px solid #444;
    border-bottom: none; letter-spacing: 0.03em;
  }

  table.detail-table {
    width: 100%; border-collapse: collapse;
    table-layout: fixed;
  }
  table.detail-table th {
    background: #F2C50A; border: 1px solid #555;
    font-size: 8.5pt; font-weight: bold;
    padding: 5px 4px; text-align: center;
    vertical-align: middle;
  }
  table.detail-table td {
    border: 1px solid #555; padding: 4px 5px;
    font-size: 9pt; vertical-align: middle;
    text-align: center;
  }
  table.detail-table td.desc {
    text-align: center; font-size: 8.5pt;
    line-height: 1.35;
  }
  table.detail-table .total-row td {
    background: #F2C50A; font-weight: bold;
    font-size: 10pt; text-align: center;
    padding: 5px;
  }
  .prod-img-cell { padding: 3px !important; }
  .prod-img {
    width: 56px; height: 48px;
    object-fit: contain; display: block; margin: auto;
  }
  .prod-img-placeholder {
    width: 56px; height: 48px;
    background: #F5F5F5; border-radius: 3px;
    display: flex; align-items: center; justify-content: center;
    font-size: 8pt; color: #aaa; margin: auto;
  }
`

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  project: ActiveProject
  rooms: Room[]
  onClose: () => void
}

export function QuotationPreview({ project, rooms, onClose }: Props) {
  const printRef = React.useRef<HTMLDivElement>(null)
  const [quotationNumber] = React.useState(() => genQuotationNumber())
  const [poCreated, setPOCreated] = React.useState(false)
  const router   = useRouter()
  const addOrder = usePurchasesStore((s) => s.addOrder)

  function handleCreatePO() {
    const brandMap = new Map<string, PurchaseLineItem[]>()
    for (const { room } of filledRooms) {
      for (const item of room.items) {
        if (!brandMap.has(item.product.brand)) brandMap.set(item.product.brand, [])
        brandMap.get(item.product.brand)!.push({
          id:           `${item.id}-li`,
          productId:    item.product.id,
          productName:  item.product.name,
          sku:          item.product.sku,
          brand:        item.product.brand,
          finishName:   item.finish.name,
          finishColor:  '',
          quantity:     item.quantity,
          unitMRP:      item.product.mrp + item.finish.priceAdj,
          itemDiscount: Math.max(item.itemDiscount ?? 0, discount),
          unit:         'pcs',
        })
      }
    }

    const brands: BrandFulfilment[] = Array.from(brandMap.entries()).map(([brand, items]) => ({
      brand,
      brandColor:           BRAND_COLOR_MAP[brand] ?? '#64748b',
      items,
      stage:                'pending',
      poNumber:             null,
      vendorOrderRef:       null,
      expectedDeliveryDate: null,
      receivedQty:          0,
      shippedToClientQty:   0,
      notes:                '',
    }))

    const po: PurchaseOrder = {
      id:             `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      quotationRef:   quotationNumber,
      status:         'draft',
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      client: {
        name:       project.clientName || 'Unknown Client',
        phone:      '',
        email:      '',
        address:    '',
        city:       'Mumbai',
        gstNumber:  '',
      },
      referenceBy:    project.referenceBy,
      globalDiscount: discount,
      brands,
      internalNotes:  '',
    }

    addOrder(po)
    setPOCreated(true)
    toast.success('Purchase order created', {
      description: `${quotationNumber} → PO added to Purchases`,
      action: {
        label: 'View Purchases',
        onClick: () => { onClose(); router.push('/purchases') },
      },
    })
  }

  const discount           = project.globalDiscount
  const discountMultiplier = 1 - discount / 100

  const roomTotals = rooms.map((room) => {
    let mrpTotal = 0, offerTotal = 0
    for (const item of room.items) {
      const unitMRP = item.product.mrp + item.finish.priceAdj
      mrpTotal  += unitMRP * item.quantity
      offerTotal += unitMRP * item.quantity * discountMultiplier
    }
    return { room, mrpTotal, offerTotal }
  })

  const filledRooms = roomTotals.filter((r) => r.room.items.length > 0)
  const grandMRP    = filledRooms.reduce((s, r) => s + r.mrpTotal, 0)
  const grandOffer  = filledRooms.reduce((s, r) => s + r.offerTotal, 0)

  const primaryBrand: string = (() => {
    const brands = new Set(
      rooms.flatMap(r => r.items.map(i => i.product.brand.toUpperCase()))
    )
    if (brands.has('GROHE'))     return 'GROHE'
    if (brands.has('AXOR'))      return 'AXOR'
    if (brands.has('HANSGROHE')) return 'HANSGROHE'
    if (brands.has('VITRA'))     return 'VITRA'
    if (brands.has('GEBERIT'))   return 'GEBERIT'
    return 'BUILDCON HOUSE'
  })()

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(/\//g, '-')

  function handlePrint() {
    const w = window.open('', '_blank', 'width=1040,height=860')
    if (!w) return
    const html = printRef.current?.innerHTML ?? ''
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8">` +
      `<title>Quotation – ${project.clientName || 'Buildcon House'}</title>` +
      `<style>${PRINT_CSS}</style></head><body>${html}</body></html>`
    )
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 500)
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
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {quotationNumber}
          </span>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            {project.clientName}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
          <button
            onClick={handleCreatePO}
            disabled={poCreated || filledRooms.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: poCreated ? '#16a34a' : '#1d4ed8',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: poCreated || filledRooms.length === 0 ? 'default' : 'pointer',
              opacity: filledRooms.length === 0 ? 0.5 : 1,
            }}
          >
            {poCreated ? <Check size={14} /> : null}
            {poCreated ? 'PO Created' : 'Create Purchase Order'}
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
          style={{ maxWidth: 800, margin: '0 auto', background: '#fff', boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
        >
          <style>{PRINT_CSS}</style>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '12px 16px' }}>

            {/* ═══════════════════════════════════════════════ */}
            {/* COVER PAGE                                      */}
            {/* ═══════════════════════════════════════════════ */}

            {/* 1. BUILDCON HOUSE header box with brand logos */}
            <div className="cover-header-box">
              <div>
                <span className="buildcon-name">
                  BUILDC<span className="buildcon-dot">●</span>N
                </span>
                <br />
                <span className="buildcon-name" style={{ fontSize: '20pt', letterSpacing: '8px' }}>
                  HOUSE
                </span>
                <span className="buildcon-tagline">Let you live better</span>
              </div>

              {/* Brand logo row 1 — SVG files embedded as base64 */}
              <div className="brand-row-1">
                <img src={LOGO_GROHE}     className="brand-logo" alt="GROHE"     style={{ height: 26 }} />
                <img src={LOGO_HANSGROHE} className="brand-logo" alt="hansgrohe" style={{ height: 20 }} />
                <img src={LOGO_AXOR}      className="brand-logo" alt="AXOR"      style={{ height: 20 }} />
                <img src={LOGO_GEBERIT}   className="brand-logo" alt="GEBERIT"   style={{ height: 20 }} />
                <img src={LOGO_VITRA}     className="brand-logo" alt="VitrA"     style={{ height: 22 }} />
              </div>

              {/* Brand logo row 2 — styled text */}
              <div className="brand-row-2">
                <span className="r2-oyster">Oyster<sup style={{ fontSize: '7pt' }}>®</sup></span>
                <span className="r2-qutone">QUTONE</span>
                <span className="r2-nexion">✗ Nexion</span>
                <span className="r2-dimore">DIMORE</span>
                <span className="r2-ittimi">ittimi</span>
              </div>
            </div>

            {/* 2. SUB: Quotation */}
            <div className="sub-heading">SUB: Quotation</div>

            {/* 3. Intro text */}
            <div className="intro-text">
              Dear sir thanks you for positive approach to our products. We are glad to give you our
              <br />best competitive rate, as per your requirement.
            </div>

            {/* 4. Info table — NAME / DATE / NUM / REF */}
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="info-label">NAME :</td>
                  <td className="info-value">{project.clientName || '—'}</td>
                </tr>
                <tr>
                  <td className="info-label">DATE :</td>
                  <td className="info-value">{formattedDate}</td>
                </tr>
                <tr>
                  <td className="info-label">NUM :</td>
                  <td className="info-value">{project.clientPhone || '—'}</td>
                </tr>
                <tr>
                  <td className="info-label">REF :</td>
                  <td className="info-value">{project.referenceBy || '—'}</td>
                </tr>
              </tbody>
            </table>

            {/* 5 & 6. Brand header + Summary table */}
            {filledRooms.length > 0 && (
              <>
                <div className="brand-section-header">{primaryBrand}</div>

                <table className="summary-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>SL.</th>
                      <th>BATHROOM / AREA</th>
                      <th style={{ width: 150 }}>MRP TOTAL</th>
                      <th style={{ width: 150 }}>SPECIAL OFFER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledRooms.map(({ room, mrpTotal, offerTotal }, i) => (
                      <tr key={room.id}>
                        <td>{i + 1}</td>
                        <td style={{ textAlign: 'left' }}>{room.name}</td>
                        <td style={{ textAlign: 'right' }}>{fmtINR(mrpTotal)}</td>
                        <td style={{ textAlign: 'right', color: '#1B4F8A', fontWeight: 700 }}>{fmtINR(offerTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={2}>TOTAL</td>
                      <td>{fmtINR(grandMRP)}</td>
                      <td>{fmtINR(grandOffer)}</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {/* 7. NOTE block */}
            <div className="note-block">
              <span className="note-title">NOTE</span>
              <ol style={{ paddingLeft: 16, marginTop: 4 }}>
                <li>All rate for {primaryBrand} are as per current MRP.</li>
                <li>Company - {primaryBrand} and other Company, can revise MRP without notice.</li>
                <li>Please confirm order with 100 % advance for CP items.</li>
                <li>Quote remains valid till company MRP remains unchanged. Force majure, w.r.t TAX, MRP,</li>
                <li>For items with escalated MRP, confirm order with 100 % payments, prior to cut off time line.</li>
                <li>Delivery as per company schedule. Freight extra as per actual.</li>
                <li className="note-7">RATE VALID FOR THIS MONTH</li>
              </ol>
              <div style={{ marginTop: 6, fontSize: '9pt' }}>
                Hope all details submitted are as per your requirements.
                Please call or mail for any alteration or clarifications.
              </div>
            </div>

            {/* 8. Regards */}
            <div className="regards" style={{ marginTop: 10 }}>
              <div>Regards,</div>
              <div style={{ fontWeight: 'bold' }}>Buildcon House</div>
              <div>MO : +91 9909906652</div>
              <div>MAIL : buildconhouse10@gmail.com</div>
            </div>

            {/* 9. Toll free table */}
            <table className="toll-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th colSpan={2}>TOLL FREE NUMBER</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: 'bold' }}>GEBERIT</td><td>18001024323</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>GROHE</td><td>18001024475</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>HANSGROHE</td><td>18001024475</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>VITRA</td><td>70451 32132</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>OYSTER</td><td>18001208999</td></tr>
              </tbody>
            </table>

            {/* ═══════════════════════════════════════════════ */}
            {/* DETAIL PAGES — one per room                    */}
            {/* ═══════════════════════════════════════════════ */}

            {filledRooms.map(({ room }, roomIdx) => {
              const mainItems = room.items.filter(i => !i.isAutoAdded)
              const sectionColor = SECTION_PALETTE[roomIdx % SECTION_PALETTE.length]

              const roomMRPTotal = mainItems.reduce((s, i) =>
                s + (i.product.mrp + i.finish.priceAdj) * i.quantity, 0)
              const roomQtyTotal = mainItems.reduce((s, i) => s + i.quantity, 0)
              const roomOfferRateSum = mainItems.reduce((s, i) => {
                const unitMRP = i.product.mrp + i.finish.priceAdj
                return s + (unitMRP * discountMultiplier)
              }, 0)
              const roomTotalOffer = mainItems.reduce((s, i) => {
                const unitMRP = i.product.mrp + i.finish.priceAdj
                return s + (unitMRP * discountMultiplier * i.quantity)
              }, 0)

              return (
                <div key={room.id} className="page-break">

                  <div
                    className="section-header"
                    style={{ background: sectionColor, color: '#fff' }}
                  >
                    {room.name}
                  </div>

                  <table className="detail-table">
                    <colgroup>
                      <col style={{ width: '5%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '5%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Sr.<br />No.</th>
                        <th>Article<br />No.</th>
                        <th>Product Discription</th>
                        <th>Product Image</th>
                        <th>MRP</th>
                        <th>QTY</th>
                        <th>MRP TOTAL</th>
                        <th>OFFER RATE</th>
                        <th>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainItems.map((item, idx) => {
                        const unitMRP      = item.product.mrp + item.finish.priceAdj
                        const mrpTotal     = unitMRP * item.quantity
                        const offerPerUnit = unitMRP * discountMultiplier
                        const lineTotal    = offerPerUnit * item.quantity

                        return (
                          <tr key={item.id}>
                            <td>{idx + 1}</td>
                            <td style={{ fontSize: '8pt' }}>
                              {item.product.articleNumber ?? item.product.sku}
                            </td>
                            <td className="desc">{item.product.name}</td>
                            <td className="prod-img-cell">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  className="prod-img"
                                  alt={item.product.name}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fb = e.currentTarget.nextElementSibling as HTMLElement
                                    if (fb) fb.style.display = 'block'
                                  }}
                                />
                              ) : null}
                              <div className="prod-img-placeholder" style={{ display: item.product.imageUrl ? 'none' : 'block' }} />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              ₹ {unitMRP.toLocaleString('en-IN')}
                            </td>
                            <td>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>
                              {fmtINR(mrpTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              ₹ {Math.round(offerPerUnit).toLocaleString('en-IN')}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {fmtINR(lineTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          TOTAL
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'center' }}>{roomQtyTotal}</td>
                        <td style={{ textAlign: 'right' }}>{fmtINR(roomMRPTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          ₹ {Math.round(roomOfferRateSum).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right' }}>{fmtINR(roomTotalOffer)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })}

          </div>
        </div>
      </div>
    </div>
  )
}


