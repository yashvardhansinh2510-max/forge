'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  DISPATCH_STATUS_BG,
  DISPATCH_STATUS_COLOR,
  DISPATCH_STATUS_LABEL,
  STAGE_COLORS,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  type BrandTab,
  type DispatchStatus,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface Props {
  lines: PurchaseTrackerLine[]
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  isLoading: boolean
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoveMaterial?: (productId: string, sourceLineId: string) => void
}

const STATUS_FILTER_OPTIONS: { value: DispatchStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All stock' },
  { value: 'ready', label: 'Ready' },
  { value: 'awaiting_packing', label: 'Awaiting Packing' },
  { value: 'awaiting_distributor', label: 'With Distributor' },
  { value: 'awaiting_company', label: 'Awaiting Company' },
]

// ─── Stage tracker ──────────────────────────────────────────────────────────────

const TRACKER_STAGES: { stage: PurchaseStage; short: string }[] = [
  { stage: 'PENDING_CO',   short: 'Ordered'  },
  { stage: 'PENDING_DIST', short: 'W/ Dist'  },
  { stage: 'GODOWN',       short: 'Godown'   },
  { stage: 'IN_BOX',       short: 'Packed'   },
  { stage: 'DISPATCHED',   short: 'Done'     },
]

function StageTracker({ stages }: { stages: PurchaseTrackerLine['stages'] }) {
  return (
    <div className="flex items-end gap-1">
      {TRACKER_STAGES.map(({ stage, short }, i) => {
        const qty = stages[stage]
        const active = qty > 0
        const color = STAGE_COLORS[stage]
        return (
          <div key={stage} className="flex items-center gap-1">
            {i > 0 && <div className="mb-3 h-px w-2 bg-[var(--border)]" />}
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold min-w-[28px] text-center leading-tight"
                style={{
                  background: active ? `${color}18` : 'var(--n-100)',
                  color: active ? color : 'var(--text-muted)',
                  border: active ? `1px solid ${color}30` : '1px solid transparent',
                }}
              >
                {active ? qty : '—'}
              </span>
              <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap leading-none">{short}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Product thumbnail ─────────────────────────────────────────────────────────

function ProductThumb({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div className="relative h-11 w-11 shrink-0">
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-lg border border-[var(--border)] object-contain p-0.5"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-[10px] font-bold text-[var(--text-muted)]">
      {line.product.brand.slice(0, 2)}
    </div>
  )
}

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status, qty }: { status: DispatchStatus; qty?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: DISPATCH_STATUS_BG[status], color: DISPATCH_STATUS_COLOR[status] }}
    >
      {status === 'ready' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {DISPATCH_STATUS_LABEL[status]}{qty !== undefined ? ` ×${qty}` : ''}
    </span>
  )
}

// ─── Mark Packed quick action ──────────────────────────────────────────────────

function MarkPackedButton({
  line,
  onMoved,
}: {
  line: PurchaseTrackerLine
  onMoved: Props['onMoved']
}) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const qty = line.stages.GODOWN

  async function doPack() {
    setSaving(true)
    setErr('')
    try {
      const note = location.trim() ? `Location: ${location.trim()}` : undefined
      const res = await fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromStage: 'GODOWN', toStage: 'IN_BOX', qty, note }),
      })
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string }
      if (!res.ok || !data.stageTotals) { setErr(data.message ?? 'Pack failed'); return }
      onMoved(data.stageTotals, line.id, 'GODOWN', 'IN_BOX', qty)
      setOpen(false)
      setLocation('')
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
      >
        Mark Packed
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Box / shelf (e.g. Rack B3)"
        autoFocus
        className="w-36 rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none focus:border-[#60a5fa]"
      />
      {err && <span className="text-[11px] text-[#dc2626]">{err}</span>}
      <button
        type="button"
        onClick={() => void doPack()}
        disabled={saving}
        className="rounded-lg bg-[#2563eb] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
      >
        {saving ? '…' : 'Pack'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ×
      </button>
    </div>
  )
}

// ─── Expanded row ──────────────────────────────────────────────────────────────

