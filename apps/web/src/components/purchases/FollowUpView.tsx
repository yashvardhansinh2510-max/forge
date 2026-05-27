'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { PurchaseTrackerLine } from '@/lib/purchases-tracker'

const FOLLOW_UP_STATUSES = [
  { value: 'AWAITING', label: 'Awaiting Installation' },
  { value: 'INSTALLED', label: 'Installed' },
  { value: 'SNAGGING', label: 'Snagging' },
] as const

type FollowUpStatus = 'AWAITING' | 'INSTALLED' | 'SNAGGING'

interface FollowUpLine extends PurchaseTrackerLine {
  followUpStatus?: string | null
}

interface Props {
  lines: FollowUpLine[]
  onStatusChange?: (lineId: string, status: FollowUpStatus) => void
}

function StatusBadgeColor(status: string) {
  if (status === 'INSTALLED') return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }
  if (status === 'SNAGGING') return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' }
  return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }
}

export function FollowUpView({ lines, onStatusChange }: Props) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, FollowUpStatus>>({})

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-[var(--border)] bg-white py-16 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No dispatched items yet</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Items dispatched from the tracker will appear here for follow-up.</p>
      </div>
    )
  }

  // Group by customer name
  const grouped = lines.reduce<Record<string, FollowUpLine[]>>((acc, line) => {
    const key = line.customer?.name ?? 'Unknown Customer'
    if (!acc[key]) acc[key] = []
    acc[key].push(line)
    return acc
  }, {})

  async function handleStatusChange(lineId: string, status: FollowUpStatus) {
    const prev = localStatuses[lineId]
    setLocalStatuses((s) => ({ ...s, [lineId]: status }))
    try {
      const res = await fetch(`/api/purchase-orders/lines/${lineId}/followup-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      onStatusChange?.(lineId, status)
    } catch {
      setLocalStatuses((s) => ({ ...s, [lineId]: prev ?? 'AWAITING' }))
      toast.error('Could not update follow-up status')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([customerName, customerLines]) => (
        <div key={customerName} className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white">
          {/* Customer header */}
          <div className="border-b border-[var(--border)] bg-[rgba(0,0,0,0.015)] px-5 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{customerName}</p>
            {customerLines[0]?.customer?.siteAddress && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{customerLines[0].customer.siteAddress}</p>
            )}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SKU</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 100 }}>Qty Dispatched</th>
                <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 200 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {customerLines.map((line, idx) => {
                const currentStatus = (localStatuses[line.id] ?? line.followUpStatus ?? 'AWAITING') as FollowUpStatus
                const colors = StatusBadgeColor(currentStatus)
                const isLast = idx === customerLines.length - 1

                return (
                  <tr
                    key={line.id}
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    {/* SKU — DM Mono style */}
                    <td style={{ padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: isLast ? 'none' : undefined }}>
                      {line.product.sku}
                    </td>

                    {/* Product name */}
                    <td style={{ padding: '10px 8px' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: '18px' }}>{line.product.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{line.product.brand}</p>
                    </td>

                    {/* Qty dispatched */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {line.stages.COMPLETED}
                      </span>
                    </td>

                    {/* Status dropdown */}
                    <td style={{ padding: '10px 20px' }}>
                      <select
                        value={currentStatus}
                        onChange={(e) => void handleStatusChange(line.id, e.target.value as FollowUpStatus)}
                        style={{
                          height: 28, padding: '0 8px', borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                          background: colors.bg,
                          color: colors.text,
                          fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', outline: 'none',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {FOLLOW_UP_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
