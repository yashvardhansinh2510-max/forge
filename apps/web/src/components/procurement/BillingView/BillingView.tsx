'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatINR } from '@/lib/format'
import { BRAND_ACCENTS, type BrandTab, type PurchaseTrackerLine } from '@/lib/purchases-tracker'
import {
  exportVendorBillingLines,
  type BillingLineRow,
} from '@/lib/excelExporter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorRow {
  vendorName:            string
  brands:                string[]
  totalOrdered:          number
  totalReceived:         number
  pendingUnits:          number
  estimatedValuePending: number
  lines:                 PurchaseTrackerLine[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildVendorRows(lines: PurchaseTrackerLine[]): VendorRow[] {
  const map = new Map<
    string,
    {
      brands:            Set<string>
      totalOrdered:      number
      totalReceived:     number
      pendingUnits:      number
      weightedCost:      number
      pendingWithCost:   number
      lines:             PurchaseTrackerLine[]
    }
  >()

  for (const line of lines) {
    const key = line.vendorName ?? 'Unknown Vendor'
    if (!map.has(key)) {
      map.set(key, {
        brands: new Set(),
        totalOrdered: 0,
        totalReceived: 0,
        pendingUnits: 0,
        weightedCost: 0,
        pendingWithCost: 0,
        lines: [],
      })
    }
    const agg = map.get(key)!
    agg.brands.add(line.product.brand)
    agg.totalOrdered  += line.qtyOrdered
    agg.totalReceived += line.qtyReceived
    const pending = Math.max(0, line.qtyOrdered - line.qtyReceived)
    agg.pendingUnits  += pending
    if (line.landingCost != null && line.landingCost > 0 && pending > 0) {
      agg.weightedCost    += line.landingCost * pending
      agg.pendingWithCost += pending
    }
    agg.lines.push(line)
  }

  return Array.from(map.entries())
    .map(([vendorName, agg]) => ({
      vendorName,
      brands: Array.from(agg.brands).sort(),
      totalOrdered:  agg.totalOrdered,
      totalReceived: agg.totalReceived,
      pendingUnits:  agg.pendingUnits,
      estimatedValuePending:
        agg.pendingWithCost > 0
          ? Math.round((agg.weightedCost / agg.pendingWithCost) * agg.pendingUnits)
          : 0,
      lines: agg.lines,
    }))
    .sort((a, b) => b.pendingUnits - a.pendingUnits)
}

// ─── Brand badge chips ────────────────────────────────────────────────────────

function BrandBadge({ brand }: { brand: string }) {
  const accent = BRAND_ACCENTS[brand as keyof typeof BRAND_ACCENTS] ?? '#6B7280'
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.1em]"
      style={{ color: accent, borderColor: `${accent}33`, background: `${accent}10` }}
    >
      {brand}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ pending }: { pending: number }) {
  if (pending === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Up to date
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Awaiting
    </span>
  )
}

// ─── Excel export handler ─────────────────────────────────────────────────────

