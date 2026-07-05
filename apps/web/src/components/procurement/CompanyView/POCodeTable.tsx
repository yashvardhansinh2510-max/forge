'use client'

import { useState } from 'react'
import {
  BRAND_ACCENTS,
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  getBrandSectionKey,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import { usePurchasesStore, useActiveCompanies } from '@/lib/usePurchasesStore'
import MarkReceivedModal from '@/components/purchases/MarkReceivedModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'default' | 'name_asc' | 'qty_desc' | 'pending_desc' | 'inbox_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',      label: 'Default' },
  { value: 'name_asc',     label: 'Name A→Z' },
  { value: 'qty_desc',     label: 'Qty ↓' },
  { value: 'pending_desc', label: 'Pending ↓' },
  { value: 'inbox_desc',   label: 'In Box ↓' },
]

const SECTION_ORDER = ['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'KAJARIA', 'GEBERIT']

// ─── Sub-components ───────────────────────────────────────────────────────────

function primaryStage(line: PurchaseTrackerLine): PurchaseStage | null {
  return STAGE_ORDER.find((s) => line.stages[s] > 0) ?? null
}

function StageBadge({ stage }: { stage: PurchaseStage }) {
  const color = STAGE_COLORS[stage]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}18`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STAGE_LABEL[stage]}
    </span>
  )
}

interface LineRowProps {
  line: PurchaseTrackerLine
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

function LineRow({ line, activeBrand, onMoved }: LineRowProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const stage    = primaryStage(line)
  const received = line.stages.INBOX + line.stages.DISPATCHED + line.stages.COMPLETED

  return (
    <>
      <tr className="group border-t border-[#e5e7eb] transition hover:bg-[var(--n-50)]">
        <td className="py-3.5 pr-4 pl-5">
          <div className="flex items-center gap-3">
            {line.product.imageUrl ? (
              <img
                src={line.product.imageUrl}
                alt={line.product.name}
                className="h-9 w-9 shrink-0 rounded-xl border border-[#e5e7eb] object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-[var(--n-100)] text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
                {line.product.brand.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {line.product.name}
              </p>
              <p
                className="text-xs text-[var(--text-muted)]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {line.product.sku}
              </p>
            </div>
          </div>
        </td>

        <td className="py-3.5 pr-4 text-sm text-[var(--text-secondary)]">
          {line.customer?.name ?? <span className="text-[var(--text-muted)]">—</span>}
        </td>

        <td
          className="py-3.5 pr-4 text-sm text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {line.qtyOrdered}
        </td>

        <td
          className="py-3.5 pr-4 text-sm text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {received}
        </td>

        <td className="py-3.5 pr-4">
          {stage ? <StageBadge stage={stage} /> : null}
        </td>

        <td className="py-3.5 pr-5 text-right">
          {line.stages.ORDER_IN_CO > 0 ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Mark Received
            </button>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No pending</span>
          )}
        </td>
      </tr>

      {modalOpen && (
        <MarkReceivedModal
          line={line}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onMoved={onMoved}
          brandScope={activeBrand}
        />
      )}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface POCodeTableProps {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

export default function POCodeTable({ lines, activeBrand, onMoved }: POCodeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const activeCompanies = useActiveCompanies()
  const toggleCompany   = usePurchasesStore((s) => s.toggleCompany)
  const clearCompanies  = usePurchasesStore((s) => s.clearCompanies)

  // Unique vendor names across all lines
  const allVendors = [...new Set(
    lines.map((l) => l.vendorName).filter((v): v is string => Boolean(v)),
  )].sort()

  // A vendor chip is "active" when no filter is set (all visible) or it's in the filter set
  function isVendorActive(vendor: string): boolean {
    return activeCompanies.length === 0 || activeCompanies.includes(vendor)
  }

  // Apply company filter
  const filteredLines = activeCompanies.length === 0
    ? lines
    : lines.filter((l) => l.vendorName != null && activeCompanies.includes(l.vendorName))

  // Sort within a brand section
  function applySortToGroup(arr: PurchaseTrackerLine[]): PurchaseTrackerLine[] {
    const copy = [...arr]
    switch (sortKey) {
      case 'name_asc':
        return copy.sort((a, b) => a.product.name.localeCompare(b.product.name))
      case 'qty_desc':
        return copy.sort((a, b) => b.qtyOrdered - a.qtyOrdered)
      case 'pending_desc':
        return copy.sort(
          (a, b) =>
            (b.stages.ORDER_IN_CO + b.stages.CO_BILLING) -
            (a.stages.ORDER_IN_CO + a.stages.CO_BILLING),
        )
      case 'inbox_desc':
        return copy.sort((a, b) => b.stages.INBOX - a.stages.INBOX)
      default:
        return copy.sort((a, b) => a.product.name.localeCompare(b.product.name))
    }
  }

  // Group by brand tab section
  const groups = filteredLines.reduce<Record<string, PurchaseTrackerLine[]>>((acc, line) => {
    const key = getBrandSectionKey(line.product.brand)
    ;(acc[key] ??= []).push(line)
    return acc
  }, {})

  const sectionKeys = Object.keys(groups).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a)
    const bi = SECTION_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#e5e7eb] bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">No lines for this brand</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Switch the brand filter or add purchase order lines.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">

        {/* Sort row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Sort by
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortKey(value)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  sortKey === value
                    ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                    : 'border-[#e5e7eb] bg-white text-[var(--text-secondary)] hover:bg-[var(--n-50)]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor filter chip row */}
        {allVendors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Vendor
            </span>
            {allVendors.map((vendor) => {
              const active = isVendorActive(vendor)
              return (
                <button
                  key={vendor}
                  type="button"
                  onClick={() => toggleCompany(vendor)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition',
                    active
                      ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                      : 'border-[#e5e7eb] bg-white text-[var(--text-secondary)] hover:bg-[var(--n-50)]',
                  ].join(' ')}
                >
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                  )}
                  {vendor}
                </button>
              )
            })}
            {activeCompanies.length > 0 && (
              <button
                type="button"
                onClick={clearCompanies}
                className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Brand sections ───────────────────────────────────────────────── */}
      {sectionKeys.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#e5e7eb] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">No lines match the current vendor filter.</p>
          <button
            type="button"
            onClick={clearCompanies}
            className="mt-3 text-xs font-semibold text-[#2563eb] hover:underline"
          >
            Clear vendor filter
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sectionKeys.map((brand) => {
            const sectionLines = applySortToGroup(groups[brand] ?? [])
            const accent = BRAND_ACCENTS[brand as keyof typeof BRAND_ACCENTS] ?? '#6B7280'

            return (
              <div
                key={brand}
                className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                {/* Section header — the existing toolbar per brand */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderLeft: `4px solid ${accent}` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold tracking-[0.12em]"
                      style={{ color: accent }}
                    >
                      {brand}
                    </span>
                    <span className="rounded-full border border-[#e5e7eb] bg-[var(--n-50)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                      {sectionLines.length} line{sectionLines.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {sectionLines.reduce((s, l) => s + l.qtyOrdered, 0)} units total
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-t border-[#e5e7eb] bg-[var(--n-50)]">
                        <th className="py-2.5 pr-4 pl-5 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Product
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Customer
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Ordered
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Received
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Status
                        </th>
                        <th className="py-2.5 pr-5 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionLines.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          activeBrand={activeBrand}
                          onMoved={onMoved}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
