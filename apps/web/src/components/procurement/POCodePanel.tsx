'use client'

// ─── POCodePanel — Column C ───────────────────────────────────────────────────
//
// The primary work surface for a selected Purchase Order.
//
// Layout:
//   ┌─ HEADER ──────────────────────────────────────────────────────────────┐
//   │  [Brand Logo]   PO-XXXX                    ● Status                  │
//   │                 Project name (if any)                                 │
//   │  Landing: ₹X.XL  Client: ₹X.XL  Margin: XX%     [Advance] [PDF]    │
//   ├─ CODE TABLE (flex-1, scrolls) ────────────────────────────────────────┤
//   │  IMG │ SKU │ Qty ± │ Ordered │ Received │ Pending │ InBox │ BoxStatus │
//   ├─ FOOTER TOTALS ────────────────────────────────────────────────────────┤
//   │  Total SKUs  Units  Received  Pending  In Box  Dispatched            │
//   │  Landing cost [editable]    Client value   Margin%                   │
//   └────────────────────────────────────────────────────────────────────────┘

import * as React from 'react'
import { ChevronRight, FileText, Package } from 'lucide-react'
import {
  PO_STATUS_LABEL, PO_STATUS_COLOR, BRAND_COLORS,
  type MockPurchaseOrder, type POStatus,
} from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import { BrandLogo } from './BrandLogo'
import { POCodeTable } from './POCodeTable'
import { EditableCell } from './EditableCell'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: POStatus }) {
  const sc = PO_STATUS_COLOR[status]
  return (
    <div style={{
      padding: '3px 10px', borderRadius: 20,
      background: sc.bg, color: sc.text,
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
      whiteSpace: 'nowrap',
    }}>
      {PO_STATUS_LABEL[status]}
    </div>
  )
}

// ─── Metric chip ──────────────────────────────────────────────────────────────

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 1,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: color ?? 'var(--text-primary)',
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── Footer totals row ────────────────────────────────────────────────────────

