'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  DISPATCH_STATUS_BG,
  DISPATCH_STATUS_COLOR,
  DISPATCH_STATUS_LABEL,
  getLineDispatchStatuses,
  lineIsReady,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface Props {
  lines: PurchaseTrackerLine[]
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
  onMoveMaterial?: (productId: string, sourceLineId: string) => void
}

interface CustomerGroup {
  id: string
  name: string
  siteAddress: string | null
  readyLines: PurchaseTrackerLine[]
  blockedLines: PurchaseTrackerLine[]
}

interface DispatchConfirm {
  customerId: string
  customerName: string
  lines: PurchaseTrackerLine[]
  challan: string
}

// ─── Product thumbnail ─────────────────────────────────────────────────────────

function ProductThumb({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0">
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-[10px] font-bold text-[var(--text-muted)]">
      {line.product.brand.slice(0, 2)}
    </div>
  )
}

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ line }: { line: PurchaseTrackerLine }) {
  const statuses = getLineDispatchStatuses(line).filter((s) => s.status !== 'done')
  if (statuses.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map(({ status, qty }) => (
        <span
          key={status}
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: DISPATCH_STATUS_BG[status],
            color: DISPATCH_STATUS_COLOR[status],
          }}
        >
          {status === 'ready' ? `● ${DISPATCH_STATUS_LABEL[status]}` : DISPATCH_STATUS_LABEL[status]}
          {' '}×{qty}
        </span>
      ))}
    </div>
  )
}

// ─── Blocked reason badge ──────────────────────────────────────────────────────

function BlockedReason({ line }: { line: PurchaseTrackerLine }) {
  if (line.stages.GODOWN > 0) {
    return (
      <span className="rounded-md bg-[#eff6ff] px-2 py-0.5 text-[11px] font-semibold text-[#2563eb]">
        Needs packing · {line.stages.GODOWN} at godown
      </span>
    )
  }
  if (line.stages.PENDING_DIST > 0) {
    return (
      <span className="rounded-md bg-[#fff7ed] px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
        With distributor · {line.stages.PENDING_DIST} units
      </span>
    )
  }
  if (line.stages.PENDING_CO > 0) {
    return (
      <span className="rounded-md bg-[#fefce8] px-2 py-0.5 text-[11px] font-semibold text-[#92400e]">
        Awaiting company · {line.stages.PENDING_CO} units
      </span>
    )
  }
  return null
}

// ─── Excel export ──────────────────────────────────────────────────────────────

