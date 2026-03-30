'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { BRAND_COLORS, ALLOC_STATUS_CONFIG } from '@/lib/mock/procurement-data'
import type { MockPurchaseOrder, MockPOLineItem, CustomerAllocation, BoxAllocationStatus } from '@/lib/mock/procurement-data'
import { StatusFunnel } from './StatusFunnel'
import { fmtDate } from '@/lib/tracker-utils'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }
const ALL_STATUSES: BoxAllocationStatus[] = [
  'ORDERED', 'AT_GODOWN', 'IN_BOX', 'DEL_PENDING', 'DELIVERED', 'GIVEN_OTHER',
]

interface Props {
  order: MockPurchaseOrder
  line:  MockPOLineItem
  alloc: CustomerAllocation
}

export function OrderRow({ order, line, alloc }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editDate, setEditDate]   = useState(alloc.scheduledDelivery ?? '')
  const [editNote, setEditNote]   = useState(alloc.customNote ?? '')
  const [editStatus, setEditStatus] = useState<BoxAllocationStatus>(alloc.boxStatus)

  const updateStatus   = useProcurementStore((s) => s.updateAllocationStatus)
  const updateDelivery = useProcurementStore((s) => s.updateAllocationDelivery)
  const updateNote     = useProcurementStore((s) => s.updateAllocationNote)

  const cfg        = ALLOC_STATUS_CONFIG[alloc.boxStatus]
  const brandColor = BRAND_COLORS[line.productBrand] ?? '#374151'

  function handleSave() {
    if (editStatus !== alloc.boxStatus)
      updateStatus(order.id, line.id, alloc.customerId, editStatus)
    if (editDate !== (alloc.scheduledDelivery ?? ''))
      updateDelivery(order.id, line.id, alloc.customerId, editDate || null)
    if (editStatus === 'GIVEN_OTHER' && editNote !== (alloc.customNote ?? ''))
      updateNote(order.id, line.id, alloc.customerId, editNote)
    setExpanded(false)
  }

  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      {/* Row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          cursor: 'pointer',
          background: expanded ? '#f9fafb' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        {/* Expand arrow */}
        <span style={{
          fontSize: 10, color: '#9ca3af',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s', flexShrink: 0,
        }}>
          ▶
        </span>

        {/* Product image placeholder */}
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          background: `${brandColor}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          📦
        </div>

        {/* Product info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'var(--font-ui)', lineHeight: 1.2 }}>
            {line.productName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-ui)',
              background: `${brandColor}14`, color: brandColor,
              fontWeight: 700, letterSpacing: '0.05em',
              padding: '1px 6px', borderRadius: 4,
            }}>
              {line.productSku}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-ui)',
              background: '#f3f4f6', color: '#6b7280',
              padding: '1px 5px', borderRadius: 4, fontWeight: 500,
            }}>
              {line.productBrand}
            </span>
          </div>
        </div>

        {/* Qty */}
        <div style={{ ...NUM, fontSize: 15, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
          ×{alloc.qty}
        </div>

        {/* Status funnel */}
        <div style={{ flexShrink: 0 }}>
          <StatusFunnel currentStatus={alloc.boxStatus} />
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 12,
          background: cfg.bg, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10 }}>{cfg.emoji}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-ui)' }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 16px 16px 64px',
          background: '#fafafa',
          borderTop: '1px solid #f3f4f6',
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Info block */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
                    PO Number
                  </div>
                  <div style={{ ...NUM, fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'var(--font-ui)' }}>
                    {order.poNumber}
                  </div>
                </div>
                {alloc.scheduledDelivery && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
                      Scheduled
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', fontFamily: 'var(--font-ui)' }}>
                      {fmtDate(alloc.scheduledDelivery)}
                    </div>
                  </div>
                )}
                {alloc.customNote && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
                      Note
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
                      "{alloc.customNote}"
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit form */}
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8, padding: 12, minWidth: 220,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', marginBottom: 10 }}>
                Update Status
              </div>

              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as BoxAllocationStatus)}
                style={{
                  width: '100%', padding: '6px 8px', marginBottom: 8,
                  border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: 11, fontFamily: 'var(--font-ui)', color: '#111827',
                  background: '#fff',
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ALLOC_STATUS_CONFIG[s].emoji} {ALLOC_STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                placeholder="Delivery date"
                style={{
                  width: '100%', padding: '6px 8px', marginBottom: 8,
                  border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: 11, fontFamily: 'var(--font-ui)', color: '#111827',
                  background: '#fff', boxSizing: 'border-box',
                }}
              />

              {editStatus === 'GIVEN_OTHER' && (
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="Who received it?"
                  style={{
                    width: '100%', padding: '6px 8px', marginBottom: 8,
                    border: '1px solid #d1d5db', borderRadius: 6,
                    fontSize: 11, fontFamily: 'var(--font-ui)', color: '#111827',
                    background: '#fff', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1, padding: '6px 0',
                    background: '#111827', color: '#fff',
                    border: 'none', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    padding: '6px 10px',
                    background: '#f3f4f6', color: '#374151',
                    border: 'none', borderRadius: 6,
                    fontSize: 11, fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
