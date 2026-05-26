'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import TransferModal from '@/components/purchases/TransferModal'
import MoveStageModal from '@/components/purchases/MoveStageModal'
import { useTransferHistory } from '@/lib/procurement-store'
import {
  STAGE_LABEL,
  STAGE_ORDER,
  matchesBrandTab,
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

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--n-50)] px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color }}
      >
        {value}
      </span>
    </div>
  )
}

function ProgressBar({ stages, total }: { stages: HeaderCounts; total: number }) {
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-[var(--n-100)]" />

  const segments = [
    { qty: stages.DISPATCHED, color: '#10B981' },
    { qty: stages.IN_BOX,     color: '#06B6D4' },
    { qty: stages.AT_GODOWN,  color: '#8B5CF6' },
    { qty: stages.ORDERED,    color: '#F59E0B' },
    { qty: stages.NEEDS_PO,   color: '#E5E7EB' },
  ]

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full">
      {segments.map((seg, i) => {
        if (seg.qty === 0) return null
        const pct = (seg.qty / total) * 100
        return (
          <div
            key={i}
            className="h-full"
            style={{ width: `${pct}%`, background: seg.color }}
          />
        )
      })}
    </div>
  )
}

interface LineTableRowProps {
  line:               PurchaseTrackerLine
  activeBrand:        BrandTab
  allLines:           PurchaseTrackerLine[]
  sourceCustomerId:   string
  sourceCustomerName: string
  onMoved:            (newCounts: HeaderCounts) => void
}

