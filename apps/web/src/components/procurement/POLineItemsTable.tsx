'use client'

// ─── POLineItemsTable ─────────────────────────────────────────────────────────
//
// SKU-first line items table for Purchase Order detail panels.
//
// Each row:
//   [img] | SKU (primary) + name (secondary) | Brand | Ordered | Received | Pending | Status
//
// Image fallback chain:
//   1. productImage field (if non-empty)
//   2. Brand coloured box with initials (BRAND_COLORS)
//   3. First 3 chars of SKU on neutral bg
//
// All data cells are inline-editable via <EditableCell>.
// Clicking the image thumbnail opens a product info modal.
// "+ Add Line Item" at the bottom opens a new blank row with SKU search.

import * as React from 'react'
import { Plus, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  BRAND_COLORS,
  LINE_STATUS_COLOR,
  type MockPOLineItem,
  type POLineStatus,
  type POStatus,
} from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import { EditableCell } from './EditableCell'

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_STATUS_OPTIONS: ReadonlyArray<{ value: POLineStatus; label: string }> = [
  { value: 'PENDING',             label: 'Pending'  },
  { value: 'PARTIALLY_RECEIVED',  label: 'Partial'  },
  { value: 'FULLY_RECEIVED',      label: 'Received' },
]

// ─── Image with fallback chain ─────────────────────────────────────────────────

