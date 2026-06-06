'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { DispatchRecordEntry } from '@/app/api/purchase-orders/dispatch-record/route'

const fetcher = async (url: string): Promise<{ entries: DispatchRecordEntry[] }> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load dispatch record')
  return res.json() as Promise<{ entries: DispatchRecordEntry[] }>
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
const GRID = 'grid grid-cols-[120px_minmax(0,1.5fr)_minmax(0,2fr)_80px_44px_minmax(0,1fr)_minmax(0,1fr)]'

function TableHeader() {
  return (
    <div className={`${GRID} sticky top-[49px] z-10 border-b border-[var(--border)] bg-[var(--n-50)] px-4 py-2`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Brand</div>
      <div className="pr-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Qty</div>
      <div className="pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Challan</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Dispatched by</div>
    </div>
  )
}

function DispatchRow({ entry }: { entry: DispatchRecordEntry }) {
  const date = new Date(entry.movedAt)
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`${GRID} items-center gap-0 border-b border-[var(--border)] px-4 py-3`}>
      {/* Date */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{dateStr}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{timeStr}</p>
      </div>

      {/* Customer */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {entry.customerName ?? <span className="text-[var(--text-muted)]">—</span>}
        </p>
      </div>

      {/* Product */}
      <div className="min-w-0 pr-3">
        <p className="truncate text-sm text-[var(--text-primary)]">{entry.productName}</p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">{entry.productSku}</p>
      </div>

      {/* Brand */}
      <div className="pr-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{entry.productBrand}</span>
      </div>

      {/* Qty */}
      <div className="pr-3 text-center">
        <p
          className="text-base font-bold text-[#10b981]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {entry.qty}
        </p>
      </div>

      {/* Challan */}
      <div className="min-w-0 pr-3">
        {entry.challan ? (
          <span className="inline-flex items-center rounded-md border border-[#bae6fd] bg-[#f0f9ff] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
            {entry.challan}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">—</span>
        )}
      </div>

      {/* User */}
      <div>
        <p className="truncate text-xs text-[var(--text-secondary)]">{entry.movedByName}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

async function exportDispatchRecord(entries: DispatchRecordEntry[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Dispatch Record')

  ws.columns = [
    { header: 'Date',         key: 'date',     width: 18 },
    { header: 'Customer',     key: 'customer', width: 28 },
    { header: 'Product',      key: 'product',  width: 42 },
    { header: 'SKU',          key: 'sku',      width: 24 },
    { header: 'Brand',        key: 'brand',    width: 12 },
    { header: 'Qty',          key: 'qty',      width: 8  },
    { header: 'Challan',      key: 'challan',  width: 22 },
    { header: 'Dispatched by',key: 'user',     width: 22 },
    { header: 'PO Number',    key: 'po',       width: 18 },
  ]

  for (const e of entries) {
    ws.addRow({
      date:     new Date(e.movedAt).toLocaleString('en-IN'),
      customer: e.customerName ?? '',
      product:  e.productName,
      sku:      e.productSku,
      brand:    e.productBrand,
      qty:      e.qty,
      challan:  e.challan ?? '',
      user:     e.movedByName,
      po:       e.poNumber,
    })
  }

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dispatch-record-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export default function WorkspaceDispatchRecord() {
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, error } = useSWR(
    '/api/purchase-orders/dispatch-record',
    fetcher,
    { revalidateOnFocus: false },
  )

  const entries = data?.entries ?? []

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          e.productName.toLowerCase().includes(search.toLowerCase()) ||
          e.productSku.toLowerCase().includes(search.toLowerCase()) ||
          (e.challan?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : entries

  if (isLoading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-sm text-[#dc2626]">Failed to load dispatch record.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-2.5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, product, challan…"
            className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--n-50)] pl-8 pr-3 text-sm outline-none focus:border-[#93c5fd] focus:bg-white"
          />
        </div>
        <span className="text-xs text-[var(--text-muted)]">{filtered.length} dispatches</span>
        <button
          type="button"
          onClick={() => {
            setExporting(true)
            void exportDispatchRecord(filtered).finally(() => setExporting(false))
          }}
          disabled={exporting || filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1.5 text-[11px] font-semibold text-[#0369a1] transition hover:bg-[#e0f2fe] disabled:opacity-40"
        >
          ⬇ Export .xlsx
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No dispatches yet</p>
          <p className="max-w-xs text-xs text-[var(--text-muted)]">
            Dispatched items appear here automatically when stock is moved to DISPATCHED stage.
          </p>
        </div>
      ) : (
        <>
          <TableHeader />
          {filtered.map((e) => <DispatchRow key={e.id} entry={e} />)}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">No records match your search.</div>
          )}
        </>
      )}
    </div>
  )
}