function ExpandedRow({
  line,
  onMoved,
  onSelectLine,
  onMoveMaterial,
}: {
  line: PurchaseTrackerLine
  onMoved: Props['onMoved']
  onSelectLine: Props['onSelectLine']
  onMoveMaterial?: Props['onMoveMaterial']
}) {
  const statuses = getLineDispatchStatuses(line)

  return (
    <tr>
      <td colSpan={6} className="border-b border-[var(--border)] bg-[#f8fbff] px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* All status breakdown */}
          <div className="flex flex-wrap gap-1.5">
            {statuses.map(({ status, qty }) => (
              <StatusPill key={status} status={status} qty={qty} />
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--border)]" />

          <p className="text-xs text-[var(--text-muted)]">
            Ordered: <span className="font-semibold text-[var(--text-primary)]">{line.qtyOrdered}</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            PO: <span className="font-mono font-semibold text-[var(--text-primary)]">{line.poNumber}</span>
          </p>

          <div className="ml-auto flex items-center gap-2">
            {line.stages.GODOWN > 0 && (
              <MarkPackedButton line={line} onMoved={onMoved} />
            )}
            {onMoveMaterial && (
              <button
                type="button"
                onClick={() => onMoveMaterial(line.product.id, line.id)}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
              >
                Move Material →
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectLine(line.id, 'move')}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
            >
              Move to Stage
            </button>
            <button
              type="button"
              onClick={() => onSelectLine(line.id, 'history')}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              History
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Excel export ──────────────────────────────────────────────────────────────

async function exportCurrentStock(lines: PurchaseTrackerLine[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Current Stock')

  ws.columns = [
    { header: 'SKU',         key: 'sku',         width: 26 },
    { header: 'Product',     key: 'name',        width: 42 },
    { header: 'Brand',       key: 'brand',       width: 12 },
    { header: 'Customer',    key: 'customer',    width: 30 },
    { header: 'Site',        key: 'site',        width: 28 },
    { header: 'Location',    key: 'location',    width: 22 },
    { header: 'Pend. CO',    key: 'pendingCo',   width: 10 },
    { header: 'Pend. Dist',  key: 'pendingDist', width: 11 },
    { header: 'At Godown',   key: 'godown',      width: 11 },
    { header: 'In Box',      key: 'inBox',       width: 9  },
    { header: 'Dispatched',  key: 'dispatched',  width: 12 },
    { header: 'Status',      key: 'status',      width: 20 },
  ]

  for (const line of lines) {
    const primary = getLinePrimaryStatus(line)
    ws.addRow({
      sku:        line.product.sku,
      name:       line.product.name,
      brand:      line.product.brand,
      customer:   line.customer?.name ?? '',
      site:       line.customer?.siteAddress ?? '',
      location:   line.locationNote ?? '',
      pendingCo:  line.stages.PENDING_CO,
      pendingDist:line.stages.PENDING_DIST,
      godown:     line.stages.GODOWN,
      inBox:      line.stages.IN_BOX,
      dispatched: line.stages.DISPATCHED,
      status:     DISPATCH_STATUS_LABEL[primary],
    })
  }

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stock-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

// ─── Status filter bar ─────────────────────────────────────────────────────────

function StatusFilterBar({
  value,
  onChange,
  total,
  filtered,
  onExport,
  exporting,
}: {
  value: DispatchStatus | 'all'
  onChange: (v: DispatchStatus | 'all') => void
  total: number
  filtered: number
  onExport: () => void
  exporting: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-full border px-3 py-1 text-xs font-semibold transition',
            value === opt.value
              ? 'border-[#0f172a] bg-[#0f172a] text-white'
              : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
      <span className="ml-auto text-xs text-[var(--text-muted)]">
        {filtered === total ? `${total} lines` : `${filtered} of ${total}`}
      </span>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:opacity-40"
      >
        {exporting ? 'Exporting…' : '↓ Export .xlsx'}
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceTrackStock({
  lines,
  isLoading,
  onMoved,
  onSelectLine,
  onMoveMaterial,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  if (isLoading) return <LoadingSkeleton />

  const physicalLines = lines.filter(
    (l) =>
      l.stages.PENDING_CO > 0 ||
      l.stages.PENDING_DIST > 0 ||
      l.stages.GODOWN > 0 ||
      l.stages.IN_BOX > 0 ||
      l.stages.DISPATCHED > 0 ||
      l.stages.NOT_DISPLAYED > 0,
  )

  const filtered = statusFilter === 'all'
    ? physicalLines
    : physicalLines.filter((l) => {
        const statuses = getLineDispatchStatuses(l)
        return statuses.some((s) => s.status === statusFilter)
      })

  const sorted = [...filtered].sort((a, b) => {
    const statusOrder: Record<DispatchStatus, number> = {
      ready: 0,
      awaiting_packing: 1,
      awaiting_distributor: 2,
      awaiting_company: 3,
      done: 4,
    }
    const diff = statusOrder[getLinePrimaryStatus(a)] - statusOrder[getLinePrimaryStatus(b)]
    if (diff !== 0) return diff
    return (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '')
  })

  async function handleExport() {
    setExporting(true)
    try { await exportCurrentStock(sorted) } finally { setExporting(false) }
  }

  if (sorted.length === 0) {
    return (
      <div className="p-6">
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} total={physicalLines.length} filtered={0} onExport={handleExport} exporting={exporting} />
        <div className="mt-6 flex h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-white text-sm text-[var(--text-muted)]">
          {physicalLines.length === 0
            ? 'No stock in warehouse yet. Items appear once moved past the Unallocated stage.'
            : 'No lines match this filter.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-white px-6 py-3">
        <StatusFilterBar value={statusFilter} onChange={setStatusFilter} total={physicalLines.length} filtered={sorted.length} onExport={handleExport} exporting={exporting} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--n-50)]">
              <th className="w-14 py-2.5 pl-4 pr-1 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]" />
              <th className="py-2.5 pl-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stage</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Location</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</th>
              <th className="py-2.5 pl-3 pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((line) => {
              const primary = getLinePrimaryStatus(line)
              const isExpanded = expandedId === line.id
              const primaryQty = getLineDispatchStatuses(line).find((s) => s.status === primary)?.qty ?? 0
              const totalQty = Object.values(line.stages).reduce((s, n) => s + n, 0)

              return [
                <tr
                  key={line.id}
                  onClick={() => setExpandedId(isExpanded ? null : line.id)}
                  className={[
                    'cursor-pointer transition hover:bg-[var(--n-50)]',
                    isExpanded ? 'bg-[#f8fbff]' : '',
                  ].join(' ')}
                >
                  {/* Image */}
                  <td className="py-3 pl-4 pr-1">
                    <ProductThumb line={line} />
                  </td>

                  {/* Product + Customer */}
                  <td className="py-3 pl-2 pr-3 max-w-[220px]">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{line.product.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
                    {line.customer && (
                      <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] truncate">{line.customer.name}</p>
                    )}
                  </td>

                  {/* Stage tracker */}
                  <td className="px-3 py-3">
                    <StageTracker stages={line.stages} />
                  </td>

                  {/* Location */}
                  <td className="px-3 py-3 max-w-[140px]">
                    {line.locationNote ? (
                      <span
                        className="inline-block rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] truncate max-w-full"
                        title={line.locationNote}
                      >
                        📦 {line.locationNote.replace(/^Location:\s*/i, '')}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">—</span>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="px-3 py-3 text-center">
                    <span
                      className="font-semibold text-[var(--text-primary)]"
                      style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {primaryQty}
                      {totalQty !== primaryQty && (
                        <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">/ {totalQty}</span>
                      )}
                    </span>
                  </td>

                  {/* Expand */}
                  <td className="py-3 pl-3 pr-6 text-right">
                    <span className="text-xs text-[var(--text-muted)]">{isExpanded ? '▲' : '▾'}</span>
                  </td>
                </tr>,
                isExpanded && (
                  <ExpandedRow
                    key={`${line.id}-expanded`}
                    line={line}
                    onMoved={onMoved}
                    onSelectLine={onSelectLine}
                    onMoveMaterial={onMoveMaterial}
                  />
                ),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
