'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { ALLOC_STATUS_CONFIG } from '@/lib/mock/procurement-data'
import type { CustomerAllocation, BoxAllocationStatus } from '@/lib/mock/procurement-data'
import { getInitials, getAvatarColor, fmtDate } from '@/lib/tracker-utils'

const ALL_STATUSES: BoxAllocationStatus[] = [
  'ORDERED', 'AT_GODOWN', 'IN_BOX', 'DEL_PENDING', 'DELIVERED', 'GIVEN_OTHER',
]

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }

interface Props {
  poId:      string
  lineId:    string
  alloc:     CustomerAllocation
}

export function CustomerBoxCard({ poId, lineId, alloc }: Props) {
  const [editing, setEditing] = useState(false)
  const [draftStatus, setDraftStatus]   = useState<BoxAllocationStatus>(alloc.boxStatus)
  const [draftDate, setDraftDate]       = useState(alloc.scheduledDelivery ?? '')
  const [draftNote, setDraftNote]       = useState(alloc.customNote ?? '')

  const updateStatus   = useProcurementStore((s) => s.updateAllocationStatus)
  const updateDelivery = useProcurementStore((s) => s.updateAllocationDelivery)
  const updateNote     = useProcurementStore((s) => s.updateAllocationNote)

  const cfg     = ALLOC_STATUS_CONFIG[alloc.boxStatus]
  const initials = getInitials(alloc.customerName)
  const avatarColor = getAvatarColor(alloc.customerName)

  function handleSave() {
    if (draftStatus !== alloc.boxStatus)
      updateStatus(poId, lineId, alloc.customerId, draftStatus)
    if (draftDate !== (alloc.scheduledDelivery ?? ''))
      updateDelivery(poId, lineId, alloc.customerId, draftDate || null)
    if (draftStatus === 'GIVEN_OTHER' && draftNote !== (alloc.customNote ?? ''))
      updateNote(poId, lineId, alloc.customerId, draftNote)
    setEditing(false)
  }

  function handleOpen() {
    setDraftStatus(alloc.boxStatus)
    setDraftDate(alloc.scheduledDelivery ?? '')
    setDraftNote(alloc.customNote ?? '')
    setEditing(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Card */}
      <div
        onClick={handleOpen}
        style={{
          width: 160, minHeight: 90,
          background: cfg.bg,
          border: cfg.border,
          borderRadius: 8,
          padding: '10px 12px',
          cursor: 'pointer',
          transition: 'box-shadow 0.12s',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}
        title="Click to edit status"
      >
        {/* Customer avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: avatarColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#111827',
            fontFamily: 'var(--font-ui)', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {alloc.customerName}
          </span>
        </div>

        {/* Qty */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ ...NUM, fontSize: 20, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
            {alloc.qty}
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>units</span>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 12,
          background: `${cfg.color}18`,
          width: 'fit-content',
        }}>
          <span style={{ fontSize: 10 }}>{cfg.emoji}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, fontFamily: 'var(--font-ui)' }}>
            {cfg.label}
          </span>
        </div>

        {/* Delivery date */}
        {alloc.scheduledDelivery && (
          <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
            {fmtDate(alloc.scheduledDelivery)}
          </div>
        )}

        {/* Custom note (GIVEN_OTHER) */}
        {alloc.boxStatus === 'GIVEN_OTHER' && alloc.customNote && (
          <div style={{
            fontSize: 10, color: '#6b7280', fontFamily: 'var(--font-ui)',
            lineHeight: 1.4, marginTop: 2,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            "{alloc.customNote}"
          </div>
        )}
      </div>

      {/* Edit Popover */}
      {editing && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setEditing(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.15)',
            }}
          />
          <div style={{
            position: 'absolute', top: '100%', left: 0,
            marginTop: 4,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 50, width: 240,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#111827',
              fontFamily: 'var(--font-ui)', marginBottom: 12,
            }}>
              {alloc.customerName} · {alloc.qty} units
            </div>

            {/* Status select */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', fontFamily: 'var(--font-ui)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </div>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as BoxAllocationStatus)}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
                  background: '#fff', cursor: 'pointer',
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{ALLOC_STATUS_CONFIG[s].emoji} {ALLOC_STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            {/* Delivery date */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', fontFamily: 'var(--font-ui)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scheduled Delivery
              </div>
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '1px solid #d1d5db', borderRadius: 6,
                  fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
                  background: '#fff', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Custom note for GIVEN_OTHER */}
            {draftStatus === 'GIVEN_OTHER' && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', fontFamily: 'var(--font-ui)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Note (who received it)
                </div>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Given to site plumber Ramesh for installation"
                  style={{
                    width: '100%', padding: '6px 8px',
                    border: '1px solid #d1d5db', borderRadius: 6,
                    fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
                    background: '#fff', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: '7px 0',
                  background: '#111827', color: '#fff',
                  border: 'none', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: '7px 12px',
                  background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 6,
                  fontSize: 12, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