async function handleExportVendor(row: VendorRow) {
  const exportRows: BillingLineRow[] = row.lines.map((l) => {
    const pending = Math.max(0, l.qtyOrdered - l.qtyReceived)
    return {
      productName:     l.product.name,
      sku:             l.product.sku,
      brand:           l.product.brand,
      qtyOrdered:      l.qtyOrdered,
      qtyReceived:     l.qtyReceived,
      pendingUnits:    pending,
      landingCost:     l.landingCost ?? null,
      estValuePending: l.landingCost != null ? Math.round(l.landingCost * pending) : 0,
    }
  })

  try {
    await exportVendorBillingLines(row.vendorName, exportRows)
    toast.success(`Exported ${row.vendorName} billing sheet`)
  } catch {
    toast.error('Export failed')
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BillingViewProps {
  lines:       PurchaseTrackerLine[]
  activeBrand: BrandTab
}

export default function BillingView({ lines, activeBrand }: BillingViewProps) {
  const [exporting, setExporting] = useState<string | null>(null)

  const vendorRows = buildVendorRows(lines)

  if (vendorRows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#e5e7eb] bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">No vendor data</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Switch the brand filter or add purchase orders.
        </p>
      </div>
    )
  }

  const grandTotalOrdered  = vendorRows.reduce((s, r) => s + r.totalOrdered, 0)
  const grandTotalReceived = vendorRows.reduce((s, r) => s + r.totalReceived, 0)
  const grandPending       = vendorRows.reduce((s, r) => s + r.pendingUnits, 0)
  const grandValue         = vendorRows.reduce((s, r) => s + r.estimatedValuePending, 0)

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">

      {/* Table header */}
      <div className="border-b border-[#e5e7eb] px-6 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Vendor Billing Summary
          {activeBrand !== 'ALL' && (
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
              · filtered to {activeBrand}
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {vendorRows.length} vendor{vendorRows.length !== 1 ? 's' : ''} · {grandPending} units pending
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
              <th className="py-2.5 pr-4 pl-6 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Vendor
              </th>
              <th className="py-2.5 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Ordered
              </th>
              <th className="py-2.5 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Received
              </th>
              <th className="py-2.5 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-amber-500">
                Pending
              </th>
              <th className="py-2.5 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Est. Value Pending
              </th>
              <th className="py-2.5 pr-4 text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Status
              </th>
              <th className="py-2.5 pr-6 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Export
              </th>
            </tr>
          </thead>

          <tbody>
            {vendorRows.map((row) => (
              <tr
                key={row.vendorName}
                className="border-t border-[#e5e7eb] transition hover:bg-[#f9fafb]"
              >
                {/* Vendor name + brand badges */}
                <td className="py-4 pr-4 pl-6">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {row.vendorName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {row.brands.map((b) => (
                      <BrandBadge key={b} brand={b} />
                    ))}
                  </div>
                </td>

                {/* Total ordered */}
                <td
                  className="py-4 pr-4 text-right text-sm text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.totalOrdered}
                </td>

                {/* Total received */}
                <td
                  className="py-4 pr-4 text-right text-sm text-emerald-600"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.totalReceived}
                </td>

                {/* Pending units */}
                <td
                  className="py-4 pr-4 text-right text-sm font-semibold text-amber-600"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.pendingUnits}
                </td>

                {/* Estimated value pending */}
                <td
                  className="py-4 pr-4 text-right text-sm text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.estimatedValuePending > 0
                    ? formatINR(row.estimatedValuePending)
                    : <span className="text-[var(--text-muted)]">—</span>}
                </td>

                {/* Status */}
                <td className="py-4 pr-4 text-center">
                  <StatusBadge pending={row.pendingUnits} />
                </td>

                {/* Excel export */}
                <td className="py-4 pr-6 text-right">
                  <button
                    type="button"
                    disabled={exporting === row.vendorName}
                    onClick={async () => {
                      setExporting(row.vendorName)
                      await handleExportVendor(row)
                      setExporting(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] hover:text-[#2563eb] disabled:opacity-50"
                  >
                    {exporting === row.vendorName ? (
                      'Exporting…'
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
                        </svg>
                        Excel
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Grand totals footer */}
          <tfoot>
            <tr className="border-t-2 border-[#e5e7eb] bg-[#f3f4f6]">
              <td className="py-3 pr-4 pl-6 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Total
              </td>
              <td
                className="py-3 pr-4 text-right text-sm font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {grandTotalOrdered}
              </td>
              <td
                className="py-3 pr-4 text-right text-sm font-semibold text-emerald-600"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {grandTotalReceived}
              </td>
              <td
                className="py-3 pr-4 text-right text-sm font-bold text-amber-600"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {grandPending}
              </td>
              <td
                className="py-3 pr-4 text-right text-sm font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {grandValue > 0 ? formatINR(grandValue) : '—'}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
