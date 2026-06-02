'use client'

import { useEffect, useState } from 'react'
import LineCard from '@/components/purchases/LineCard'
import {
  STAGE_ORDER,
  effectiveCeiling,
  getBrandSectionKey,
  matchesBrandTab,
  normalizeBrandTab,
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

function totalOrdered(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) => s + l.qtyOrdered, 0)
}
function totalDispatched(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)
}
function totalPending(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) =>
    s + l.stages.UNALLOCATED + l.stages.PENDING_CO + l.stages.PENDING_DIST + l.stages.GODOWN + l.stages.IN_BOX, 0)
}
function totalReadyToDispatch(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) => s + l.stages.IN_BOX, 0)
}
function totalEffective(lines: PurchaseTrackerLine[]) {
  return lines.reduce((s, l) => s + effectiveCeiling(l), 0)
}

async function exportToXlsx(customerName: string, lines: PurchaseTrackerLine[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(customerName.slice(0, 31))
  ws.columns = [
    { header: 'SKU', key: 'sku', width: 28 },
    { header: 'Product', key: 'name', width: 40 },
    { header: 'Brand', key: 'brand', width: 14 },
    { header: 'PO#', key: 'po', width: 16 },
    { header: 'Ordered', key: 'ordered', width: 10 },
    { header: 'Dispatched', key: 'dispatched', width: 12 },
    { header: 'Pending', key: 'pending', width: 10 },
  ]
  for (const l of lines) {
    ws.addRow({
      sku: l.product.sku,
      name: l.product.name,
      brand: l.product.brand,
      po: l.poNumber,
      ordered: effectiveCeiling(l),
      dispatched: l.stages.DISPATCHED,
      pending: totalPending([l]),
    })
  }
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${customerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-pipeline.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
}

export default function WorkspaceCustomers({ lines, activeBrand, onMoved, onSelectLine }: Props) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailBrand, setDetailBrand] = useState<BrandTab>('ALL')

  const customers = lines.reduce<Record<string, CustomerBucket>>((acc, line) => {
    if (!line.customer) return acc
    const b = acc[line.customer.id] ?? { id: line.customer.id, name: line.customer.name, siteAddress: line.customer.siteAddress, lines: [] }
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
      // Sort by urgency: customers with ready-to-dispatch items first
      const aReady = totalReadyToDispatch(a.lines)
      const bReady = totalReadyToDispatch(b.lines)
      if (aReady !== bReady) return bReady - aReady
      return a.name.localeCompare(b.name)
    })

  useEffect(() => {
    if (!customerList.some((c) => c.id === selectedId)) {
      setSelectedId(customerList[0]?.id ?? null)
    }
  }, [customerList, selectedId])

  const selected = customerList.find((c) => c.id === selectedId) ?? null
  const detailLines = selected
    ? selected.lines.filter((l) => detailBrand === 'ALL' || matchesBrandTab(l.product.brand, detailBrand))
    : []

  const availableBrands = Array.from(new Set(
    (selected?.lines ?? []).map((l) => normalizeBrandTab(getBrandSectionKey(l.product.brand))),
  )).filter((b): b is Exclude<BrandTab, 'ALL'> => b !== 'ALL')

  useEffect(() => {
    if (detailBrand !== 'ALL' && !availableBrands.includes(detailBrand)) setDetailBrand('ALL')
  }, [availableBrands, detailBrand])

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">No customer lines match the current filter.</p>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)]">
      {/* ── Customer list ── */}
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
          {customerList.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">No customers match.</div>
          ) : (
            customerList.map((c) => {
              const dispatched = totalDispatched(c.lines)
              const ready = totalReadyToDispatch(c.lines)
              const effective = totalEffective(c.lines)
              const pct = effective > 0 ? Math.round((dispatched / effective) * 100) : 0
              const active = c.id === selectedId

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    'w-full p-4 text-left transition',
                    active ? 'bg-[#f8fbff]' : 'hover:bg-[var(--n-50)]',
                  ].join(' ')}
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
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? '#10B981' : pct > 60 ? '#3B82F6' : '#F59E0B',
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                          {dispatched}/{effective} dispatched
                        </span>
                        {ready > 0 && (
                          <span className="rounded-full bg-[#f0fdf4] px-1.5 py-0.5 text-[10px] font-semibold text-[#15803d]">
                            {ready} ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Customer detail ── */}
      <section className="overflow-y-auto bg-[var(--bg)]">
        {selected ? (
          <div className="p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Customer</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{selected.name}</h2>
                {selected.siteAddress && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{selected.siteAddress}</p>
                )}

                {/* Commitment summary chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: 'Ordered', value: totalOrdered(selected.lines), color: '#6B7280' },
                    { label: 'Dispatched', value: totalDispatched(selected.lines), color: '#10B981' },
                    { label: 'Pending', value: totalPending(selected.lines), color: '#F59E0B' },
                    ...(totalReadyToDispatch(selected.lines) > 0
                      ? [{ label: 'Ready to dispatch', value: totalReadyToDispatch(selected.lines), color: '#3B82F6' }]
                      : []),
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className="rounded-xl border border-[var(--border)] bg-white px-3 py-1.5"
                    >
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

              <div className="flex items-center gap-2">
                {detailLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void exportToXlsx(selected.name, detailLines)}
                    className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[#86efac] hover:text-[#16a34a]"
                  >
                    ↓ Export
                  </button>
                )}
                {(['ALL', ...availableBrands] as BrandTab[]).map((b) => {
                  const active = detailBrand === b
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setDetailBrand(b)}
                      className={[
                        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                        active ? 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]' : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--n-50)]',
                      ].join(' ')}
                    >
                      {b === 'HANSGROHE' ? 'H|A' : b}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              {detailLines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-10 text-center text-sm text-[var(--text-muted)]">
                  No lines under this brand filter.
                </div>
              ) : (
                detailLines
                  .slice()
                  .sort((a, b) => {
                    const aw = STAGE_ORDER.findIndex((s) => a.stages[s] > 0)
                    const bw = STAGE_ORDER.findIndex((s) => b.stages[s] > 0)
                    return aw - bw || a.product.name.localeCompare(b.product.name)
                  })
                  .map((line) => (
                    <LineCard
                      key={line.id}
                      line={line}
                      context="customer"
                      activeBrand={activeBrand}
                      allLines={selected.lines}
                      onMoved={onMoved}
                      onSelect={() => onSelectLine(line.id)}
                    />
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Select a customer from the list.
          </div>
        )}
      </section>
    </div>
  )
}