function LineTableRow({
  line,
  activeBrand,
  allLines,
  sourceCustomerId,
  sourceCustomerName,
  onMoved,
}: LineTableRowProps) {
  const [transferOpen, setTransferOpen] = useState(false)
  const [moveOpen, setMoveOpen]         = useState(false)

  const total  = line.qtyOrdered
  const stages = line.stages

  const activeStages = STAGE_ORDER.filter((s) => stages[s] > 0)
  const firstStage   = activeStages[0] as PurchaseStage | undefined
  const canTransfer  = stages.AT_GODOWN > 0 || stages.IN_BOX > 0
  const canMove      = firstStage !== undefined && firstStage !== 'DISPATCHED'

  return (
    <>
      <tr className="border-t border-[var(--border)] transition hover:bg-[var(--n-50)]">
        <td className="py-3 pr-4 pl-5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
          <p
            className="text-xs text-[var(--text-muted)]"
            style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
          >
            {line.product.sku}
          </p>
          <div className="mt-2 w-full max-w-[180px]">
            <ProgressBar stages={stages} total={total} />
          </div>
        </td>
        <td
          className="py-3 pr-3 text-center text-sm tabular-nums text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {total}
        </td>
        <td
          className="py-3 pr-3 text-center text-sm tabular-nums text-emerald-600"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {stages.DISPATCHED || <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td
          className="py-3 pr-3 text-center text-sm tabular-nums text-violet-600"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {stages.AT_GODOWN + stages.IN_BOX || <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td
          className="py-3 pr-3 text-center text-sm tabular-nums text-amber-600"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {stages.ORDERED || <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td
          className="py-3 pr-3 text-center text-sm tabular-nums text-blue-600"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {stages.NEEDS_PO || <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td className="py-3 pr-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {canTransfer && (
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                title="Transfer items to another customer"
                className="flex h-7 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <ArrowRightLeft size={12} />
                Transfer
              </button>
            )}
            {canMove && firstStage && (
              <button
                type="button"
                onClick={() => setMoveOpen(true)}
                className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
              >
                Move →
              </button>
            )}
          </div>
        </td>
      </tr>

      {transferOpen && (
        <TransferModal
          line={line}
          sourceCustomerId={sourceCustomerId}
          sourceCustomerName={sourceCustomerName}
          allLines={allLines}
          onClose={() => setTransferOpen(false)}
          onTransferred={(counts) => { setTransferOpen(false); onMoved(counts) }}
        />
      )}

      {moveOpen && firstStage && (
        <MoveStageModal
          line={line}
          currentStage={firstStage}
          availableQty={stages[firstStage]}
          onClose={() => setMoveOpen(false)}
          onMoved={(counts) => { setMoveOpen(false); onMoved(counts) }}
          brandScope={activeBrand}
        />
      )}
    </>
  )
}

// ─── Transfer history section ────────────────────────────────────────────────

const STAGE_LABELS_SHORT: Record<string, string> = {
  AT_GODOWN:  'Godown',
  IN_BOX:     'In Box',
  DISPATCHED: 'Dispatched',
}

function TransfersSection({ customerId }: { customerId: string }) {
  const history = useTransferHistory()
  const records = history.filter(
    (r) => r.fromCustomerId === customerId || r.toCustomerId === customerId,
  )

  if (records.length === 0) {
    return (
      <div className="mx-6 mb-6 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] py-8 text-center text-sm text-[var(--text-muted)]">
        No transfers recorded
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="bg-[var(--n-50)]">
            {['Date', 'Product', 'Qty', 'Direction', 'Other party', 'Stage', 'Notes'].map((h) => (
              <th
                key={h}
                className="py-2 pr-4 pl-5 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] first:pl-6"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const isOut = r.fromCustomerId === customerId
            return (
              <tr
                key={r.id}
                className="border-t border-[var(--border)] text-sm transition hover:bg-[var(--n-50)]"
              >
                <td className="py-2.5 pr-4 pl-6 text-xs tabular-nums text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(r.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="py-2.5 pr-4 text-xs font-medium text-[var(--text-primary)]">
                  {r.productName}
                </td>
                <td className="py-2.5 pr-4 text-xs tabular-nums text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.qty}
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      isOut
                        ? 'bg-orange-50 text-orange-600 border border-orange-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200',
                    ].join(' ')}
                  >
                    {isOut ? '→ Out' : '← In'}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-[var(--text-secondary)]">
                  {isOut ? r.toCustomerName : r.fromCustomerName}
                </td>
                <td className="py-2.5 pr-4 text-xs text-[var(--text-muted)]">
                  {STAGE_LABELS_SHORT[r.stage] ?? r.stage}
                </td>
                <td className="py-2.5 pr-6 text-xs text-[var(--text-muted)]">
                  {r.notes || <span className="opacity-40">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CustomerViewProps {
  lines:       PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved:     (newCounts: HeaderCounts) => void
}

export default function CustomerView({ lines, activeBrand, onMoved }: CustomerViewProps) {
  const [search, setSearch]       = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const customers = lines.reduce<Record<string, CustomerBucket>>((acc, line) => {
    if (!line.customer) return acc
    const bucket = acc[line.customer.id] ?? {
      id: line.customer.id,
      name: line.customer.name,
      siteAddress: line.customer.siteAddress,
      lines: [],
    }
    bucket.lines.push(line)
    acc[line.customer.id] = bucket
    return acc
  }, {})

  const customerList = Object.values(customers)
    .filter((c) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.siteAddress?.toLowerCase().includes(q) === true
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  useEffect(() => {
    if (!customerList.some((c) => c.id === selectedId)) {
      setSelectedId(customerList[0]?.id ?? null)
    }
  }, [customerList, selectedId])

  const selected      = customerList.find((c) => c.id === selectedId) ?? null
  const selectedLines = selected
    ? selected.lines
        .filter((l) => activeBrand === 'ALL' || matchesBrandTab(l.product.brand, activeBrand))
        .slice()
        .sort((a, b) => {
          const ai = STAGE_ORDER.findIndex((s) => a.stages[s] > 0)
          const bi = STAGE_ORDER.findIndex((s) => b.stages[s] > 0)
          return ai - bi || a.product.name.localeCompare(b.product.name)
        })
    : []

  const summary = selectedLines.reduce(
    (acc, l) => {
      acc.total      += l.qtyOrdered
      acc.dispatched += l.stages.DISPATCHED
      acc.atGodown   += l.stages.AT_GODOWN + l.stages.IN_BOX
      acc.ordered    += l.stages.ORDERED
      acc.needsPo    += l.stages.NEEDS_PO
      return acc
    },
    { total: 0, dispatched: 0, atGodown: 0, ordered: 0, needsPo: 0 },
  )

  return (
    <div className="grid min-h-[500px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or site…"
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--n-50)] px-4 py-2.5 text-sm outline-none transition focus:border-[#93c5fd] focus:bg-white"
        />

        <div className="flex-1 space-y-2 overflow-y-auto">
          {customerList.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">No customers found</p>
          ) : (
            customerList.map((c) => {
              const pending   = c.lines.reduce(
                (s, l) => s + l.stages.NEEDS_PO + l.stages.ORDERED + l.stages.AT_GODOWN + l.stages.IN_BOX,
                0,
              )
              const delivered = c.lines.reduce((s, l) => s + l.stages.DISPATCHED, 0)
              const active    = c.id === selectedId

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    'w-full rounded-2xl border p-3.5 text-left transition',
                    active
                      ? 'border-[#bfdbfe] bg-[#f0f7ff] shadow-[0_8px_20px_rgba(37,99,235,0.08)]'
                      : 'border-[var(--border)] bg-[var(--n-50)] hover:bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        active ? 'bg-[#2563eb] text-white' : 'bg-[var(--n-100)] text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {delivered > 0 ? `${delivered} delivered · ` : ''}{pending} pending
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <section className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        {selected ? (
          <>
            <div className="border-b border-[var(--border)] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Customer
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {selected.name}
              </h2>
              {selected.siteAddress && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{selected.siteAddress}</p>
              )}
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-2 gap-3 px-6 sm:grid-cols-5">
              <SummaryChip label="Total items" value={summary.total}      color="var(--text-primary)" />
              <SummaryChip label="Delivered"   value={summary.dispatched} color="#10B981" />
              <SummaryChip label="At godown"   value={summary.atGodown}   color="#8B5CF6" />
              <SummaryChip label="On order"    value={summary.ordered}    color="#F59E0B" />
              <SummaryChip label="Needs PO"    value={summary.needsPo}    color="#3B82F6" />
            </div>

            {/* Line item table */}
            {selectedLines.length === 0 ? (
              <div className="mx-6 mb-6 flex-1 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] py-12 text-center text-sm text-[var(--text-muted)]">
                No lines under the current brand filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-[var(--n-50)]">
                      <th className="py-2.5 pr-4 pl-6 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Product
                      </th>
                      <th className="py-2.5 pr-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Total
                      </th>
                      <th className="py-2.5 pr-3 text-center text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                        Delivered
                      </th>
                      <th className="py-2.5 pr-3 text-center text-[10px] font-semibold uppercase tracking-widest text-violet-500">
                        At godown
                      </th>
                      <th className="py-2.5 pr-3 text-center text-[10px] font-semibold uppercase tracking-widest text-amber-500">
                        On order
                      </th>
                      <th className="py-2.5 pr-3 text-center text-[10px] font-semibold uppercase tracking-widest text-blue-500">
                        Needs PO
                      </th>
                      <th className="py-2.5 pr-6 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLines.map((line) => (
                      <LineTableRow
                        key={line.id}
                        line={line}
                        activeBrand={activeBrand}
                        allLines={lines}
                        sourceCustomerId={selected.id}
                        sourceCustomerName={selected.name}
                        onMoved={onMoved}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Transfers section */}
            <div className="mt-2 border-t border-[var(--border)] px-6 pb-6 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Transfers
              </p>
              <TransfersSection customerId={selected.id} />
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center text-sm text-[var(--text-muted)]">
            Select a customer to view their purchase pipeline.
          </div>
        )}
      </section>
    </div>
  )
}
