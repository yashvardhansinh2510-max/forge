'use client'

import { useState } from 'react'
import {
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface Props {
  lines: PurchaseTrackerLine[]
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
}

interface DispatchConfirm {
  customerId: string
  lines: PurchaseTrackerLine[]
  challan: string
  note: string
}

interface CustomerGroup {
  id: string
  name: string
  siteAddress: string | null
  lines: PurchaseTrackerLine[]
}

export default function WorkspaceDispatch({ lines, onMoved, onSelectLine }: Props) {
  const [confirm, setConfirm] = useState<DispatchConfirm | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [dispatched, setDispatched] = useState<string[]>([]) // customer ids recently dispatched
  const [err, setErr] = useState('')

  // Show lines that have items in GODOWN or IN_BOX (merged "In Box" concept)
  const readyLines = lines.filter((l) => l.stages.GODOWN > 0 || l.stages.IN_BOX > 0)

  const groups = readyLines.reduce<Record<string, CustomerGroup>>((acc, line) => {
    const custId = line.customer?.id ?? '__unlinked__'
    const custName = line.customer?.name ?? 'Unlinked orders'
    acc[custId] ??= { id: custId, name: custName, siteAddress: line.customer?.siteAddress ?? null, lines: [] }
    acc[custId].lines.push(line)
    return acc
  }, {})

  const customerGroups = Object.values(groups).sort((a, b) => b.lines.length - a.lines.length)

  if (readyLines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="text-4xl">▷</div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Nothing to dispatch right now</p>
        <p className="max-w-sm text-sm text-[var(--text-muted)]">
          Items appear here once they reach <strong>In Box</strong>.
          Go to <strong>Track Stock</strong>, find the product, then use Move Stock to mark it In Box.
        </p>
      </div>
    )
  }

  async function executeDispatch() {
    if (!confirm) return
    setDispatching(true)
    setErr('')

    try {
      const calls: Promise<{ stageTotals?: HeaderCounts; error?: string }>[] = []

      for (const line of confirm.lines) {
        const note = [confirm.challan ? `Challan: ${confirm.challan}` : '', confirm.note]
          .filter(Boolean)
          .join(' | ') || undefined

        if (line.stages.GODOWN > 0) {
          calls.push(
            fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fromStage: 'GODOWN', toStage: 'DISPATCHED', qty: line.stages.GODOWN, note }),
            }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
          )
        }

        if (line.stages.IN_BOX > 0) {
          calls.push(
            fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fromStage: 'IN_BOX', toStage: 'DISPATCHED', qty: line.stages.IN_BOX, note }),
            }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
          )
        }
      }

      const results = await Promise.all(calls)
      const lastSuccess = [...results].reverse().find((r) => r.stageTotals)

      if (lastSuccess?.stageTotals) {
        for (const line of confirm.lines) {
          const totalQty = line.stages.GODOWN + line.stages.IN_BOX
          if (totalQty > 0) {
            onMoved(lastSuccess.stageTotals, line.id, 'IN_BOX', 'DISPATCHED', totalQty)
          }
        }
      }

      setDispatched((prev) => [...prev, confirm.customerId])
      setConfirm(null)
    } catch {
      setErr('Network error — some items may not have dispatched')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Dispatch Queue</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {readyLines.length} item{readyLines.length !== 1 ? 's' : ''} packed and ready across {customerGroups.length} customer{customerGroups.length !== 1 ? 's' : ''}.
        </p>
      </div>

      <div className="space-y-4">
        {customerGroups.map((group) => {
          const totalUnits = group.lines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)
          const isRecentlyDispatched = dispatched.includes(group.id)

          if (isRecentlyDispatched) {
            return (
              <div key={group.id} className="rounded-[20px] border border-[#bbf7d0] bg-[#f0fdf4] p-5">
                <p className="text-sm font-semibold text-[#15803d]">✓ Dispatched — {group.name}</p>
                <p className="mt-0.5 text-xs text-[#16a34a]">Items moved to Dispatched stage. Refresh to confirm.</p>
              </div>
            )
          }

          return (
            <div key={group.id} className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white">
              {/* Customer header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--n-50)] px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{group.name}</p>
                  {group.siteAddress && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{group.siteAddress}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]"
                    style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirm({
                      customerId: group.id,
                      lines: group.lines,
                      challan: '',
                      note: '',
                    })}
                    className="rounded-lg bg-[#0f172a] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-black"
                  >
                    Dispatch all →
                  </button>
                </div>
              </div>

              {/* Line items */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[rgba(0,0,0,0.02)]">
                    <th className="py-2 pl-5 pr-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">In Box</th>
                    <th className="py-2 pl-2 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {group.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 pl-5 pr-2">
                        <p className="font-medium text-[var(--text-primary)]">{line.product.name}</p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">{line.product.sku}</p>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span
                          className="text-base font-semibold text-[#2563eb]"
                          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {line.stages.GODOWN + line.stages.IN_BOX}
                        </span>
                      </td>
                      <td className="py-3 pl-2 pr-5 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectLine(line.id)}
                          className="text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Dispatch confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Confirm Dispatch
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Dispatching {confirm.lines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)} units to{' '}
              <strong className="text-[var(--text-primary)]">
                {groups[confirm.customerId]?.name ?? 'customer'}
              </strong>.
              This will move all packed items to Dispatched.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Challan / delivery note number
                </label>
                <input
                  type="text"
                  value={confirm.challan}
                  onChange={(e) => setConfirm((c) => c ? { ...c, challan: e.target.value } : c)}
                  placeholder="e.g. BCH-DC-2026-089"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Dispatch note (optional)
                </label>
                <input
                  type="text"
                  value={confirm.note}
                  onChange={(e) => setConfirm((c) => c ? { ...c, note: e.target.value } : c)}
                  placeholder="e.g. Delivered via Blue Dart, tracking #…"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
                />
              </div>
            </div>

            {err && (
              <p className="mt-3 rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void executeDispatch()}
                disabled={dispatching}
                className="flex-1 rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
              >
                {dispatching ? 'Dispatching…' : 'Confirm Dispatch'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirm(null); setErr('') }}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