function ProductThumb({
  image, brand, sku, size = 48, onClick,
}: {
  image: string
  brand: string
  sku: string
  size?: number
  onClick?: () => void
}) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const brandColor = BRAND_COLORS[brand.toUpperCase()] ?? '#6B7280'
  const initials   = sku.slice(0, 3).toUpperCase()

  const containerStyle: React.CSSProperties = {
    width: size, height: size, flexShrink: 0,
    borderRadius: 7, overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    border: '1px solid var(--border-subtle)',
  }

  if (image && !imgFailed) {
    return (
      <div style={containerStyle} onClick={onClick}>
        <img
          src={image}
          alt={sku}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  // Brand colour box with SKU initials
  return (
    <div
      onClick={onClick}
      title={`${sku} — click to view product`}
      style={{
        ...containerStyle,
        background: `${brandColor}16`,
        border: `1.5px solid ${brandColor}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{
        fontSize: size * 0.24, fontWeight: 800,
        color: brandColor, fontFamily: 'var(--font-ui)',
        letterSpacing: '0.02em', lineHeight: 1,
      }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Status badge renderer ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: POLineStatus }) {
  const sc = LINE_STATUS_COLOR[status]
  const dot: Record<POLineStatus, string> = {
    PENDING:            '#6B7280',
    PARTIALLY_RECEIVED: '#D97706',
    FULLY_RECEIVED:     '#16A34A',
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: sc.bg, color: sc.text,
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
      whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: dot[status], flexShrink: 0,
      }} />
      {LINE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
    </div>
  )
}

// ─── Product modal ────────────────────────────────────────────────────────────

function ProductModal({
  line, onClose,
}: {
  line: MockPOLineItem
  onClose: () => void
}) {
  const brandColor = BRAND_COLORS[line.productBrand.toUpperCase()] ?? '#6B7280'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--background)', borderRadius: 12,
          border: '1px solid var(--border)', padding: '24px',
          width: 360, display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', marginBottom: 2,
            }}>
              {line.productName}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {line.productSku}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Image */}
        <div style={{
          width: '100%', aspectRatio: '4/3', borderRadius: 8,
          background: `${brandColor}12`,
          border: `2px solid ${brandColor}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {line.productImage ? (
            <img
              src={line.productImage}
              alt={line.productSku}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
            />
          ) : (
            <span style={{
              fontSize: 40, fontWeight: 900, color: brandColor,
              fontFamily: 'var(--font-ui)', opacity: 0.5,
            }}>
              {line.productSku.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {[
            { label: 'Brand',    value: line.productBrand },
            { label: 'Status',   value: LINE_STATUS_OPTIONS.find((o) => o.value === line.status)?.label ?? line.status },
            { label: 'Ordered',  value: `${line.qtyOrdered} pcs` },
            { label: 'Received', value: `${line.qtyReceived} pcs` },
            ...(line.landingCost != null ? [{ label: 'Landing cost', value: `₹${line.landingCost.toLocaleString('en-IN')}` }] : []),
            ...(line.clientOfferRate != null ? [{ label: 'Offer rate', value: `₹${line.clientOfferRate.toLocaleString('en-IN')}` }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            height: 32, borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <ExternalLink size={11} />
          View in catalogue
        </button>
      </div>
    </div>
  )
}

// ─── Add line item row ────────────────────────────────────────────────────────

function AddLineRow({ poId, onDone }: { poId: string; onDone: () => void }) {
  const addLineItem = useProcurementStore((s) => s.addLineItem)
  const [sku, setSku] = React.useState('')

  function handleAdd() {
    const trimmed = sku.trim().toUpperCase()
    if (!trimmed) { onDone(); return }

    addLineItem(poId, {
      productId:           `new-${Date.now()}`,
      productName:         trimmed,
      productSku:          trimmed,
      productBrand:        '',
      productImage:        '',
      qtyOrdered:          1,
      qtyReceived:         0,
      landingCost:         null,
      clientOfferRate:     null,
      status:              'PENDING',
      customerAllocations: [],
      qtyPendingCo:        0,
      qtyPendingDist:      0,
      qtyAtGodown:         0,
      qtyInBox:            0,
      qtyDispatched:       0,
      qtyNotDisplayed:     0,
    })
    toast.success(`Line item ${trimmed} added`)
    onDone()
  }

  return (
    <tr>
      <td colSpan={7} style={{ padding: '8px 12px', borderTop: '1px dashed var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            autoFocus
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  handleAdd()
              if (e.key === 'Escape') onDone()
            }}
            placeholder="Type SKU code and press Enter…"
            style={{
              flex: 1, height: 28, padding: '0 8px',
              border: '1.5px solid var(--text-primary)', borderRadius: 6,
              background: 'var(--background)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              fontSize: 11, outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              height: 28, padding: '0 12px', borderRadius: 6,
              border: 'none', background: 'var(--text-primary)',
              color: 'var(--background)', fontFamily: 'var(--font-ui)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add
          </button>
          <button
            onClick={onDone}
            style={{
              height: 28, width: 28, borderRadius: 6,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Column header ────────────────────────────────────────────────────────────

function TH({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '6px 10px', textAlign: 'left',
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </th>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface POLineItemsTableProps {
  poId: string
  lineItems: MockPOLineItem[]
  /** When true all cells are display-only (e.g. for FULLY_RECEIVED POs) */
  readonly?: boolean
}

export function POLineItemsTable({ poId, lineItems, readonly = false }: POLineItemsTableProps) {
  const updateLineItem = useProcurementStore((s) => s.updateLineItem)
  const [modalLine,   setModalLine]   = React.useState<MockPOLineItem | null>(null)
  const [addingLine,  setAddingLine]  = React.useState(false)

  function save(lineId: string, patch: Parameters<typeof updateLineItem>[2]) {
    updateLineItem(poId, lineId, patch)
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 60 }} />
            <col style={{ width: 'auto' }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 112 }} />
          </colgroup>

          <thead>
            <tr>
              <TH style={{ paddingLeft: 16 }}>{/* img */}</TH>
              <TH>SKU / Product</TH>
              <TH>Brand</TH>
              <TH style={{ textAlign: 'center' }}>Ordered</TH>
              <TH style={{ textAlign: 'center' }}>Received</TH>
              <TH style={{ textAlign: 'center' }}>Pending</TH>
              <TH>Status</TH>
            </tr>
          </thead>

          <tbody>
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={7} style={{
                  padding: '32px 20px', textAlign: 'center',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 12,
                }}>
                  No line items yet
                </td>
              </tr>
            )}

            {lineItems.map((line, idx) => {
              const brandColor = BRAND_COLORS[line.productBrand.toUpperCase()] ?? '#6B7280'
              const pending    = Math.max(0, line.qtyOrdered - line.qtyReceived)
              const isEven     = idx % 2 === 0

              return (
                <tr
                  key={line.id}
                  style={{
                    background: isEven ? 'transparent' : 'var(--surface)',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* ── Image ── */}
                  <td style={{ padding: '10px 8px 10px 16px', verticalAlign: 'middle' }}>
                    <ProductThumb
                      image={line.productImage}
                      brand={line.productBrand}
                      sku={line.productSku}
                      size={44}
                      onClick={() => setModalLine(line)}
                    />
                  </td>

                  {/* ── SKU + product name ── */}
                  <td style={{ padding: '10px 8px', verticalAlign: 'middle', minWidth: 0 }}>
                    <EditableCell
                      type="text"
                      value={line.productSku}
                      onSave={(v) => save(line.id, { productSku: v })}
                      disabled={readonly}
                      displayStyle={{
                        fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-primary)', letterSpacing: '0.02em',
                      }}
                    />
                    <div style={{
                      fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                      marginTop: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {line.productName}
                    </div>
                  </td>

                  {/* ── Brand ── */}
                  <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: brandColor, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: brandColor, fontFamily: 'var(--font-ui)',
                        whiteSpace: 'nowrap',
                      }}>
                        {line.productBrand || '—'}
                      </span>
                    </div>
                  </td>

                  {/* ── Ordered ── */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <EditableCell
                      type="number"
                      value={line.qtyOrdered}
                      min={1}
                      onSave={(v) => save(line.id, { qtyOrdered: v })}
                      disabled={readonly}
                      style={{ justifyContent: 'center' }}
                    />
                  </td>

                  {/* ── Received ── */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <EditableCell
                      type="number"
                      value={line.qtyReceived}
                      min={0}
                      max={line.qtyOrdered}
                      onSave={(v) => save(line.id, { qtyReceived: v })}
                      disabled={readonly}
                      displayStyle={{ color: line.qtyReceived > 0 ? '#16A34A' : 'var(--text-muted)' }}
                      style={{ justifyContent: 'center' }}
                    />
                  </td>

                  {/* ── Pending (computed) ── */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                      fontSize: 12, fontWeight: 700,
                      color: pending > 0 ? '#D97706' : 'var(--text-muted)',
                    }}>
                      {pending}
                    </span>
                  </td>

                  {/* ── Status ── */}
                  <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                    <EditableCell
                      type="select"
                      value={line.status}
                      options={LINE_STATUS_OPTIONS}
                      onSave={(v) => save(line.id, { status: v as POLineStatus })}
                      disabled={readonly}
                      renderDisplay={(v) => <StatusBadge status={v as POLineStatus} />}
                    />
                  </td>
                </tr>
              )
            })}

            {/* Add line item row */}
            {addingLine && (
              <AddLineRow poId={poId} onDone={() => setAddingLine(false)} />
            )}
          </tbody>
        </table>
      </div>

      {/* Add line button */}
      {!readonly && !addingLine && (
        <button
          onClick={() => setAddingLine(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 16px', width: '100%',
            background: 'transparent', border: 'none',
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Plus size={12} />
          Add Line Item
        </button>
      )}

      {/* Product modal */}
      {modalLine && (
        <ProductModal line={modalLine} onClose={() => setModalLine(null)} />
      )}
    </>
  )
}
