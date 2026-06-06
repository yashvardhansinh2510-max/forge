'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  getCustomerMetrics,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  DISPATCH_STATUS_BG,
  DISPATCH_STATUS_COLOR,
  DISPATCH_STATUS_LABEL,
  DISPATCH_STATUS_TO_STAGE,
  STAGE_LABEL,
  type BrandTab,
  type DispatchStatus,
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

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status, qty }: { status: DispatchStatus; qty: number }) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: DISPATCH_STATUS_BG[status], color: DISPATCH_STATUS_COLOR[status] }}
    >
      {status === 'ready' && '● '}{DISPATCH_STATUS_LABEL[status]} ×{qty}
    </span>
  )
}

// ─── Mark Packed quick action ──────────────────────────────────────────────────

function MarkPackedInline({
  line,
  onMoved,
  onDone,
}: {
  line: PurchaseTrackerLine
  onMoved: Props['onMoved']
  onDone: () => void
}) {
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const qty = line.stages.GODOWN

  async function doPack() {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStage: 'GODOWN',
          toStage:   'IN_BOX',
          qty,
          location:  location.trim() || undefined,
        }),
      })
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
    <div className="border-t border-[#bfdbfe] bg-white px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-[var(--text-primary)]">
        Pack {qty} unit{qty !== 1 ? 's' : ''} · {line.product.name}
      </p>
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Box number / shelf location (e.g. Box 12, Rack B3)"
        autoFocus
        className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[#60a5fa]"
      />
      {err && <p className="text-xs text-[#dc2626]">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void doPack()}
          disabled={saving}
          className="flex-1 rounded-xl bg-[#2563eb] py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? 'Packing…' : 'Confirm Pack'}
        </button>
        <button type="button" onClick={onDone} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Customer detail ───────────────────────────────────────────────────────────

function CustomerDetail({
  customer,
  onSelectLine,
  onMoved,
  onMoveMaterial,
}: {
  customer: CustomerBucket
  onSelectLine: Props['onSelectLine']
  onMoved: Props['onMoved']
  onMoveMaterial?: Props['onMoveMaterial']
}) {
  const [packingLineId, setPackingLineId] = useState<string | null>(null)
  const [dispatchingLine, setDispatchingLine] = useState<{ lineId: string; challan: string } | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchErr, setDispatchErr] = useState('')
  const [showDelivered, setShowDelivered] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { lines } = customer

  const readyLines = lines.filter((l) => l.stages.IN_BOX > 0)
  const godownLines = lines.filter((l) => l.stages.GODOWN > 0 && l.stages.IN_BOX === 0)
  const pendingLines = lines.filter((l) => (l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0) && l.stages.GODOWN === 0 && l.stages.IN_BOX === 0)
  const deliveredLines = lines.filter((l) => (l.stages.DISPATCHED > 0 || l.stages.NOT_DISPLAYED > 0) && l.stages.PENDING_CO === 0 && l.stages.PENDING_DIST === 0 && l.stages.GODOWN === 0 && l.stages.IN_BOX === 0)

  const metrics = getCustomerMetrics(lines)

  async function executeLineDispatch(line: PurchaseTrackerLine, challan: string) {
    setDispatching(true)
    setDispatchErr('')
    try {
      const calls: Promise<{ stageTotals?: HeaderCounts; error?: string }>[] = []
      const note = challan ? `Challan: ${challan}` : undefined
      if (line.stages.IN_BOX > 0) {
        calls.push(
          fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromStage: 'IN_BOX', toStage: 'DISPATCHED', qty: line.stages.IN_BOX, note }),
          }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
        )
      }
      const results = await Promise.all(calls)
      const last = [...results].reverse().find((r) => r.stageTotals)
      if (last?.stageTotals) {
        onMoved(last.stageTotals, line.id, 'IN_BOX', 'DISPATCHED', line.stages.IN_BOX)
      }
      setDispatchingLine(null)
    } catch {
      setDispatchErr('Network error — dispatch not saved')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
      <div className="grid grid-cols-5 gap-2">
        {([
          { label: 'Ordered', value: metrics.ordered, color: '#6B7280' },
          { label: 'Received', value: metrics.received, color: '#8B5CF6' },
          { label: 'Packed', value: metrics.packed, color: '#3B82F6' },
          { label: 'Dispatched', value: metrics.dispatched, color: '#10B981' },
          { label: 'Pending', value: metrics.pending, color: '#F59E0B' },
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

      {/* ── Ready to dispatch ─────────────────────────────────────── */}
      {readyLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]">
          <div className="border-b border-[#bbf7d0] px-4 py-3">
            <p className="text-sm font-semibold text-[#15803d]">
              ● {metrics.ready} unit{metrics.ready !== 1 ? 's' : ''} ready to dispatch
            </p>
          </div>
          <div className="divide-y divide-[#bbf7d0]">
            {readyLines.map((line) => {
              const isDispatching = dispatchingLine?.lineId === line.id
              return (
                <div key={line.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <ProductThumb line={line} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{line.product.brand} · {line.product.sku}</p>
                      {line.locationNote && (
                        <p className="mt-0.5 text-[11px] text-[#475569]">📦 {line.locationNote.replace(/^Location:\s*/i, '')}</p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span
                        className="text-base font-bold text-[#15803d]"
                        style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        ×{line.stages.IN_BOX}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDispatchingLine(isDispatching ? null : { lineId: line.id, challan: '' })
                          setDispatchErr('')
                        }}
                        className={[
                          'rounded-lg px-3 py-1.5 text-xs font-bold text-white transition',
                          isDispatching ? 'bg-[#166534]' : 'bg-[#15803d] hover:bg-[#166534]',
                        ].join(' ')}
                      >
                        {isDispatching ? 'Cancel ×' : 'Dispatch ▷'}
                      </button>
                    </div>
                  </div>
                  {isDispatching && (
                    <div className="border-t border-[#bbf7d0] bg-white px-4 py-3 space-y-2.5">
                      <input
                        type="text"
                        value={dispatchingLine.challan}
                        onChange={(e) => setDispatchingLine((d) => d ? { ...d, challan: e.target.value } : d)}
                        placeholder="Challan / delivery note (e.g. BCH-DC-2026-089)"
                        autoFocus
                        className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[#86efac]"
                      />
                      {dispatchErr && <p className="text-xs text-[#dc2626]">{dispatchErr}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void executeLineDispatch(line, dispatchingLine.challan)}
                          disabled={dispatching}
                          className="flex-1 rounded-xl bg-[#15803d] py-2 text-sm font-bold text-white disabled:opacity-40"
                        >
                          {dispatching ? 'Dispatching…' : 'Confirm Dispatch'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDispatchingLine(null); setDispatchErr('') }}
                          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Awaiting packing (at godown) ─────────────────────────── */}
      {godownLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#bfdbfe] bg-[#eff6ff]">
          <div className="border-b border-[#bfdbfe] px-4 py-3">
            <p className="text-sm font-semibold text-[#1d4ed8]">
              ■ {godownLines.reduce((s, l) => s + l.stages.GODOWN, 0)} unit{godownLines.reduce((s, l) => s + l.stages.GODOWN, 0) !== 1 ? 's' : ''} at godown — awaiting packing
            </p>
          </div>
          <div className="divide-y divide-[#bfdbfe]">
            {godownLines.map((line) => {
              const isPacking = packingLineId === line.id
              return (
                <div key={line.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <ProductThumb line={line} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{line.product.brand} · {line.product.sku}</p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span
                        className="font-bold text-[#1d4ed8]"
                        style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        ×{line.stages.GODOWN}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPackingLineId(isPacking ? null : line.id)}
                        className={[
                          'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                          isPacking
                            ? 'bg-[#1d4ed8] text-white'
                            : 'border border-[#bfdbfe] bg-white text-[#1d4ed8] hover:bg-[#dbeafe]',
                        ].join(' ')}
                      >
                        {isPacking ? 'Cancel ×' : 'Mark Packed'}
                      </button>
                    </div>
                  </div>
                  {isPacking && (
                    <MarkPackedInline
                      line={line}
                      onMoved={onMoved}
                      onDone={() => setPackingLineId(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Incoming / pending ────────────────────────────────────── */}
      {pendingLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#fed7aa] bg-[#fff7ed]">
          <div className="border-b border-[#fed7aa] px-4 py-3">
            <p className="text-sm font-semibold text-[#c2410c]">
              {pendingLines.reduce((s, l) => s + l.stages.PENDING_CO + l.stages.PENDING_DIST, 0)} units incoming
            </p>
          </div>
          <div className="divide-y divide-[#fed7aa]">
            {pendingLines.map((line) => {
              const statuses = getLineDispatchStatuses(line).filter((s) => s.status !== 'done' && s.status !== 'ready' && s.status !== 'awaiting_packing')
              const ageDays = line.createdAt
                ? Math.floor((Date.now() - new Date(line.createdAt).getTime()) / 86_400_000)
                : null
              return (
                <div key={line.id} className="flex items-center gap-3 px-4 py-3">
                  <ProductThumb line={line} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{line.product.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {statuses.map(({ status, qty }) => (
                        <StatusPill key={status} status={status} qty={qty} />
                      ))}
                      {ageDays !== null && ageDays > 14 && (
                        <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-[#d97706]">
                          ⚠ {ageDays}d — follow up
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id, 'history')}
                    className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Log
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Delivered (collapsed) ─────────────────────────────────── */}
      {deliveredLines.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <button
            type="button"
            onClick={() => setShowDelivered((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Delivered · {deliveredLines.reduce((s, l) => s + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED, 0)} units
            </p>
            <span className="text-[var(--text-muted)]">{showDelivered ? '▲' : '▾'}</span>
          </button>
          {showDelivered && (
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {deliveredLines.map((line) => (
                <div key={line.id} className="flex items-center gap-3 px-4 py-3">
                  <ProductThumb line={line} size={8} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-secondary)]">{line.product.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      ✓ {line.stages.DISPATCHED + line.stages.NOT_DISPLAYED} dispatched
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line.id, 'history')}
                    className="shrink-0 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    History
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {readyLines.length === 0 && godownLines.length === 0 && pendingLines.length === 0 && deliveredLines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-10 text-center text-sm text-[var(--text-muted)]">
          No purchase activity for this customer.
        </div>
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
