'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import type { BrandTab, HeaderCounts, PurchaseTrackerLine } from '@/lib/purchases-tracker'

interface MarkReceivedModalProps {
  line: PurchaseTrackerLine
  open: boolean
  onClose: () => void
  onMoved: (newCounts: HeaderCounts) => void
  brandScope?: BrandTab
}

export default function MarkReceivedModal({
  line,
  open,
  onClose,
  onMoved,
  brandScope = 'ALL',
}: MarkReceivedModalProps) {
  const maxQty = line.stages.NEEDS_PO
  const [qty, setQty] = useState(maxQty)
  const [saving, setSaving] = useState(false)

  function clamp(value: number) {
    return Math.min(maxQty, Math.max(1, value))
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/mark-received`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qty, brand: brandScope }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
      if (!res.ok || !data.stageTotals) {
        toast.error(data.message ?? data.error ?? 'Failed to mark received')
        return
      }
      onMoved(data.stageTotals)
      toast.success(`${qty} unit${qty !== 1 ? 's' : ''} received at godown`)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
          <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Mark received at godown
          </Dialog.Title>

          <div className="mt-1 rounded-2xl bg-[var(--n-50)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {line.product.brand}
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {line.product.name}
            </p>
            <p
              className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
            >
              {line.product.sku}
            </p>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Quantity received
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((v) => clamp(v - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#60a5fa] hover:text-[#2563eb]"
              >
                −
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                max={maxQty}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setQty(clamp(Number.isFinite(n) ? n : 1))
                }}
                className="w-20 rounded-2xl border border-[var(--border)] py-2 text-center text-2xl font-semibold tabular-nums outline-none transition focus:border-[#60a5fa]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              />
              <button
                type="button"
                onClick={() => setQty((v) => clamp(v + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#60a5fa] hover:text-[#2563eb]"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {maxQty - qty > 0
                ? `${maxQty - qty} of ${maxQty} will remain on order`
                : `All ${maxQty} units will be marked received`}
            </p>
          </div>

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
              onClick={() => void handleConfirm()}
              disabled={saving}
              className="flex-1 rounded-2xl bg-[#16a34a] py-3 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-40"
            >
              {saving ? 'Saving…' : `Confirm ${qty} unit${qty !== 1 ? 's' : ''}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
