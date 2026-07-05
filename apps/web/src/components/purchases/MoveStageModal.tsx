'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  STAGE_LABEL,
  STAGE_ORDER,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface MoveStageModalProps {
  line:          PurchaseTrackerLine
  currentStage:  PurchaseStage
  availableQty:  number
  onClose:       () => void
  onMoved:       (newCounts: HeaderCounts) => void
  brandScope?:   BrandTab
}

export default function MoveStageModal({
  line,
  currentStage,
  availableQty,
  onClose,
  onMoved,
  brandScope = 'ALL',
}: MoveStageModalProps) {
  const otherStages = STAGE_ORDER.filter((s) => s !== currentStage)

  const [targetStage, setTargetStage] = useState<PurchaseStage>(
    otherStages[0] ?? 'CO_BILLING',
  )
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function clamp(v: number) {
    return Math.min(availableQty, Math.max(1, v))
  }

  const isBackward = STAGE_ORDER.indexOf(targetStage) < STAGE_ORDER.indexOf(currentStage)

  const handleMove = async () => {
    setSaving(true)
    setErr('')

    try {
      const response = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStage: currentStage,
            toStage:   targetStage,
            qty,
            brand:     brandScope,
          }),
        },
      )

      const data = await response.json() as {
        error?:       string
        message?:     string
        stageTotals?: HeaderCounts
      }

      if (!response.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Move failed')
        return
      }

      onMoved(data.stageTotals)
      toast.success(
        `${qty} unit${qty !== 1 ? 's' : ''} moved to ${STAGE_LABEL[targetStage]}`,
      )
      onClose()
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">

          <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Move to Stage
          </Dialog.Title>

          {/* Product info */}
          <div className="mt-3 rounded-2xl bg-[var(--n-50)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {line.product.name}
            </p>
            <p
              className="mt-0.5 text-xs text-[var(--text-muted)]"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
            >
              {line.product.sku}
            </p>
          </div>

          {/* Stage selector */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Stages
            </label>
            <div className="flex flex-col gap-1.5">
              {STAGE_ORDER.map((stage) => {
                const isCurrent = stage === currentStage
                const isTarget  = stage === targetStage
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => { if (!isCurrent) setTargetStage(stage) }}
                    disabled={isCurrent}
                    className={[
                      'flex w-full items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-left text-xs font-bold transition',
                      isCurrent
                        ? 'cursor-default border-[var(--border)] bg-[var(--n-100)] text-[var(--text-muted)]'
                        : isTarget
                          ? 'border-[#2563eb] bg-[#2563eb] text-white'
                          : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[#60a5fa]',
                    ].join(' ')}
                  >
                    {isCurrent && <Lock size={11} className="shrink-0 opacity-60" />}
                    <span>{STAGE_LABEL[stage]}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] font-normal opacity-60">current</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Qty */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((v) => clamp(v - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#60a5fa] hover:text-[#2563eb]"
              >
                −
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                max={availableQty}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setQty(clamp(Number.isFinite(n) ? n : 1))
                }}
                className="w-16 rounded-2xl border border-[var(--border)] py-1.5 text-center text-xl font-semibold tabular-nums outline-none transition focus:border-[#60a5fa]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              />
              <button
                type="button"
                onClick={() => setQty((v) => clamp(v + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#60a5fa] hover:text-[#2563eb]"
              >
                +
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              {availableQty} available at {STAGE_LABEL[currentStage]}
            </p>
          </div>

          {/* Backward warning */}
          {isBackward && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              ⚠ Moving backwards in pipeline
            </div>
          )}

          {err && (
            <p className="mt-3 rounded-xl bg-[#fef2f2] p-2.5 text-xs text-[#dc2626]">
              {err}
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex-1 rounded-2xl border border-[var(--border)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleMove}
              disabled={saving}
              className="flex-1 rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
            >
              {saving
                ? 'Moving…'
                : `Move ${qty} → ${STAGE_LABEL[targetStage]}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
