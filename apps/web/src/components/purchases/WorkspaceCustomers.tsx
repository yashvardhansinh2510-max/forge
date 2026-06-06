'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  getCustomerMetrics,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  DISPATCH_STATUS_LABEL,
  DISPATCH_STATUS_TO_STAGE,
  STAGE_COLORS,
  STAGE_LABEL,
  formatRelativeTime,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function ProductThumb({ line, size = 12 }: { line: PurchaseTrackerLine; size?: number }) {
  const dim = size === 12 ? 'h-12 w-12' : 'h-8 w-8'
  if (line.product.imageUrl) {
    return (
      <div className={`relative ${dim} shrink-0`}>
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
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-[10px] font-bold text-[var(--text-muted)]`}>
      {line.product.brand.slice(0, 3).toUpperCase()}
    </div>
  )
}

async function exportSingleCustomer(customer: CustomerBucket) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(customer.name.slice(0, 31))

  ws.columns = [
    { header: 'Customer',          key: 'customer',    width: 28 },
    { header: 'SKU',               key: 'sku',         width: 24 },
    { header: 'Product',           key: 'product',     width: 42 },
    { header: 'Brand',             key: 'brand',       width: 12 },
    { header: 'Stage',             key: 'stage',       width: 20 },
    { header: 'Qty',               key: 'qty',         width: 8  },
    { header: 'Dispatch Status',   key: 'dispatch',    width: 18 },
    { header: 'Location',          key: 'location',    width: 22 },
  ]

  for (const line of customer.lines) {
    const primary = getLinePrimaryStatus(line)
    const stageLabel = STAGE_LABEL[DISPATCH_STATUS_TO_STAGE[primary]]
    const { qty } = getLineDispatchStatuses(line)[0] ?? { qty: 0 }
    const dispatchStatus = DISPATCH_STATUS_LABEL[primary]

    ws.addRow({
      customer: customer.name,
      sku:      line.product.sku,
      product:  line.product.name,
      brand:    line.product.brand,
      stage:    stageLabel,
      qty,
      dispatch: dispatchStatus,
      location: line.locationNote ?? line.currentLocation ?? '',
    })
  }

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Export ${customer.name}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustomerBucket {
  id: string
  name: string
  siteAddress: string | null
  lines: PurchaseTrackerLine[]
}

interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoveMaterial?: (productId: string, sourceLineId: string) => void
}


// ─── Inventory table row ───────────────────────────────────────────────────────

const COL = 'grid grid-cols-[44px_minmax(0,2fr)_80px_64px_120px_96px_72px] items-center gap-x-3'

function InventoryRow({
  line,
  onSelectLine,
}: {
  line: PurchaseTrackerLine
  onSelectLine: Props['onSelectLine']
}) {
  const primary = getLinePrimaryStatus(line)
  const stage   = DISPATCH_STATUS_TO_STAGE[primary]
  const qty     = getLineDispatchStatuses(line)[0]?.qty ?? 0
  const color   = STAGE_COLORS[stage]
  const label   = STAGE_LABEL[stage]
  const lastMove = line.lastActivityAt
    ? formatRelativeTime(new Date(line.lastActivityAt))
    : '—'

  return (
    <div className={`${COL} border-b border-[var(--border)] px-4 py-2.5 transition hover:bg-[var(--n-50)]`}>
      <ProductThumb line={line} size={8} />

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
      </div>

      <div className="text-xs font-semibold text-[var(--text-secondary)]">{line.product.brand}</div>

      <div className="text-center">
        <span
          className="text-base font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {qty}
        </span>
      </div>

      <div>
        <span
          className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap"
          style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
        >
          {label}
        </span>
      </div>

      <div className="text-[11px] text-[var(--text-muted)]">{lastMove}</div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onSelectLine(line.id, 'move')}
          className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
        >
          Move →
        </button>
      </div>
    </div>
  )
}

// ─── Customer detail ───────────────────────────────────────────────────────────

function CustomerDetail({
  customer,
  onSelectLine,
  onMoveMaterial,
}: {
  customer: CustomerBucket
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
  onMoveMaterial?: Props['onMoveMaterial']
}) {
  const [exporting, setExporting] = useState(false)
  const { lines } = customer
  const metrics = getCustomerMetrics(lines)

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-6 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Customer</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{customer.name}</h2>
          {customer.siteAddress && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{customer.siteAddress}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setExporting(true)
              void exportSingleCustomer(customer).finally(() => setExporting(false))
            }}
            disabled={exporting}
            className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-xs font-semibold text-[#15803d] transition hover:bg-[#dcfce7] disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : `↓ Export ${customer.name}.xlsx`}
          </button>
          {onMoveMaterial && (
            <button
              type="button"
              onClick={() => onMoveMaterial(lines[0]?.product.id ?? '', lines[0]?.id ?? '')}
              className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Move Material →
            </button>
          )}
        </div>
      </div>

      {/* Metric chips */}
      <div className="grid grid-cols-5 gap-2 border-b border-[var(--border)] p-4">
        {([
          { label: 'Ordered',    value: metrics.ordered,    color: '#6B7280' },
          { label: 'Received',   value: metrics.received,   color: '#8B5CF6' },
          { label: 'Packed',     value: metrics.packed,     color: '#3B82F6' },
          { label: 'Dispatched', value: metrics.dispatched, color: '#10B981' },
          { label: 'Pending',    value: metrics.pending,    color: '#F59E0B' },
        ] as const).map((chip) => (
          <div key={chip.label} className="rounded-xl border border-[var(--border)] bg-white p-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{chip.label}</p>
            <p
              className="mt-0.5 text-xl font-bold"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: chip.color }}
            >
              {chip.value}
            </p>
          </div>
        ))}
      </div>

      {/* Inventory table */}
      {lines.length === 0 ? (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">
          No purchase activity for this customer.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className={`${COL} sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--n-50)] px-4 py-2`}>
            <div />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product · SKU</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Brand</div>
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stage</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Last move</div>
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Action</div>
          </div>
          {lines.map((line) => (
            <InventoryRow key={line.id} line={line} onSelectLine={onSelectLine} />
          ))}
        </>
      )}
    </div>
  )
}

// ─── Customer list card ─────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  active,
  onClick,
}: {
  customer: CustomerBucket
  active: boolean
  onClick: () => void
}) {
  const metrics = getCustomerMetrics(customer.lines)
  const dispatched = metrics.dispatched
  const effective = metrics.ordered

  // Stage counts using warehouse names
  const stageQtys = customer.lines.reduce(
    (acc, l) => {
      acc.oic  += l.stages.PENDING_CO
      acc.cb   += l.stages.PENDING_DIST
      acc.ib   += l.stages.GODOWN + l.stages.IN_BOX
      acc.disp += l.stages.DISPATCHED + l.stages.NOT_DISPLAYED
      return acc
    },
    { oic: 0, cb: 0, ib: 0, disp: 0 },
  )

  const stageSummary: { label: string; value: number; color: string; bg: string }[] = [
    { label: 'ORDER IN COMPANY', value: stageQtys.oic,  color: '#d97706', bg: '#fffbeb' },
    { label: 'COMPANY BILLING',  value: stageQtys.cb,   color: '#f97316', bg: '#fff7ed' },
    { label: 'IN BOX',       value: stageQtys.ib,   color: '#2563eb', bg: '#eff6ff' },
    { label: 'DISPATCHED',   value: stageQtys.disp, color: '#15803d', bg: '#f0fdf4' },
  ].filter((s) => s.value > 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className={['w-full p-4 text-left transition border-b border-[var(--border)]', active ? 'bg-[#f8fbff]' : 'hover:bg-[var(--n-50)]'].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--n-100)] text-sm font-semibold text-[var(--text-secondary)]">
          {customer.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{customer.name}</p>
            {metrics.hasAttention && (
              <span className="shrink-0 text-[11px] text-[#d97706]">⚠</span>
            )}
          </div>
          {customer.siteAddress && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{customer.siteAddress}</p>
          )}

          {/* Warehouse stage summary — instant at-a-glance */}
          {stageSummary.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {stageSummary.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.label}
                  <span
                    className="rounded-full px-1 py-0.5 text-[9px] font-bold text-white"
                    style={{ background: s.color }}
                  >
                    {s.value}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">{customer.lines.length} line{customer.lines.length !== 1 ? 's' : ''} — no active stock</p>
          )}

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            {metrics.ready > 0 && (
              <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">
                ● {metrics.ready} ready
              </span>
            )}
            <div className="flex-1 h-1 overflow-hidden rounded-full bg-[var(--n-100)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: effective > 0 ? `${Math.round((dispatched / effective) * 100)}%` : '0%',
                  background: dispatched === effective && effective > 0 ? '#10B981' : '#3B82F6',
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
              {dispatched}/{effective}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Main workspace component ───────────────────────────────────────────────────

export default function WorkspaceCustomers({ lines, activeBrand: _activeBrand, onMoved, onSelectLine, onMoveMaterial }: Props) {
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
      // Ready customers first, then by attention, then alphabetical
      const am = getCustomerMetrics(a.lines)
      const bm = getCustomerMetrics(b.lines)
      if (am.ready !== bm.ready) return bm.ready - am.ready
      const aAttn = am.hasAttention ? 1 : 0
      const bAttn = bm.hasAttention ? 1 : 0
      if (aAttn !== bAttn) return bAttn - aAttn
      return a.name.localeCompare(b.name)
    })

  useEffect(() => {
    if (selectedId && !customerList.some((c) => c.id === selectedId)) {
      setSelectedId(null)
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
    <div className="grid h-full grid-cols-[300px_minmax(0,1fr)]">
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
        <div>
          {customerList.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              active={c.id === selectedId}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>
      </aside>

      {/* Customer detail */}
      <section className="overflow-y-auto bg-[var(--bg)]">
        {selected ? (
          <CustomerDetail
            customer={selected}
            onSelectLine={onSelectLine}
            onMoved={onMoved}
            onMoveMaterial={onMoveMaterial}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Select a customer</p>
            <p className="text-xs text-[var(--text-muted)]">Choose a customer to see their full order status, dispatch readiness, and incoming stock.</p>
          </div>
        )}
      </section>
    </div>
  )
}
