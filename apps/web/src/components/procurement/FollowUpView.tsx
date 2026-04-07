'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { fetcher } from '@/lib/swr-helpers'

type FollowUpStatus = 'AWAITING' | 'INSTALLED' | 'SNAGGING'

interface FollowUpLine {
  id:             string
  sku:            string
  productName:    string
  brand:          string
  qtyDispatched:  number
  followUpStatus: FollowUpStatus
  dispatchedAt:   string | null
  customerId:     string | null
  customerName:   string
  poNumber:       string
}

const STATUS_CFG: Record<FollowUpStatus, { label: string; bg: string; color: string }> = {
  AWAITING:  { label: 'Awaiting Installation', bg: '#fff7ed', color: '#c2410c' },
  INSTALLED: { label: 'Installed',              bg: '#f0fdf4', color: '#15803d' },
  SNAGGING:  { label: 'Snagging',               bg: '#fef2f2', color: '#dc2626' },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function FollowUpView() {
  const { data: lines = [], mutate } = useSWR<FollowUpLine[]>(
    '/api/purchase-orders/follow-up',
    fetcher,
    { revalidateOnFocus: true },
  )
  const [updating, setUpdating] = useState<string | null>(null)

  const handleStatusChange = useCallback(async (lineId: string, followUpStatus: FollowUpStatus) => {
    setUpdating(lineId)
    try {
      const res = await fetch(`/api/purchase-orders/lines/${lineId}/follow-up-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpStatus }),
      })
      if (!res.ok) { toast.error('Failed to update status'); return }
      mutate(lines.map((l) => l.id === lineId ? { ...l, followUpStatus } : l), false)
      toast.success(`Status: ${STATUS_CFG[followUpStatus].label}`)
    } catch {
      toast.error('Network error')
    } finally {
      setUpdating(null)
    }
  }, [lines, mutate])

  // Group by customer
  const byCustomer = lines.reduce<Record<string, { name: string; lines: FollowUpLine[] }>>((acc, line) => {
    const key = line.customerId ?? 'unassigned'
    if (!acc[key]) acc[key] = { name: line.customerName, lines: [] }
    acc[key].lines.push(line)
    return acc
  }, {})

  if (lines.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
        No dispatched items yet.
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: 'var(--font-ui)', overflowY: 'auto', height: '100%' }}>
      {Object.entries(byCustomer).map(([key, group]) => (
        <div key={key} style={{ marginBottom: 28 }}>
          {/* Customer header */}
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 10, paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
          }}>
            {group.name}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {group.lines.length} item{group.lines.length !== 1 ? 's' : ''} dispatched
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['SKU', 'Product', 'Qty', 'Dispatched', 'Status'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
                    padding: '0 12px 6px 0', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.lines.map((line) => (
                <tr key={line.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px 10px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {line.sku}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-primary)', maxWidth: 200 }}>
                    {line.productName}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {line.qtyDispatched}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0', fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDate(line.dispatchedAt)}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <select
                      value={line.followUpStatus}
                      onChange={(e) => handleStatusChange(line.id, e.target.value as FollowUpStatus)}
                      disabled={updating === line.id}
                      style={{
                        fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 8px',
                        border: '1px solid #e5e7eb', cursor: updating === line.id ? 'not-allowed' : 'pointer',
                        background: STATUS_CFG[line.followUpStatus].bg,
                        color: STATUS_CFG[line.followUpStatus].color,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <option value="AWAITING">Awaiting Installation</option>
                      <option value="INSTALLED">Installed</option>
                      <option value="SNAGGING">Snagging</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
