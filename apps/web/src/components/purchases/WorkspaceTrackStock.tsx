'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  getLinePrimaryStatus,
  getLineDispatchStatuses,
  DISPATCH_STATUS_TO_STAGE,
  STAGE_LABEL,
  STAGE_COLORS,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import { exportToCSV } from '@/lib/purchases-export'

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

// ─── Grid columns ─────────────────────────────────────────────────────────────
// Image | Product + SKU | Customer | Brand | Stage | Qty
const GRID = 'grid grid-cols-[56px_minmax(0,2fr)_minmax(0,1.4fr)_80px_140px_56px]'

// ─── Product thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div style={{ width: 44, height: 44, position: 'relative', flexShrink: 0 }}>
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
    <div
      className="flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)]"
      style={{ width: 44, height: 44, flexShrink: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}
    >
      {line.product.brand.slice(0, 3).toUpperCase()}
    </div>
  )
}

// ─── Stage pill ───────────────────────────────────────────────────────────────

function StagePill({ line }: { line: PurchaseTrackerLine }) {
  const primary = getLinePrimaryStatus(line)
  const stage = DISPATCH_STATUS_TO_STAGE[primary]
  const label = STAGE_LABEL[stage]
  const color = STAGE_COLORS[stage]

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

// ─── Stock row ────────────────────────────────────────────────────────────────

function StockRow({
  line,
  onSelectLine,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
}) {
  const primary = getLinePrimaryStatus(line)
  const isDone = primary === 'done'

  const primaryQty = getLineDispatchStatuses(line)[0]?.qty ?? 0

  return (
    <div
      className={[
        GRID,
        'cursor-pointer items-center gap-0 border-b border-[var(--border)] px-4 py-2.5 transition hover:bg-[var(--n-50)]',
        isDone ? 'opacity-60' : '',
      ].join(' ')}
      onClick={() => onSelectLine(line.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelectLine(line.id) }}
    >
      {/* Image */}
      <div className="pr-3">
        <ProductThumb line={line} />
      </div>

      {/* Product + SKU */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
      </div>

      {/* Customer */}
      <div className="min-w-0 pr-3">
        {line.customer ? (
          <>
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.customer.name}</p>
            {line.customer.siteAddress && (
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{line.customer.siteAddress}</p>
            )}
          </>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">No customer</span>
        )}
      </div>

      {/* Brand */}
      <div className="pr-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{line.product.brand}</span>
      </div>

      {/* Stage */}
      <div className="pr-3">
        <StagePill line={line} />
      </div>

      {/* Qty */}
      <div className="text-center">
        <p
          className="text-base font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {primaryQty}
        </p>
        <p className="text-[9px] text-[var(--text-muted)]">units</p>
      </div>
    </div>
  )
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className={`${GRID} sticky top-[49px] z-10 border-b border-[var(--border)] bg-[var(--n-50)] px-4 py-2`}>
      <div />
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product · SKU</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Brand</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stage</div>
      <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type StageFilter = 'all' | 'PENDING_CO' | 'PENDING_DIST' | 'IN_BOX' | 'DISPATCHED'

const STAGE_FILTER_OPTIONS: { value: StageFilter; label: string }[] = [
  { value: 'all',         label: 'All stock' },
  { value: 'PENDING_CO',  label: STAGE_LABEL.PENDING_CO },
  { value: 'PENDING_DIST',label: STAGE_LABEL.PENDING_DIST },
  { value: 'IN_BOX',      label: STAGE_LABEL.IN_BOX },
  { value: 'DISPATCHED',  label: STAGE_LABEL.DISPATCHED },
]

export default function WorkspaceTrackStock({
  lines,
  isLoading,
  onSelectLine,
}: Props) {
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')

  if (isLoading) return <LoadingSkeleton />

  const filtered = stageFilter === 'all'
    ? lines
    : lines.filter((l) => {
        if (stageFilter === 'PENDING_CO')   return l.stages.PENDING_CO > 0
        if (stageFilter === 'PENDING_DIST') return l.stages.PENDING_DIST > 0
        if (stageFilter === 'IN_BOX')       return l.stages.GODOWN > 0 || l.stages.IN_BOX > 0
        if (stageFilter === 'DISPATCHED')   return l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0
        return true
      })

  const sorted = [...filtered].sort((a, b) => {
    const stagePriority = (l: PurchaseTrackerLine) => {
      if (l.stages.IN_BOX > 0) return 0
      if (l.stages.GODOWN > 0) return 1
      if (l.stages.PENDING_DIST > 0) return 2
      if (l.stages.PENDING_CO > 0) return 3
      return 4
    }
    const diff = stagePriority(a) - stagePriority(b)
    if (diff !== 0) return diff
    return (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '')
  })

  const handleExport = () => {
    exportToCSV(filtered, `stock-${stageFilter}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">No stock yet</p>
        <p className="max-w-xs text-xs text-[var(--text-muted)]">Items appear here once a purchase order line is created.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Filter + export bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-2.5">
        {STAGE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStageFilter(opt.value)}
            className={[
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition',
              stageFilter === opt.value
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

      {/* All rows — no sections, no grouping */}
      {sorted.map((l) => (
        <StockRow key={l.id} line={l} onSelectLine={onSelectLine} />
      ))}

      {filtered.length === 0 && lines.length > 0 && (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">No lines match this filter.</div>
      )}
    </div>
  )
}
