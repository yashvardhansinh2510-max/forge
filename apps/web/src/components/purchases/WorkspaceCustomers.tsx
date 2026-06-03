'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  effectiveCeiling,
  getInBoxQty,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface CustomerBucket {
  id: string
  name: string
  siteAddress: string | null
  lines: PurchaseTrackerLine[]
}

interface TransferEntry {
  id: string
  fromStage: string
  toStage: string
  qty: number
  note: string | null
  movedAt: string
  movedBy: { name: string }
}

interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
}

const historyFetcher = async (url: string): Promise<TransferEntry[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { movements: TransferEntry[] }
  return data.movements
}

function CustomerDetail({
  customer,
  onSelectLine,
}: {
  customer: CustomerBucket
  activeBrand: BrandTab
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
}) {
  const [showDelivered, setShowDelivered] = useState(false)
  const { lines } = customer

  const readyLines = lines.filter((l) => l.stages.GODOWN > 0 || l.stages.IN_BOX > 0)
  const pendingLines = lines.filter((l) => l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0)
  const deliveredLines = lines.filter((l) => l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0)

  const { data: allMovements } = useSWR<TransferEntry[]>(
    lines.length > 0 ? `/api/purchase-orders/lines/${lines[0]!.id}/history` : null,
    historyFetcher,
  )
  const transferMovements = (allMovements ?? []).filter(
    (m) => m.toStage === 'TRANSFERRED_OUT' || m.fromStage === 'TRANSFERRED_IN',
  )

  const totalOrdered = lines.reduce((s, l) => s + l.qtyOrdered, 0)
  const totalInBox = readyLines.reduce((s, l) => s + l.stages.GODOWN + l.stages.IN_BOX, 0)
  const totalDispatched = lines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)
  const totalPending = pendingLines.reduce((s, l) => s + l.stages.PENDING_CO + l.stages.PENDING_DIST, 0)

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Customer</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{customer.name}</h2>
        {customer.siteAddress && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{customer.siteAddress}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Ordered', value: totalOrdered, color: '#6B7280' },
            { label: 'In Box', value: totalInBox, color: '#10B981' },
            { label: 'Pending', value: totalPending, color: '#F59E0B' },
            { label: 'Dispatched', value: totalDispatched, color: '#3B82F6' },
          ].map((chip) => (
            <div key={chip.label} className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5">
              <span className="text-xs text-[var(--text-muted)]">{chip.label} </span>
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: chip.color }}
              >
                {chip.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Ready to Dispatch */}
      {readyLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]">
          <div className="border-b border-[#bbf7d0] px-4 py-3">
            <p className="text-sm font-semibold text-[#15803d]">
              ● {totalInBox} unit{totalInBox !== 1 ? 's' : ''} ready to dispatch
            </p>
          </div>
          <div className="divide-y divide-[#bbf7d0]">
            {readyLines.map((line) => {
              const qty = line.stages.GODOWN + line.stages.IN_BOX
              return (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{line.product.brand} · {line.product.sku}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-3 shrink-0">
                    <span
                      className="text-base font-bold text-[#15803d]"
                      style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      ×{qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectLine(line.id, 'move')}
                      className="rounded-lg bg-[#15803d] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#166534]"
                    >
                      Dispatch ▷
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 2: Coming Soon */}
      {pendingLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bfdbfe] bg-[#eff6ff]">
          <div className="border-b border-[#bfdbfe] px-4 py-3">
            <p className="text-sm font-semibold text-[#1d4ed8]">
              {totalPending} unit{totalPending !== 1 ? 's' : ''} coming soon
            </p>
          </div>
          <div className="divide-y divide-[#bfdbfe]">
            {pendingLines.map((line) => {
              const fromCo = line.stages.PENDING_CO
              const fromDist = line.stages.PENDING_DIST
              const ageDays = line.createdAt
                ? Math.floor((Date.now() - new Date(line.createdAt).getTime()) / 86_400_000)
                : null
              return (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)]">
                      {fromCo > 0 && <span>Order in Company ×{fromCo}</span>}
                      {fromDist > 0 && <span>Company Billing ×{fromDist}</span>}
                      {ageDays !== null && ageDays > 14 && (
                        <span className="font-semibold text-[#d97706]">{ageDays}d — follow up</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id)}
                    className="ml-3 shrink-0 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                  >
                    Details
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 3: Transfers */}
      {transferMovements.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-[#fffbeb]">
          <div className="border-b border-[#fde68a] px-4 py-3">
            <p className="text-sm font-semibold text-[#92400e]">Transfers</p>
          </div>
          <div className="divide-y divide-[#fde68a]">
            {transferMovements.slice(0, 5).map((m) => (
              <div key={m.id} className="px-4 py-3">
                <p className="text-xs text-[var(--text-primary)]">
                  {m.fromStage === 'TRANSFERRED_IN' ? '↱ Received' : '↰ Given'} · {m.qty} unit{m.qty > 1 ? 's' : ''}
                </p>
                {m.note && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{m.note}</p>}
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {new Date(m.movedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {m.movedBy.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Delivered (collapsed) */}
      {deliveredLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <button
            type="button"
            onClick={() => setShowDelivered((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Delivered · {deliveredLines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)} units
            </p>
            <span className="text-[var(--text-muted)]">{showDelivered ? '▲' : '▾'}</span>
          </button>
          {showDelivered && (
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {deliveredLines.map((line) => (
                <div key={line.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{line.product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      ✓ {line.stages.DISPATCHED + line.stages.NOT_DISPLAYED} dispatched
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id, 'history')}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Log
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {readyLines.length === 0 && pendingLines.length === 0 && deliveredLines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-10 text-center text-sm text-[var(--text-muted)]">
          No purchase activity for this customer.
        </div>
      )}
    </div>
  )
}

export default function WorkspaceCustomers({ lines, activeBrand, onMoved, onSelectLine }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const customers = lines.reduce<Record<string, CustomerBucket>>((acc, line) => {
    if (!line.customer) return acc
    const b = acc[line.customer.id] ?? {
      id: line.customer.id,
      name: line.customer.name,
      siteAddress: line.customer.siteAddress,
      lines: [],
    }
    b.lines.push(line)
    acc[line.customer.id] = b
    return acc
  }, {})

  const customerList = Object.values(customers)
    .filter((c) => {
      const q = search.trim().toLowerCase()
      return !q || c.name.toLowerCase().includes(q) || (c.siteAddress?.toLowerCase().includes(q) ?? false)
    })
    .sort((a, b) => {
      const aReady = a.lines.reduce((s, l) => s + getInBoxQty(l), 0)
      const bReady = b.lines.reduce((s, l) => s + getInBoxQty(l), 0)
      if (aReady !== bReady) return bReady - aReady
      return a.name.localeCompare(b.name)
    })

  useEffect(() => {
    if (!customerList.some((c) => c.id === selectedId)) {
      setSelectedId(customerList[0]?.id ?? null)
    }
  }, [customerList, selectedId])

  const selected = customerList.find((c) => c.id === selectedId) ?? null

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">No customer lines match the current filter.</p>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)]">
      {/* Customer list */}
      <aside className="overflow-y-auto border-r border-[var(--border)] bg-white">
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-white p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--n-50)] px-3 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
          />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {customerList.map((c) => {
            const inBox = c.lines.reduce((s, l) => s + getInBoxQty(l), 0)
            const dispatched = c.lines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)
            const effective = c.lines.reduce((s, l) => s + effectiveCeiling(l), 0)
            const pct = effective > 0 ? Math.round((dispatched / effective) * 100) : 0
            const active = c.id === selectedId

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={['w-full p-4 text-left transition', active ? 'bg-[#f8fbff]' : 'hover:bg-[var(--n-50)]'].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--n-100)] text-sm font-semibold text-[var(--text-secondary)]">
                    {c.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{c.name}</p>
                    {c.siteAddress && (
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{c.siteAddress}</p>
                    )}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pct > 60 ? '#3B82F6' : '#F59E0B' }}
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                        {dispatched}/{effective} dispatched
                      </span>
                      {inBox > 0 && (
                        <span className="rounded-full bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803d]">
                          {inBox} in box
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Customer detail */}
      <section className="overflow-y-auto bg-[var(--bg)]">
        {selected ? (
          <CustomerDetail
            customer={selected}
            activeBrand={activeBrand}
            onSelectLine={onSelectLine}
            onMoved={onMoved}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Select a customer from the list.
          </div>
        )}
      </section>
    </div>
  )
}
