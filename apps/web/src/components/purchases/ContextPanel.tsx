'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  STAGE_COLORS,
  STAGE_FRIENDLY_NAME,
  STAGE_LABEL,
  STAGE_ORDER,
  effectiveCeiling,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import UniversalTransfer from '@/components/purchases/UniversalTransfer'

// ─── Legal forward transitions ─────────────────────────────────────────────────
const LEGAL: Record<PurchaseStage, PurchaseStage[]> = {
  UNALLOCATED: ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO: ['PENDING_DIST', 'GODOWN'],
  PENDING_DIST: ['GODOWN'],
  GODOWN: ['IN_BOX'],
  IN_BOX: ['DISPATCHED'],
  DISPATCHED: ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}

// ─── Movement history type ──────────────────────────────────────────────────────
interface Movement {
  id: string
  fromStage: string
  toStage: string
  qty: number
  note: string | null
  movedAt: string
  movedBy: { name: string; email: string }
}

const historyFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load history')
  const data = await res.json() as { movements: Movement[] }
  return data.movements
}

interface Props {
  line: PurchaseTrackerLine
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  defaultTab?: 'move' | 'transfer' | 'history'
  onClose: () => void
  onMoved: (newCounts: HeaderCounts, lineId?: string, fromStage?: PurchaseStage, toStage?: PurchaseStage, qty?: number) => void
}