async function exportDispatchQueue(
  dispatchableGroups: CustomerGroup[],
  blockedOnlyGroups: CustomerGroup[],
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Dispatch Queue')

  ws.columns = [
    { header: 'Customer',    key: 'customer',    width: 30 },
    { header: 'Site',        key: 'site',        width: 28 },
    { header: 'Product',     key: 'product',     width: 42 },
    { header: 'SKU',         key: 'sku',         width: 24 },
    { header: 'Brand',       key: 'brand',       width: 12 },
    { header: 'Ready (Qty)', key: 'readyQty',    width: 12 },
    { header: 'Status',      key: 'status',      width: 22 },
    { header: 'Location',    key: 'location',    width: 22 },
  ]

  for (const group of dispatchableGroups) {
    for (const line of group.readyLines) {
      ws.addRow({
        customer:  group.name,
        site:      group.siteAddress ?? '',
        product:   line.product.name,
        sku:       line.product.sku,
        brand:     line.product.brand,
        readyQty:  line.stages.IN_BOX,
        status:    'READY',
        location:  line.locationNote ?? '',
      })
    }
  }

  ws.addRow({})
  const sepRow = ws.lastRow
  if (sepRow) {
    sepRow.getCell(1).value = '— BLOCKED —'
    sepRow.font = { bold: true, color: { argb: 'FF6B7280' } }
  }

  for (const group of blockedOnlyGroups) {
    for (const line of group.blockedLines) {
      const statuses = getLineDispatchStatuses(line).filter((s) => s.status !== 'done')
      ws.addRow({
        customer:  group.name,
        site:      group.siteAddress ?? '',
        product:   line.product.name,
        sku:       line.product.sku,
        brand:     line.product.brand,
        readyQty:  0,
        status:    statuses.map((s) => `${DISPATCH_STATUS_LABEL[s.status]} ×${s.qty}`).join(', '),
        location:  line.locationNote ?? '',
      })
    }
  }

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dispatch-queue-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceDispatch({ lines, onMoved, onSelectLine, onMoveMaterial }: Props) {
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<DispatchConfirm | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchedLineIds, setDispatchedLineIds] = useState<Set<string>>(new Set())
  const [err, setErr] = useState('')
  const [exporting, setExporting] = useState(false)

  const activeLines = lines.filter((l) => !dispatchedLineIds.has(l.id))
  const linesWithStock = activeLines.filter(
    (l) => l.stages.IN_BOX > 0 || l.stages.GODOWN > 0 || l.stages.PENDING_CO > 0 || l.stages.PENDING_DIST > 0,
  )

  const customerMap = linesWithStock.reduce<Record<string, CustomerGroup>>((acc, line) => {
    const custId = line.customer?.id ?? '__unlinked__'
    const custName = line.customer?.name ?? 'Unlinked orders'
    if (!acc[custId]) {
      acc[custId] = { id: custId, name: custName, siteAddress: line.customer?.siteAddress ?? null, readyLines: [], blockedLines: [] }
    }
    if (lineIsReady(line)) acc[custId]!.readyLines.push(line)
    else acc[custId]!.blockedLines.push(line)
    return acc
  }, {})

  const dispatchableGroups = Object.values(customerMap)
    .filter((g) => g.readyLines.length > 0)
    .sort((a, b) => b.readyLines.length - a.readyLines.length)

  const blockedOnlyGroups = Object.values(customerMap)
    .filter((g) => g.readyLines.length === 0 && g.blockedLines.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  function toggleLine(lineId: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return next
    })
  }

  function toggleGroup(group: CustomerGroup) {
    const ids = group.readyLines.map((l) => l.id)
    const allSelected = ids.every((id) => selectedLineIds.has(id))
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) allSelected ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openConfirm(group: CustomerGroup) {
    const selected = group.readyLines.filter((l) => selectedLineIds.has(l.id))
    const linesToDispatch = selected.length > 0 ? selected : group.readyLines
    setErr('')
    setConfirm({ customerId: group.id, customerName: group.name, lines: linesToDispatch, challan: '' })
  }

  async function executeDispatch() {
    if (!confirm) return
    setDispatching(true)
    setErr('')
    try {
      const calls: Promise<{ stageTotals?: HeaderCounts; error?: string }>[] = []
      const note = confirm.challan ? `Challan: ${confirm.challan}` : undefined

      for (const line of confirm.lines) {
        if (line.stages.IN_BOX > 0) {
          calls.push(
            fetch(`/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fromStage: 'IN_BOX', toStage: 'DISPATCHED', qty: line.stages.IN_BOX, note }),
            }).then((r) => r.json() as Promise<{ stageTotals?: HeaderCounts; error?: string }>),
          )
        }
      }

      const results = await Promise.all(calls)
      const lastSuccess = [...results].reverse().find((r) => r.stageTotals)

      if (lastSuccess?.stageTotals) {
        for (const line of confirm.lines) {
          if (line.stages.IN_BOX > 0) {
            onMoved(lastSuccess.stageTotals, line.id, 'IN_BOX', 'DISPATCHED', line.stages.IN_BOX)
          }
        }
      }

      setDispatchedLineIds((prev) => {
        const next = new Set(prev)
        for (const line of confirm.lines) {
          if (line.stages.GODOWN === 0) next.add(line.id)
        }
        return next
      })
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        for (const line of confirm.lines) next.delete(line.id)
        return next
      })
      setConfirm(null)
    } catch {
      setErr('Network error — some items may not have dispatched')
    } finally {
      setDispatching(false)
    }
  }

  const totalReady = dispatchableGroups.reduce(
    (s, g) => s + g.readyLines.reduce((rs, l) => rs + l.stages.IN_BOX, 0),
    0,
  )

  if (linesWithStock.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="text-4xl">▷</div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Nothing to dispatch right now</p>
        <p className="max-w-sm text-sm text-[var(--text-muted)]">
          Items appear here once they reach <strong>Packed</strong> stage.
          Go to <strong>Stock</strong>, find the product, and mark it packed.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Today</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {totalReady > 0
              ? `${totalReady} unit${totalReady !== 1 ? 's' : ''} ready across ${dispatchableGroups.length} customer${dispatchableGroups.length !== 1 ? 's' : ''}`
              : 'No units packed and ready — check blocked items below'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExporting(true)
            void exportDispatchQueue(dispatchableGroups, blockedOnlyGroups).finally(() => setExporting(false))
          }}
          disabled={exporting}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : '↓ Export .xlsx'}
        </button>
      </div>

      {/* ── READY TO DISPATCH ─────────────────────────────────────────── */}
      {dispatchableGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#065f46]">
                Ready to Dispatch
              </p>
            </div>
            <div className="h-px flex-1 bg-[#bbf7d0]" />
            <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-xs font-bold text-[#15803d]">
              {totalReady} units
            </span>
          </div>

          {dispatchableGroups.map((group) => {
            const allReady = group.readyLines.every((l) => selectedLineIds.has(l.id))
            const someReady = group.readyLines.some((l) => selectedLineIds.has(l.id))
            const selectedCount = group.readyLines.filter((l) => selectedLineIds.has(l.id)).length
            const selectedUnits = group.readyLines
              .filter((l) => selectedLineIds.has(l.id))
              .reduce((s, l) => s + l.stages.IN_BOX, 0)
            const totalUnits = group.readyLines.reduce((s, l) => s + l.stages.IN_BOX, 0)

            return (
              <div key={group.id} className="overflow-hidden rounded-[20px] border border-[#bbf7d0] bg-white">
                {/* Group header */}
                <div className="flex items-center justify-between border-b border-[#bbf7d0] bg-[#f0fdf4] px-5 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allReady}
                      ref={(el) => { if (el) el.indeterminate = someReady && !allReady }}
                      onChange={() => toggleGroup(group)}
                      className="h-4 w-4 cursor-pointer rounded accent-[#0f172a]"
                      aria-label={`Select all ready items for ${group.name}`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{group.name}</p>
                      {group.siteAddress && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{group.siteAddress}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#15803d] border border-[#bbf7d0]"
                      style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      ● {totalUnits} ready
                    </span>
                    <button
                      type="button"
                      onClick={() => openConfirm(group)}
                      className="rounded-lg bg-[#0f172a] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-black"
                    >
                      {someReady
                        ? `Dispatch ${selectedCount} selected (${selectedUnits}u) →`
                        : 'Dispatch all →'}
                    </button>
                  </div>
                </div>

                {/* Ready rows */}
                <div className="divide-y divide-[var(--border)]">
                  {group.readyLines.map((line) => {
                    const checked = selectedLineIds.has(line.id)
                    return (
                      <div
                        key={line.id}
                        className={['flex items-center gap-3 px-5 py-3 transition', checked ? 'bg-[#f8fbff]' : ''].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLine(line.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[#0f172a]"
                        />
                        <ProductThumb line={line} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
                          {line.locationNote && (
                            <p className="mt-0.5 text-[11px] text-[#475569]">
                              📦 {line.locationNote.replace(/^Location:\s*/i, '')}
                            </p>
                          )}
                        </div>
                        <StatusPill line={line} />
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectLine(line.id, 'history')}
                            className="text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                          >
                            Log
                          </button>
                          {onMoveMaterial && (
                            <button
                              type="button"
                              onClick={() => onMoveMaterial(line.product.id, line.id)}
                              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                            >
                              Move →
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Blocked within this customer */}
                {group.blockedLines.length > 0 && (
                  <div className="divide-y divide-[var(--border)] border-t border-dashed border-[var(--border)]">
                    {group.blockedLines.map((line) => (
                      <div key={line.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                        <div className="h-4 w-4 shrink-0" />
                        <ProductThumb line={line} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--text-secondary)]">{line.product.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
                        </div>
                        <BlockedReason line={line} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── BLOCKED ──────────────────────────────────────────────────── */}
      {blockedOnlyGroups.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Blocked — cannot dispatch today
              </p>
            </div>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="space-y-3">
            {blockedOnlyGroups.map((group) => (
              <div key={group.id} className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-white opacity-80">
                <div className="border-b border-[var(--border)] bg-[var(--n-50)] px-5 py-3">
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">{group.name}</p>
                  {group.siteAddress && (
                    <p className="text-xs text-[var(--text-muted)]">{group.siteAddress}</p>
                  )}
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {group.blockedLines.map((line) => (
                    <div key={line.id} className="flex items-center gap-3 px-5 py-3">
                      <ProductThumb line={line} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-secondary)]">{line.product.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{line.product.sku}</p>
                      </div>
                      <BlockedReason line={line} />
                      {line.createdAt && (() => {
                        const days = Math.floor((Date.now() - new Date(line.createdAt).getTime()) / 86_400_000)
                        return days > 14 ? (
                          <span className="shrink-0 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-[#d97706]">
                            ⚠ {days}d
                          </span>
                        ) : null
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dispatch confirmation modal ─────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Confirm Dispatch
            </h3>

            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--n-50)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {confirm.customerName}
              </p>
              <div className="space-y-1.5">
                {confirm.lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-[var(--text-primary)]">{l.product.name}</span>
                    <span
                      className="ml-3 shrink-0 font-semibold text-[#2563eb]"
                      style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      ×{l.stages.IN_BOX}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs font-semibold text-[var(--text-secondary)]">
                Total: {confirm.lines.reduce((s, l) => s + l.stages.IN_BOX, 0)} units
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Challan / delivery note number
              </label>
              <input
                type="text"
                value={confirm.challan}
                onChange={(e) => setConfirm((c) => c ? { ...c, challan: e.target.value } : c)}
                placeholder="e.g. BCH-DC-2026-089"
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
              />
            </div>

            {err && (
              <p className="mt-3 rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void executeDispatch()}
                disabled={dispatching}
                className="flex-1 rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
              >
                {dispatching ? 'Dispatching…' : 'Confirm Dispatch'}
              </button>
              <button
                type="button"
                onClick={() => { setConfirm(null); setErr('') }}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