function FooterTotals({
  order,
  inBoxTotal,
  dispatchedTotal,
}: {
  order: MockPurchaseOrder
  inBoxTotal: number
  dispatchedTotal: number
}) {
  const updatePOField = useProcurementStore((s) => s.updatePOField)

  const totalSKUs      = order.lineItems.length
  const totalUnits     = order.lineItems.reduce((s, l) => s + l.qtyOrdered,  0)
  const totalReceived  = order.lineItems.reduce((s, l) => s + l.qtyReceived,  0)
  const totalPending   = totalUnits - totalReceived
  const totalLanding   = order.lineItems.reduce((s, l) => s + (l.landingCost ?? 0) * l.qtyOrdered, 0)
  const totalClient    = order.lineItems.reduce((s, l) => s + (l.clientOfferRate ?? 0) * l.qtyOrdered, 0)
  const margin         = totalClient > 0 ? Math.round(((totalClient - totalLanding) / totalClient) * 100) : null
  const isReadonly     = order.status === 'FULLY_RECEIVED' || order.status === 'CANCELLED'

  return (
    <div style={{
      borderTop: '1px solid var(--border)', padding: '12px 16px',
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Summary counters */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'SKUs',        value: totalSKUs      },
          { label: 'Units',       value: totalUnits      },
          { label: 'Received',    value: totalReceived   },
          { label: 'Pending',     value: totalPending    },
          { label: 'In Box',      value: inBoxTotal      },
          { label: 'Dispatched',  value: dispatchedTotal },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 14, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Financials */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {/* Landing cost — editable */}
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 2,
          }}>
            Landing cost
          </div>
          {!isReadonly && totalLanding > 0 ? (
            <EditableCell
              type="number"
              value={totalLanding}
              onSave={() => {/* individual line item costs editable in table */}}
              disabled
              displayStyle={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}
            />
          ) : (
            <span style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}>
              {totalLanding > 0 ? formatINR(totalLanding) : '—'}
            </span>
          )}
        </div>

        {totalClient > 0 && (
          <Metric label="Client value" value={formatINR(totalClient)} />
        )}

        {margin !== null && (
          <Metric
            label="Margin"
            value={`${margin}%`}
            color={margin >= 20 ? '#16A34A' : margin >= 10 ? '#D97706' : '#DC2626'}
          />
        )}

        {/* Notes — editable */}
        {order.notes && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 2,
            }}>
              Notes
            </div>
            <EditableCell
              type="text"
              value={order.notes}
              onSave={(v) => updatePOField(order.id, { notes: v })}
              disabled={isReadonly}
              displayStyle={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  order,
  onStatusAdvance,
  onBrandClick,
}: {
  order: MockPurchaseOrder
  onStatusAdvance: (to: POStatus) => void
  onBrandClick: (brand: string) => void
}) {
  const updatePOField = useProcurementStore((s) => s.updatePOField)
  const brandColor    = BRAND_COLORS[order.vendorName?.toUpperCase() ?? ''] ?? '#6B7280'
  const isReadonly    = order.status === 'FULLY_RECEIVED' || order.status === 'CANCELLED'

  const NEXT_STATUS: Partial<Record<POStatus, POStatus>> = {
    DRAFT:              'SUBMITTED',
    SUBMITTED:          'PARTIALLY_RECEIVED',
    PARTIALLY_RECEIVED: 'FULLY_RECEIVED',
  }
  const nextStatus = NEXT_STATUS[order.status]

  return (
    <div style={{
      padding: '14px 18px', borderBottom: '1px solid var(--border)',
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Top row: logo + PO number + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Brand logo — click to filter Column B by this brand */}
        {order.vendorName && (
          <BrandLogo
            brand={order.vendorName}
            size="lg"
            onClick={() => onBrandClick(order.vendorName!)}
            title={`Filter by ${order.vendorName}`}
            style={{ marginTop: 2, cursor: 'pointer' }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* PO number */}
          <div style={{
            fontSize: 15, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em', marginBottom: 2,
          }}>
            {order.poNumber}
          </div>

          {/* Project name */}
          {order.projectName && (
            <div style={{
              fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
              marginBottom: 3,
            }}>
              {order.projectName}
            </div>
          )}

          {/* Delivery date — editable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {order.expectedDelivery ? (
              <EditableCell
                type="text"
                value={order.expectedDelivery.slice(0, 10)}
                onSave={(v) => updatePOField(order.id, { expectedDelivery: v })}
                disabled={isReadonly}
                renderDisplay={(v) => (
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                  }}>
                    Expected: {formatDate(v + 'T00:00:00Z')}
                  </span>
                )}
              />
            ) : null}
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={order.status} />
      </div>

      {/* Advance status button */}
      {nextStatus && (
        <button
          onClick={() => onStatusAdvance(nextStatus)}
          style={{
            alignSelf: 'flex-start',
            height: 30, padding: '0 12px', borderRadius: 7,
            border: 'none', background: 'var(--text-primary)',
            color: 'var(--background)', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ChevronRight size={12} />
          Mark as {PO_STATUS_LABEL[nextStatus]}
        </button>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function POCodePanelEmpty() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12,
      color: 'var(--text-muted)',
    }}>
      <Package size={44} style={{ opacity: 0.18 }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 4 }}>
          No order selected
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)', opacity: 0.7 }}>
          Select a PO from the list or search by SKU
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface POCodePanelProps {
  order: MockPurchaseOrder
  highlightLineId?: string | null
  onStatusAdvance: (to: POStatus) => void
  /** Called when user clicks the brand logo in the header */
  onBrandClick: (brand: string) => void
}

export function POCodePanel({
  order, highlightLineId, onStatusAdvance, onBrandClick,
}: POCodePanelProps) {
  const boxes    = useProcurementStore((s) => s.boxes)
  const isReadonly = order.status === 'FULLY_RECEIVED' || order.status === 'CANCELLED'

  // Filter boxes that belong to this order's project
  const relevantBoxes = React.useMemo(
    () => boxes.filter((b) => !order.projectId || b.projectId === order.projectId),
    [boxes, order.projectId],
  )

  // Aggregate box totals for footer
  const { inBoxTotal, dispatchedTotal } = React.useMemo(() => {
    let inBox = 0, dispatched = 0
    for (const box of relevantBoxes) {
      for (const item of box.items) {
        inBox      += item.qtyTotal - item.qtyDispatched
        dispatched += item.qtyDispatched
      }
    }
    return { inBoxTotal: inBox, dispatchedTotal: dispatched }
  }, [relevantBoxes])

  // Scroll highlight line into view
  React.useEffect(() => {
    if (!highlightLineId) return
    const el = document.getElementById(`line-${highlightLineId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightLineId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PanelHeader
        order={order}
        onStatusAdvance={onStatusAdvance}
        onBrandClick={onBrandClick}
      />

      {/* Scrollable code table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <POCodeTable
          poId={order.id}
          lineItems={order.lineItems}
          boxes={relevantBoxes}
          projectName={order.projectName}
          readonly={isReadonly}
          highlightLineId={highlightLineId}
        />
      </div>

      <FooterTotals
        order={order}
        inBoxTotal={inBoxTotal}
        dispatchedTotal={dispatchedTotal}
      />
    </div>
  )
}
