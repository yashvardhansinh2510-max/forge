'use client'

import { useRef, useState } from 'react'
import {
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  type BrandTab,
  type CustomerOption,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts, lineId?: string, fromStage?: PurchaseStage, toStage?: PurchaseStage, qty?: number) => void
  onSelectLine: (lineId: string) => void
}

const TRANSFERABLE: PurchaseStage[] = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED']

const REASON_PRESETS = ['Urgent site requirement', 'Customer on hold', 'Stock redistribution', 'Damaged — reallocating']

interface TransferFormState {
  sourceLineId: string
  stage: PurchaseStage
  qty: number
  targetLineId: string
  reason: string
}

function getActiveTransferableStages(line: PurchaseTrackerLine): PurchaseStage[] {
  return TRANSFERABLE.filter((s) => line.stages[s] > 0)
}

export default function WorkspaceTransfers({ lines, activeBrand, onMoved, onSelectLine }: Props) {
  const [form, setForm] = useState<TransferFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')

  // Products with multiple customer allocations
  const byProduct = lines.reduce<Record<string, PurchaseTrackerLine[]>>((acc, line) => {
    if (!line.customer) return acc
    acc[line.product.id] ??= []
    acc[line.product.id]!.push(line)
    return acc
  }, {})

  const transferableProducts = Object.entries(byProduct)
    .filter(([, pLines]) => pLines.length >= 2)
    .sort(([, a], [, b]) => b.length - a.length)

  function startTransfer(sourceLine: PurchaseTrackerLine, stage: PurchaseStage) {
    setErr('')
    setSuccess('')
    setForm({
      sourceLineId: sourceLine.id,
      stage,
      qty: 1,
      targetLineId: '',
      reason: '',
    })
  }

  async function executeTransfer() {
    if (!form) return
    if (!form.targetLineId) { setErr('Select a destination customer'); return }
    if (!form.reason.trim()) { setErr('Reason is required'); return }

    setSaving(true)
    setErr('')

    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(form.sourceLineId)}/transfer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: form.stage,
            qty: form.qty,
            targetLineId: form.targetLineId,
            reason: form.reason,
            brand: activeBrand,
          }),
        },
      )

      const data = await res.json() as { error?: string; message?: string; stageTotals?: HeaderCounts }
      if (!res.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Transfer failed')
        return
      }

      // No per-line optimistic patch for transfers — source loses qty and
      // target gains it on a different lineId. Rely on SWR revalidation.
      onMoved(data.stageTotals)
      setSuccess(`Transferred ${form.qty} unit${form.qty > 1 ? 's' : ''} successfully.`)
      setForm(null)
    } catch {
      setErr('Network error — transfer not saved')
    } finally {
      setSaving(false)
    }
  }

  if (transferableProducts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="text-4xl">⇄</div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">No transfers available</p>
        <p className="max-w-sm text-sm text-[var(--text-muted)]">
          Transfers are possible when the same product is allocated to two or more customers.
          No such overlaps exist in the current active purchase lines.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Transfer Center</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {transferableProducts.length} product{transferableProducts.length !== 1 ? 's' : ''} with multi-customer allocations.
          Transfer units between customers when priorities change.
        </p>
      </div>

      {success && (
        <div className="mb-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#15803d]">
          ✓ {success}
        </div>
      )}

      <div className="space-y-4">
        {transferableProducts.map(([productId, productLines]) => {
          if (productLines.length === 0) return null
          const rep = productLines[0]!
          const isActiveProduct = form && productLines.some((l) => l.id === form.sourceLineId)

          return (
            <div
              key={productId}
              className={[
                'overflow-hidden rounded-[20px] border bg-white transition',
                isActiveProduct ? 'border-[#93c5fd] shadow-[0_0_0_3px_rgba(147,197,253,0.2)]' : 'border-[var(--border)]',
              ].join(' ')}
            >
              {/* Product header */}
              <div className="flex items-center gap-4 border-b border-[var(--border)] bg-[var(--n-50)] px-5 py-3">
                {rep.product.imageUrl ? (
                  <img
                    src={rep.product.imageUrl}
                    alt={rep.product.name}
                    className="h-10 w-10 rounded-xl border border-[var(--border)] object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-xs font-bold text-[var(--text-muted)]">
                    {rep.product.brand.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{rep.product.name}</p>
                  <p className="font-mono text-xs text-[var(--text-muted)]">{rep.product.sku} · {rep.product.brand}</p>
                </div>
                <span className="ml-auto rounded-full bg-[var(--n-100)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {productLines.length} allocations
                </span>
              </div>

              {/* Per-customer allocation rows */}
              <div className="divide-y divide-[var(--border)]">
                {productLines.map((line) => {
                  const activeStages = getActiveTransferableStages(line)
                  const isSource = form?.sourceLineId === line.id

                  return (
                    <div
                      key={line.id}
                      className={['flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', isSource ? 'bg-[#f8fbff]' : ''].join(' ')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {line.customer?.name ?? 'Unlinked'}
                        </p>
                        {line.customer?.siteAddress && (
                          <p className="text-xs text-[var(--text-muted)]">{line.customer.siteAddress}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {STAGE_ORDER.filter((s) => line.stages[s] > 0).map((s) => (
                            <span
                              key={s}
                              className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                background: STAGE_COLORS[s] + '15',
                                color: STAGE_COLORS[s],
                              }}
                            >
                              {STAGE_LABEL[s]}: {line.stages[s]}
                            </span>
                          ))}
                          {STAGE_ORDER.every((s) => line.stages[s] === 0) && (
                            <span className="text-xs text-[var(--text-muted)]">All dispatched</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {activeStages.map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => startTransfer(line, stage)}
                            className={[
                              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                              isSource && form?.stage === stage
                                ? 'border-[#2563eb] bg-[#2563eb] text-white'
                                : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[#93c5fd] hover:text-[#1d4ed8]',
                            ].join(' ')}
                          >
                            Transfer from {STAGE_LABEL[stage]} ({line.stages[stage]})
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => onSelectLine(line.id)}
                          className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Transfer form — shown when source is one of this product's lines */}
              {form && productLines.some((l) => l.id === form.sourceLineId) && (() => {
                const sourceLine = productLines.find((l) => l.id === form.sourceLineId)!
                const destOptions = productLines.filter((l) => l.id !== form.sourceLineId && l.customer)
                const availableQty = sourceLine.stages[form.stage]

                return (
                  <div className="border-t border-[#dbeafe] bg-[#f8fbff] p-5">
                    <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                      Transfer from <span className="text-[#2563eb]">{sourceLine.customer?.name ?? 'source'}</span> · {STAGE_LABEL[form.stage]}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {/* Qty */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Quantity ({availableQty} available)</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm((f) => f ? { ...f, qty: Math.max(1, f.qty - 1) } : f)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold text-[var(--text-secondary)] transition hover:border-[#60a5fa]"
                          >-</button>
                          <input
                            type="number"
                            value={form.qty}
                            min={1}
                            max={availableQty}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setForm((f) => f ? { ...f, qty: Math.min(availableQty, Math.max(1, Number.isFinite(v) ? v : 1)) } : f)
                            }}
                            className="w-14 rounded-lg border border-[var(--border)] py-1 text-center text-sm font-bold outline-none transition focus:border-[#60a5fa]"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((f) => f ? { ...f, qty: Math.min(availableQty, f.qty + 1) } : f)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold text-[var(--text-secondary)] transition hover:border-[#60a5fa]"
                          >+</button>
                        </div>
                      </div>

                      {/* Destination */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Destination Customer</p>
                        {destOptions.length > 0 ? (
                          <select
                            value={form.targetLineId}
                            onChange={(e) => setForm((f) => f ? { ...f, targetLineId: e.target.value } : f)}
                            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#60a5fa]"
                          >
                            <option value="">— Select customer —</option>
                            {destOptions.map((dl) => (
                              <option key={dl.id} value={dl.id}>{dl.customer!.name}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-[#dc2626]">No other customers to transfer to.</p>
                        )}
                      </div>

                      {/* Reason */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Reason</p>
                        <input
                          type="text"
                          value={form.reason}
                          onChange={(e) => setForm((f) => f ? { ...f, reason: e.target.value } : f)}
                          placeholder="e.g. Urgent site requirement"
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#60a5fa]"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {REASON_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setForm((f) => f ? { ...f, reason: p } : f)}
                              className="rounded-md bg-[var(--n-100)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--n-200)]"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Impact preview */}
                    {form.targetLineId && (() => {
                      const destLine = destOptions.find((l) => l.id === form.targetLineId)
                      if (!destLine) return null
                      return (
                        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white/60 p-3 text-xs">
                          <span className="font-medium text-[var(--text-muted)]">Impact preview:</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {sourceLine.customer?.name}: {availableQty} → {availableQty - form.qty} at {STAGE_LABEL[form.stage]}
                          </span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {destLine.customer?.name}: {destLine.stages[form.stage]} → {destLine.stages[form.stage] + form.qty} at {STAGE_LABEL[form.stage]}
                          </span>
                        </div>
                      )
                    })()}

                    {err && (
                      <p className="mt-3 rounded-lg bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void executeTransfer()}
                        disabled={saving || !form.targetLineId || !form.reason.trim()}
                        className="rounded-xl bg-[#0f172a] px-5 py-2 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
                      >
                        {saving ? 'Transferring…' : `Transfer ${form.qty} unit${form.qty > 1 ? 's' : ''}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setForm(null); setErr('') }}
                        className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
