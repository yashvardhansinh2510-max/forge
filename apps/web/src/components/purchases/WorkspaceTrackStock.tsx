'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  formatRelativeTime,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  lastActivityColor,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import { exportToCSV } from '@/lib/purchases-export'
import StageTracker from '@/components/purchases/StageTracker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  lines: PurchaseTrackerLine[]
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  isLoading: boolean
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoveMaterial?: (productId: string, sourceLineId: string) => void
}

type StatusFilter = 'all' | 'ready' | 'awaiting_packing' | 'awaiting_distributor' | 'awaiting_company'

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',                  label: 'All stock' },
  { value: 'ready',                label: '● Ready' },
  { value: 'awaiting_packing',     label: 'Awaiting Packing' },
  { value: 'awaiting_distributor', label: 'With Distributor' },
  { value: 'awaiting_company',     label: 'Awaiting Company' },
]

// ─── Grid columns ─────────────────────────────────────────────────────────────
const GRID = 'grid grid-cols-[72px_minmax(0,1fr)_160px_220px_56px_140px_136px]'

// ─── Product thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ line, size = 64 }: { line: PurchaseTrackerLine; size?: number }) {
  if (line.product.imageUrl) {
    return (
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-xl border border-[var(--border)] object-contain p-1"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--n-50)]"
      style={{ width: size, height: size, flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}
    >
      {line.product.brand.slice(0, 3).toUpperCase()}
    </div>
  )
}

// ─── Finish pill ──────────────────────────────────────────────────────────────

function FinishPill({ finishName }: { finishName: string }) {
  const color =
    /chrome|chromé/i.test(finishName)          ? '#c0c0c0' :
    /brushed.?nickel|nickel.?brossé/i.test(finishName) ? '#a8a8a8' :
    /graphite|graph/i.test(finishName)         ? '#3d3d3d' :
    /gold|or\b/i.test(finishName)              ? '#c5a028' :
    /white|blanc/i.test(finishName)            ? '#f5f5f4' :
    /black|noir/i.test(finishName)             ? '#1c1c1c' :
    /steel|inox/i.test(finishName)             ? '#b0b8c1' :
    '#9ca3af'

  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--n-50)] px-1.5 py-0.5">
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{finishName}</span>
    </span>
  )
}

// ─── Mark Packed inline action ────────────────────────────────────────────────

function MarkPackedAction({
  line,
  onMoved,
  onDone,
}: {
  line: PurchaseTrackerLine
  onMoved: Props['onMoved']
  onDone: () => void
}) {
  const [location, setLocation] = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const qty = line.stages.GODOWN

  async function doPack() {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStage: 'GODOWN',
            toStage:   'IN_BOX',
            qty,
            location:  location.trim() || undefined,
          }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string }
      if (!res.ok || !data.stageTotals) { setErr(data.message ?? 'Pack failed'); return }
      onMoved(data.stageTotals, line.id, 'GODOWN', 'IN_BOX', qty)
      onDone()
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Box / shelf"
        autoFocus
        className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none focus:border-[#60a5fa]"
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
      <button type="button" onClick={onDone} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
    </div>
  )
}

// ─── Next-action button ───────────────────────────────────────────────────────

function NextActionButton({
  line,
  onSelectLine,
  onMoved,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
}) {
  const [packing, setPacking] = useState(false)
  const primary = getLinePrimaryStatus(line)

  if (packing) {
    return <MarkPackedAction line={line} onMoved={onMoved} onDone={() => setPacking(false)} />
  }

  if (primary === 'ready') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelectLine(line.id, 'move') }}
        className="w-full rounded-lg bg-[#10b981] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#059669]"
      >
        Dispatch ▷
      </button>
    )
  }

  if (primary === 'awaiting_packing') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setPacking(true) }}
        className="w-full rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[11px] font-bold text-[#2563eb] transition hover:bg-[#dbeafe]"
      >
        Mark Packed →
      </button>
    )
  }

  if (primary === 'awaiting_distributor') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelectLine(line.id, 'history') }}
        className="w-full rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-3 py-2 text-[11px] font-bold text-[#d97706] transition hover:bg-[#fef3c7]"
      >
        Follow Up ⚠
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelectLine(line.id) }}
      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)]"
    >
      View →
    </button>
  )
}

// ─── Stock row ────────────────────────────────────────────────────────────────