function StageBar({ line }: { line: PurchaseTrackerLine }) {
  const total = effectiveCeiling(line)
  return (
    <div className="space-y-2">
      {STAGE_ORDER.filter((s) => line.stages[s] > 0).map((s) => {
        const pct = total > 0 ? (line.stages[s] / total) * 100 : 0
        return (
          <div key={s} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0 truncate text-[var(--text-muted)]">{STAGE_LABEL[s]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--n-100)]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STAGE_COLORS[s] }} />
            </div>
            <span
              className="w-4 shrink-0 text-right font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: STAGE_COLORS[s] }}
            >
              {line.stages[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MoveSection({
  line,
  activeBrand,
  onMoved,
}: {
  line: PurchaseTrackerLine
  activeBrand: BrandTab
  onMoved: Props['onMoved']
}) {
  const [fromStage, setFromStage] = useState<PurchaseStage | null>(null)
  const [toStage, setToStage] = useState<PurchaseStage | ''>('')
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const activeStages = STAGE_ORDER.filter((s) => line.stages[s] > 0 && LEGAL[s].length > 0)

  useEffect(() => {
    setFromStage(activeStages[0] ?? null)
    setToStage('')
    setQty(1)
    setErr('')
  }, [line.id])

  useEffect(() => {
    if (fromStage) {
      setToStage(LEGAL[fromStage][0] ?? '')
      setQty(1)
    }
  }, [fromStage])

  if (activeStages.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No moveable stock on this line.</p>
  }

  const targets = fromStage ? LEGAL[fromStage] : []
  const available = fromStage ? line.stages[fromStage] : 0

  async function doMove() {
    if (!fromStage || !toStage) return
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromStage, toStage, qty, brand: activeBrand }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
      if (!res.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Move failed')
        return
      }
      onMoved(data.stageTotals, line.id, fromStage, toStage, qty)
      setQty(1)
      setErr('')
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* From stage selector */}
      <div className="flex flex-wrap gap-1.5">
        {activeStages.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFromStage(s)}
            className={[
              'rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
              fromStage === s
                ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[#93c5fd]',
            ].join(' ')}
          >
            {STAGE_FRIENDLY_NAME[s] ?? STAGE_LABEL[s]} ({line.stages[s]})
          </button>
        ))}
      </div>

      {fromStage && (
        <div className="space-y-2.5">
          {/* To stage */}
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setToStage(t)}
                className={[
                  'flex-1 rounded-xl border-2 py-2 text-xs font-bold transition',
                  toStage === t
                    ? 'border-[#2563eb] bg-[#2563eb] text-white'
                    : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[#93c5fd]',
                ].join(' ')}
              >
                → {STAGE_FRIENDLY_NAME[t] ?? STAGE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Qty */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
            >-</button>
            <input
              type="number"
              value={qty}
              min={1}
              max={available}
              onChange={(e) => {
                const v = Number(e.target.value)
                setQty(Math.min(available, Math.max(1, Number.isFinite(v) ? v : 1)))
              }}
              className="w-14 rounded-xl border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[#60a5fa]"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(available, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
            >+</button>
            <span className="text-xs text-[var(--text-muted)]">of {available}</span>
          </div>

          {err && <p className="rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>}

          <button
            type="button"
            onClick={() => void doMove()}
            disabled={saving || !toStage}
            className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
          >
            {saving ? 'Moving…' : `Move ${qty} → ${toStage ? (STAGE_FRIENDLY_NAME[toStage] ?? STAGE_LABEL[toStage]) : '…'}`}
          </button>
        </div>
      )}
    </div>
  )
}

function HistorySection({ lineId }: { lineId: string }) {
  const { data: movements, isLoading } = useSWR(
    `/api/purchase-orders/lines/${lineId}/history`,
    historyFetcher,
  )

  if (isLoading) return <p className="text-xs text-[var(--text-muted)]">Loading history…</p>
  if (!movements?.length) return <p className="text-xs text-[var(--text-muted)]">No movements recorded yet.</p>

  const CANONICAL = new Set([
    'UNALLOCATED','PENDING_CO','PENDING_DIST','GODOWN','IN_BOX','DISPATCHED','NOT_DISPLAYED',
    'TRANSFERRED_IN','TRANSFERRED_OUT',
  ])

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const isTransfer = m.toStage === 'TRANSFERRED_OUT' || m.fromStage === 'TRANSFERRED_IN'
        const isLegacy = !isTransfer && (!CANONICAL.has(m.fromStage) || !CANONICAL.has(m.toStage))
        const friendlyFrom = STAGE_FRIENDLY_NAME[m.fromStage as PurchaseStage] ?? m.fromStage
        const friendlyTo   = STAGE_FRIENDLY_NAME[m.toStage as PurchaseStage]   ?? m.toStage
        return (
          <div key={m.id} className={[
            'rounded-xl border p-3',
            isTransfer ? 'border-[#fde68a] bg-[#fffbeb]' :
            isLegacy  ? 'border-[#e5e7eb] bg-[#f9fafb] opacity-60' :
            'border-[var(--border)] bg-[var(--n-50)]',
          ].join(' ')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {isTransfer
                  ? m.fromStage === 'TRANSFERRED_IN'
                    ? `Received from transfer · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
                    : `Given to customer · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
                  : isLegacy
                  ? `[Legacy] ${m.fromStage} → ${m.toStage} · ${m.qty}`
                  : `${friendlyFrom} → ${friendlyTo} · ${m.qty} unit${m.qty > 1 ? 's' : ''}`
                }
              </p>
              <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                {new Date(m.movedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {m.note && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{m.note}</p>}
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{m.movedBy.name}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function ContextPanel({ line, allLines: _allLines, activeBrand, defaultTab = 'move', onClose, onMoved }: Props) {
  const [tab, setTab] = useState<'move' | 'transfer' | 'history'>(defaultTab)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTab(defaultTab)
  }, [line.id, defaultTab])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-40 flex h-full w-[380px] flex-col overflow-hidden border-l border-[var(--border)] bg-white shadow-[−8px_0_40px_rgba(0,0,0,0.12)]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{line.product.name}</p>
            <p className="font-mono text-xs text-[var(--text-muted)]">{line.product.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Product info */}
          <div className="border-b border-[var(--border)] p-5">
            <div className="flex gap-4">
              {line.product.imageUrl ? (
                <div className="relative h-20 w-20 shrink-0">
                  <Image
                    src={line.product.imageUrl}
                    alt={line.product.name}
                    fill
                    className="rounded-2xl border border-[var(--border)] object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--n-50)] text-xs font-bold text-[var(--text-muted)]">
                  {line.product.brand.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)]">{line.product.brand} · {line.product.finishName ?? 'Standard'}</p>
                {line.customer && (
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{line.customer.name}</p>
                )}
                {line.customer?.siteAddress && (
                  <p className="text-xs text-[var(--text-muted)]">{line.customer.siteAddress}</p>
                )}
                <p className="mt-1 text-xs text-[var(--text-muted)]">PO: {line.poNumber}</p>
              </div>
            </div>

            {/* Stage overview */}
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {line.qtyOrdered} ordered
              </p>
              <StageBar line={line} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {(['move', 'transfer', 'history'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'flex-1 py-3 text-xs font-semibold transition',
                  tab === t
                    ? 'border-b-2 border-[#2563eb] text-[#2563eb]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {t === 'move' ? 'Move Stock' : t === 'transfer' ? 'Give to Customer' : 'Activity Log'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {tab === 'move' && (
              <MoveSection line={line} activeBrand={activeBrand} onMoved={onMoved} />
            )}
            {tab === 'transfer' && (
              <UniversalTransfer
                line={line}
                activeBrand={activeBrand}
                onMoved={onMoved}
              />
            )}
            {tab === 'history' && (
              <HistorySection lineId={line.id} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
