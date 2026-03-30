'use client'

// ─── POCodeTable ───────────────────────────────────────────────────────────────
//
// SKU-first procurement table — the core of Column C (POCodePanel).
//
// Columns:
//   IMG  │  SKU CODE (primary) + product name (secondary)
//        │  QTY ±  │  ORDERED  │  RECEIVED [+receive]  │  PENDING  │  IN BOX  │  BOX STATUS
//
// Rules:
//   • SKU is the primary identifier — monospace font, editable via EditableCell
//   • Clicking image → product modal
//   • All qty fields: EditableCell number with bounds
//   • PENDING = ordered − received (computed, read-only, amber if > 0)
//   • IN BOX  = sum of box items for this product (computed, read-only)
//   • BOX STATUS = BoxStatusCell (progress bar + per-unit dispatch)
//   • FULLY_RECEIVED or CANCELLED PO → readonly=true on all cells

import * as React from 'react'
import { Plus, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  BRAND_COLORS,
  type MockPOLineItem,
  type MockInventoryBox,
  type POLineStatus,
} from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import { EditableCell } from './EditableCell'
import { BoxStatusCell } from './BoxStatusCell'

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_STATUS_OPTIONS: ReadonlyArray<{ value: POLineStatus; label: string }> = [
  { value: 'PENDING',            label: 'Pending'  },
  { value: 'PARTIALLY_RECEIVED', label: 'Partial'  },
  { value: 'FULLY_RECEIVED',     label: 'Received' },
]

// ─── Product thumbnail with 3-level fallback ──────────────────────────────────

