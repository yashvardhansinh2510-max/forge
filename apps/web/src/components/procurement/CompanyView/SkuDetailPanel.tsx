'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { ALLOC_STATUS_CONFIG, BRAND_COLORS } from '@/lib/mock/procurement-data'
import { getInitials, getAvatarColor, fmtDate } from '@/lib/tracker-utils'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }
const LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: '#9ca3af', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', marginBottom: 8 }

export function SkuDetailPanel() {
  const selectedLineId   = usePurchasesStore((s) => s.selectedLineId)
  const setSelectedLine  = usePurchasesStore((s) => s.setSelectedLine)
  const orders           = useProcurementStore((s) => s.orders)
  const updateQtyReceived = useProcurementStore((s) => s.updateLineQtyReceived)
  const updateStatus     = useProcurementStore((s) => s.updateAllocationStatus)
  const updateDelivery   = useProcurementStore((s) => s.updateAllocationDelivery)

  const [receivedInput, setReceivedInput] = useState<Record<string, string>>({})

  if (!selectedLineId) return null

  // Find the line and its parent order
  let foundOrder = null
  let foundLine  = null
  for (const order of orders) {
    const line = order.lineItems.find((l) => l.id === selectedLineId)
    if (line) { foundOrder = order; foundLine = line; break }
  }

  if (!foundOrder || !foundLine) return null

  const line  = foundLine
  const order = foundOrder

  const brandColor = BRAND_COLORS[line.productBrand] ?? '#374151'
  const pending    = Math.max(0, line.qtyOrdered - line.qtyReceived)
  const inBox      = line.customerAllocations.filter((a) => a.boxStatus === 'IN_BOX' || a.boxStatus === 'DEL_PENDING').reduce((s, a) => s + a.qty, 0)
  const done       = line.customerAllocations.filter((a) => a.boxStatus === 'DELIVERED' || a.boxStatus === 'GIVEN_OTHER').reduce((s, a) => s + a.qty, 0)

  const receivedKey = `${order.id}-${line.id}`
  const receivedVal = receivedInput[receivedKey] ?? String(line.qtyReceived)

  function handleSaveReceived() {
    const qty = parseInt(receivedVal, 10)
    if (!isNaN(qty)) updateQtyReceived(order!.id, line!.id, qty)
  }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: '#ffffff',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 14px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)', lineHeight: 1.3 }}>
              {line.productName}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 10, fontFamily: 'var(--font-ui)',
              background: `${brandColor}18`, color: brandColor,
              fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 7px', borderRadius: 4,
            }}>
              {line.productSku}
            </div>
          </div>
          <button
            onClick={() => setSelectedLine(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#9ca3af', padding: 0, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[
            { label: 'Ordered', value: line.qtyOrdered,  color: '#2563eb' },
            { label: 'Pending', value: pending,            color: '#d97706' },
            { label: 'In Box',  value: inBox,              color: '#059669' },
            { label: 'Done',    value: done,               color: '#16a34a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center',
              padding: '6px 4px',
              background: `${color}10`,
              borderRadius: 6,
            }}>
              <div style={{ ...NUM, fontSize: 16, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'var(--font-ui)', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mark Received */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={LABEL}>Mark Received at Godown</div>
        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', marginBottom: 8 }}>
          Ordered: <strong style={NUM}>{line.qtyOrdered}</strong> · Received: <strong style={NUM}>{line.qtyReceived}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            min={0}
            max={line.qtyOrdered}
            value={receivedVal}
            onChange={(e) => setReceivedInput((p) => ({ ...p, [receivedKey]: e.target.value }))}
            style={{
              flex: 1, padding: '6px 8px',
              border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
              ...NUM,
            }}
          />
          <button
            onClick={handleSaveReceived}
            style={{
              padding: '6px 12px',
              background: '#111827', color: '#fff',
              border: 'none', borderRadius: 6,
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Update
          </button>
        </div>
      </div>

      {/* Customer Assignments */}
      <div style={{ padding: '14px 16px', flex: 1 }}>
        <div style={LABEL}>Customer Assignments</div>

        {line.customerAllocations.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
            No customers assigned yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {line.customerAllocations.map((alloc) => {
              const cfg       = ALLOC_STATUS_CONFIG[alloc.boxStatus]
              const initials  = getInitials(alloc.customerName)
              const avatarClr = getAvatarColor(alloc.customerName)

              return (
                <div
                  key={alloc.customerId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}22`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: avatarClr, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'var(--font-ui)' }}>
                      {alloc.customerName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ ...NUM, fontSize: 11, fontWeight: 700, color: cfg.color }}>{alloc.qty} units</span>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: `${cfg.color}18`, color: cfg.color, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                        {cfg.label}
                      </span>
                    </div>
                    {alloc.scheduledDelivery && (
                      <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                        {fmtDate(alloc.scheduledDelivery)}
                      </div>
                    )}
                    {alloc.customNote && (
                      <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2, fontStyle: 'italic' }}>
                        "{alloc.customNote}"
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PO info */}
        <div style={{
          marginTop: 16, padding: '10px 12px',
          background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8,
        }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)', marginBottom: 4 }}>
            Source PO
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'var(--font-ui)' }}>
            {order.poNumber}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
            {order.vendorName} · {order.projectName ?? 'Bulk Stock'}
          </div>
          {order.expectedDelivery && (
            <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
              Expected: {fmtDate(order.expectedDelivery)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
