'use client'

import { X } from 'lucide-react'
import type { PurchaseStage, PurchaseTrackerLine } from '@/lib/purchases-tracker'
import { STAGE_LABEL, STAGE_ORDER } from '@/lib/purchases-tracker'

export interface PurchaseFilters {
  search:    string
  supplier:  string   // vendorName or ''
  customer:  string   // customer name or ''
  stage:     PurchaseStage | ''
}

export function emptyFilters(): PurchaseFilters {
  return { search: '', supplier: '', customer: '', stage: '' }
}

export function applyFilters(lines: PurchaseTrackerLine[], f: PurchaseFilters): PurchaseTrackerLine[] {
  let out = lines

  if (f.search) {
    const q = f.search.toLowerCase()
    out = out.filter(
      (l) =>
        l.product.name.toLowerCase().includes(q) ||
        l.product.sku.toLowerCase().includes(q)  ||
        l.customer?.name.toLowerCase().includes(q) === true ||
        l.poNumber?.toLowerCase().includes(q) === true,
    )
  }

  if (f.supplier) {
    out = out.filter((l) => l.vendorName === f.supplier)
  }

  if (f.customer) {
    out = out.filter((l) => l.customer?.name === f.customer)
  }

  if (f.stage) {
    out = out.filter((l) => (l.stages[f.stage as PurchaseStage] ?? 0) > 0)
  }

  return out
}

interface FilterBarProps {
  lines:    PurchaseTrackerLine[]
  filters:  PurchaseFilters
  onChange: (f: PurchaseFilters) => void
}

export default function FilterBar({ lines, filters, onChange }: FilterBarProps) {
  const suppliers = Array.from(
    new Set(lines.map((l) => l.vendorName).filter(Boolean) as string[]),
  ).sort()

  const customers = Array.from(
    new Set(lines.map((l) => l.customer?.name).filter(Boolean) as string[]),
  ).sort()

  const active = (
    (filters.search ? 1 : 0) +
    (filters.supplier ? 1 : 0) +
    (filters.customer ? 1 : 0) +
    (filters.stage ? 1 : 0)
  )

  function set(patch: Partial<PurchaseFilters>) {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search */}
      <input
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
        placeholder="Search product, SKU, customer, PO…"
        className="h-9 min-w-[220px] flex-1 rounded-full border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[#93c5fd] focus:shadow-[0_0_0_3px_rgba(147,197,253,0.25)]"
      />

      {/* Supplier */}
      <select
        value={filters.supplier}
        onChange={(e) => set({ supplier: e.target.value })}
        className="h-9 rounded-full border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-secondary)] outline-none transition focus:border-[#93c5fd]"
      >
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Customer */}
      <select
        value={filters.customer}
        onChange={(e) => set({ customer: e.target.value })}
        className="h-9 rounded-full border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-secondary)] outline-none transition focus:border-[#93c5fd]"
      >
        <option value="">All customers</option>
        {customers.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Stage */}
      <select
        value={filters.stage}
        onChange={(e) => set({ stage: e.target.value as PurchaseStage | '' })}
        className="h-9 rounded-full border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-secondary)] outline-none transition focus:border-[#93c5fd]"
      >
        <option value="">All stages</option>
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>{STAGE_LABEL[s]}</option>
        ))}
      </select>

      {/* Clear */}
      {active > 0 && (
        <button
          type="button"
          onClick={() => onChange(emptyFilters())}
          className="flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
        >
          <X size={12} />
          Clear {active}
        </button>
      )}
    </div>
  )
}