function ProductThumb({
  image, brand, sku, size = 44, onClick,
}: {
  image: string; brand: string; sku: string
  size?: number; onClick?: () => void
}) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const brandColor = BRAND_COLORS[brand.toUpperCase()] ?? '#6B7280'
  const initials   = sku.slice(0, 3).toUpperCase()

  const container: React.CSSProperties = {
    width: size, height: size, flexShrink: 0, borderRadius: 7,
    overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
    border: '1px solid var(--border-subtle)',
  }

  if (image && !imgFailed) {
    return (
      <div style={container} onClick={onClick}>
        <img
          src={image} alt={sku}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      title={`${sku} — click for details`}
      style={{
        ...container,
        background: `${brandColor}15`,
        border: `1.5px solid ${brandColor}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{
        fontSize: size * 0.24, fontWeight: 900, color: brandColor,
        fontFamily: 'var(--font-ui)', letterSpacing: '0.02em', lineHeight: 1,
      }}>
        {initials}
      </span>
    </div>
  )
}

// ─── Product info modal ───────────────────────────────────────────────────────

function ProductModal({ line, onClose }: { line: MockPOLineItem; onClose: () => void }) {
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
          background: 'var(--background)', borderRadius: 14,
          border: '1px solid var(--border)', padding: 24,
          width: 360, display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.28)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', marginBottom: 2,
            }}>
              {line.productName}
            </div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)',
              letterSpacing: '0.06em',
            }}>
              {line.productSku}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, fontSize: 18, lineHeight: 1,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Image placeholder */}
        <div style={{
          width: '100%', aspectRatio: '4/3', borderRadius: 10,
          background: `${brandColor}10`, border: `2px solid ${brandColor}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {line.productImage
            ? <img src={line.productImage} alt={line.productSku} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
            : <span style={{ fontSize: 40, fontWeight: 900, color: brandColor, opacity: 0.45, fontFamily: 'var(--font-ui)' }}>
                {line.productSku.slice(0, 3)}
              </span>
          }
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {[
            { label: 'Brand',        value: line.productBrand },
            { label: 'Ordered',      value: `${line.qtyOrdered} pcs` },
            { label: 'Received',     value: `${line.qtyReceived} pcs` },
            { label: 'Pending',      value: `${line.qtyOrdered - line.qtyReceived} pcs` },
            ...(line.landingCost      != null ? [{ label: 'Landing cost',   value: `₹${line.landingCost.toLocaleString('en-IN')}` }] : []),
            ...(line.clientOfferRate  != null ? [{ label: 'Offer rate',     value: `₹${line.clientOfferRate.toLocaleString('en-IN')}` }] : []),
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

        <button onClick={onClose} style={{
          height: 32, borderRadius: 7, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <ExternalLink size={11} />
          View in catalogue
        </button>
      </div>
    </div>
  )
}

// ─── Add line row ─────────────────────────────────────────────────────────────

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
      <td colSpan={8} style={{ padding: '8px 12px', borderTop: '1px dashed var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            autoFocus
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onDone() }}
            placeholder="Type SKU and press Enter…"
            style={{
              flex: 1, height: 28, padding: '0 8px',
              border: '1.5px solid var(--text-primary)', borderRadius: 6,
              background: 'var(--background)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              fontSize: 11, outline: 'none',
            }}
          />
          <button onClick={handleAdd} style={{
            height: 28, padding: '0 12px', borderRadius: 6,
            border: 'none', background: 'var(--text-primary)',
            color: 'var(--background)', fontFamily: 'var(--font-ui)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Add
          </button>
          <button onClick={onDone} style={{
            height: 28, width: 28, borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Table header cell ────────────────────────────────────────────────────────

function TH({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '6px 8px', textAlign: 'left',
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

interface POCodeTableProps {
  poId:         string
  lineItems:    MockPOLineItem[]
  boxes:        MockInventoryBox[]
  projectName:  string | null
  readonly?:    boolean
  /** Line ID to scroll into view + highlight (from SKU search) */
  highlightLineId?: string | null
}

export function POCodeTable({
  poId, lineItems, boxes, projectName, readonly = false, highlightLineId,
}: POCodeTableProps) {
  const updateLineItem  = useProcurementStore((s) => s.updateLineItem)
  const [modalLine, setModalLine]   = React.useState<MockPOLineItem | null>(null)
  const [addingLine, setAddingLine] = React.useState(false)

  function save(lineId: string, patch: Parameters<typeof updateLineItem>[2]) {
    updateLineItem(poId, lineId, patch)
  }

  // Compute IN BOX count per product from box items
  function inBoxCount(productId: string): number {
    let total = 0
    for (const box of boxes) {
      for (const item of box.items) {
        if (item.productId === productId) total += item.qtyTotal - item.qtyDispatched
      }
    }
    return total
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 56 }} />
            <col />
            <col style={{ width: 56 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 52 }} />
            <col style={{ width: 180 }} />
          </colgroup>

          <thead>
            <tr>
              <TH style={{ paddingLeft: 14 }} />
              <TH>SKU / Product</TH>
              <TH style={{ textAlign: 'center' }}>Qty</TH>
              <TH style={{ textAlign: 'center' }}>Ordered</TH>
              <TH style={{ textAlign: 'center' }}>Received</TH>
              <TH style={{ textAlign: 'center' }}>Pending</TH>
              <TH style={{ textAlign: 'center' }}>In Box</TH>
              <TH>Box Status</TH>
            </tr>
          </thead>

          <tbody>
            {lineItems.length === 0 && !addingLine && (
              <tr>
                <td colSpan={8} style={{
                  padding: '36px 20px', textAlign: 'center',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 12,
                }}>
                  No line items yet
                </td>
              </tr>
            )}

            {lineItems.map((line, idx) => {
              const brandColor  = BRAND_COLORS[line.productBrand.toUpperCase()] ?? '#6B7280'
              const pending     = Math.max(0, line.qtyOrdered - line.qtyReceived)
              const inBox       = inBoxCount(line.productId)
              const highlighted = line.id === highlightLineId
              const isEven      = idx % 2 === 0

              return (
                <tr
                  key={line.id}
                  id={`line-${line.id}`}
                  style={{
                    background: highlighted
                      ? 'rgba(37,99,235,0.06)'
                      : isEven ? 'transparent' : 'var(--surface)',
                    outline: highlighted ? '1.5px solid rgba(37,99,235,0.25)' : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Image */}
                  <td style={{ padding: '10px 6px 10px 14px', verticalAlign: 'middle' }}>
                    <ProductThumb
                      image={line.productImage}
                      brand={line.productBrand}
                      sku={line.productSku}
                      size={40}
                      onClick={() => setModalLine(line)}
                    />
                  </td>

                  {/* SKU + name */}
                  <td style={{ padding: '10px 8px', verticalAlign: 'middle', minWidth: 0 }}>
                    <EditableCell
                      type="text"
                      value={line.productSku}
                      onSave={(v) => save(line.id, { productSku: v })}
                      disabled={readonly}
                      displayStyle={{
                        fontSize: 11, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.04em', color: 'var(--text-primary)',
                      }}
                    />
                    <div style={{
                      fontSize: 9, color: brandColor, fontFamily: 'var(--font-ui)',
                      fontWeight: 600, marginTop: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {line.productBrand || '—'}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {line.productName}
                    </div>
                  </td>

                  {/* Qty ± */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      {!readonly && (
                        <button
                          onClick={() => save(line.id, { qtyOrdered: line.qtyOrdered - 1 })}
                          disabled={line.qtyOrdered <= 1}
                          style={{
                            width: 16, height: 16, borderRadius: 3,
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', cursor: line.qtyOrdered <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: line.qtyOrdered <= 1 ? 0.35 : 1,
                          }}
                        >
                          −
                        </button>
                      )}
                      <span style={{
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)',
                        fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
                      }}>
                        {line.qtyOrdered}
                      </span>
                      {!readonly && (
                        <button
                          onClick={() => save(line.id, { qtyOrdered: line.qtyOrdered + 1 })}
                          style={{
                            width: 16, height: 16, borderRadius: 3,
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', cursor: 'pointer',
                            fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Ordered (display) */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {line.qtyOrdered}
                    </span>
                  </td>

                  {/* Received */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {line.qtyReceived < line.qtyOrdered && !readonly ? (
                      <EditableCell
                        type="number"
                        value={line.qtyReceived}
                        min={0}
                        max={line.qtyOrdered}
                        onSave={(v) => {
                          save(line.id, {
                            qtyReceived: v,
                            status: v === 0
                              ? 'PENDING'
                              : v >= line.qtyOrdered
                                ? 'FULLY_RECEIVED'
                                : 'PARTIALLY_RECEIVED',
                          })
                        }}
                        displayStyle={{
                          color: line.qtyReceived > 0 ? '#16A34A' : 'var(--text-muted)',
                        }}
                        style={{ justifyContent: 'center' }}
                      />
                    ) : (
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                        color: line.qtyReceived > 0 ? '#16A34A' : 'var(--text-muted)',
                      }}>
                        {line.qtyReceived}
                      </span>
                    )}
                  </td>

                  {/* Pending */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                      color: pending > 0 ? '#D97706' : 'var(--text-muted)',
                    }}>
                      {pending}
                    </span>
                  </td>

                  {/* In Box */}
                  <td style={{ padding: '10px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                      color: inBox > 0 ? '#2563EB' : 'var(--text-muted)',
                    }}>
                      {inBox > 0 ? inBox : '—'}
                    </span>
                  </td>

                  {/* Box Status */}
                  <td style={{ padding: '10px 10px 10px 8px', verticalAlign: 'top' }}>
                    <BoxStatusCell
                      productId={line.productId}
                      projectName={projectName}
                      boxes={boxes}
                      readonly={readonly}
                    />
                  </td>
                </tr>
              )
            })}

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
            padding: '8px 14px', width: '100%',
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
      {modalLine && <ProductModal line={modalLine} onClose={() => setModalLine(null)} />}
    </>
  )
}