function StockRow({
  line,
  onSelectLine,
  onMoved,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
}) {
  const primary    = getLinePrimaryStatus(line)
  const primaryQty = getLineDispatchStatuses(line).find((s) => s.status === primary)?.qty ?? 0

  const rowBg =
    primary === 'ready'            ? 'bg-[#f0fdf4] hover:bg-[#dcfce7]' :
    primary === 'awaiting_packing' ? 'hover:bg-[var(--n-50)]' :
    'opacity-90 hover:bg-[var(--n-50)]'

  const leftBorder =
    primary === 'ready'                ? '3px solid #10b981' :
    primary === 'awaiting_packing'     ? '3px solid #2563eb' :
    primary === 'awaiting_distributor' ? '3px solid #f59e0b' :
    '3px solid transparent'

  return (
    <div
      className={`${GRID} cursor-pointer items-center gap-0 border-b border-[var(--border)] px-4 py-3 transition ${rowBg}`}
      style={{ borderLeft: leftBorder }}
      onClick={() => onSelectLine(line.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelectLine(line.id) }}
    >
      {/* Thumbnail */}
      <div className="pr-3">
        <ProductThumb line={line} size={60} />
      </div>

      {/* Product + finish */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
        {line.product.finishName && <FinishPill finishName={line.product.finishName} />}
      </div>

      {/* Customer + project */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {line.customer?.name ?? <span className="text-[var(--text-muted)]">No customer</span>}
        </p>
        {line.customer?.siteAddress && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{line.customer.siteAddress}</p>
        )}
      </div>

      {/* Stage tracker */}
      <div className="pr-3">
        <StageTracker line={line} />
      </div>

      {/* Qty */}
      <div className="pr-2 text-center">
        <p
          className="text-lg font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {primaryQty}
        </p>
        <p className="text-[9px] text-[var(--text-muted)]">units</p>
      </div>

      {/* Location + last activity */}
      <div className="pr-3">
        {line.currentLocation ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#bae6fd] bg-[#f0f9ff] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
            📦 {line.currentLocation}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">—</span>
        )}
        {line.lastActivityAt && (
          <p
            className="mt-1 text-[10px]"
            style={{ color: lastActivityColor(line.lastActivityAt) }}
          >
            {formatRelativeTime(new Date(line.lastActivityAt))}
          </p>
        )}
      </div>

      {/* Next action */}
      <div onClick={(e) => e.stopPropagation()}>
        <NextActionButton line={line} onSelectLine={onSelectLine} onMoved={onMoved} />
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label, count, color, bg,
}: {
  label: string; count: number; color: string; bg: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: bg, color }}>{count}</span>
    </div>
  )
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div
      className={`${GRID} border-b border-[var(--border)] bg-[var(--n-50)] px-4 py-2.5`}
      style={{ borderLeft: '3px solid transparent' }}
    >
      <div />
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer · Project</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stage</div>
      <div className="pr-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Location · Activity</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Next Action</div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkspaceTrackStock({
  lines,
  isLoading,
  onMoved,
  onSelectLine,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  if (isLoading) return <LoadingSkeleton />

  // Only lines with physical stock (exclude purely-unallocated)
  const physicalLines = lines.filter(
    (l) =>
      l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0 ||
      l.stages.GODOWN > 0     || l.stages.IN_BOX > 0 ||
      l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0,
  )

  // Apply status filter
  const filtered: PurchaseTrackerLine[] = statusFilter === 'all'
    ? physicalLines
    : physicalLines.filter((l) => getLinePrimaryStatus(l) === statusFilter)

  // Section grouping
  const readyLines   = filtered.filter((l) => l.stages.IN_BOX > 0)
  const packingLines = filtered.filter((l) => l.stages.GODOWN > 0 && l.stages.IN_BOX === 0)
  const waitingLines = filtered.filter(
    (l) =>
      (l.stages.PENDING_DIST > 0 || l.stages.PENDING_CO > 0) &&
      l.stages.GODOWN === 0 && l.stages.IN_BOX === 0,
  )

  // Sort each section
  const byCustomer = (a: PurchaseTrackerLine, b: PurchaseTrackerLine) =>
    (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '')
  readyLines.sort(byCustomer)
  packingLines.sort(byCustomer)
  // Waiting: stale first (oldest lastActivityAt first)
  waitingLines.sort((a, b) => {
    const aAge = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : Infinity
    const bAge = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : Infinity
    return aAge - bAge
  })

  const handleExport = () => {
    exportToCSV(
      filtered,
      `stock-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  if (physicalLines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">No physical stock yet</p>
        <p className="max-w-xs text-xs text-[var(--text-muted)]">
          Items appear here once they move past the Unallocated stage.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Filter + export bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={[
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition',
              statusFilter === opt.value
                ? 'border-[#0f172a] bg-[#0f172a] text-white'
                : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{filtered.length} lines</span>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[11px] font-semibold text-[#15803d] transition hover:bg-[#dcfce7]"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Column headers */}
      <TableHeader />

      {/* Ready section */}
      {readyLines.length > 0 && (
        <div>
          <SectionHeader label="● Ready to Dispatch" count={readyLines.length} color="#15803d" bg="#dcfce7" />
          {readyLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {/* Awaiting packing section */}
      {packingLines.length > 0 && (
        <div>
          <SectionHeader label="■ Awaiting Packing" count={packingLines.length} color="#1d4ed8" bg="#eff6ff" />
          {packingLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {/* Waiting external section */}
      {waitingLines.length > 0 && (
        <div>
          <SectionHeader label="⏳ Waiting — External" count={waitingLines.length} color="#d97706" bg="#fffbeb" />
          {waitingLines.map((l) => (
            <StockRow key={l.id} line={l} onSelectLine={onSelectLine} onMoved={onMoved} />
          ))}
        </div>
      )}

      {filtered.length === 0 && physicalLines.length > 0 && (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">No lines match this filter.</div>
      )}
    </div>
  )
}
