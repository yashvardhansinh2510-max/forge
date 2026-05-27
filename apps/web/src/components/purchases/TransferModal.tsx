'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRightLeft } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useProcurementStore } from '@/lib/procurement-store'
import type { HeaderCounts, PurchaseTrackerLine } from '@/lib/purchases-tracker'

type TransferStage = 'INBOX' | 'DISPATCHED' | 'COMPLETED'

const STAGE_LABELS: Record<TransferStage, string> = {
  INBOX:      'Inbox',
  DISPATCHED: 'Dispatched',
  COMPLETED:  'Completed',
}

interface TransferModalProps {
  line:               PurchaseTrackerLine
  sourceCustomerId:   string
  sourceCustomerName: string
  allLines:           PurchaseTrackerLine[]
  onClose:            () => void
  onTransferred:      (newCounts: HeaderCounts) => void
}

const FREE_KEY = '__free__'

export default function TransferModal({
  line,
  sourceCustomerId,
  sourceCustomerName,
  allLines,
  onClose,
  onTransferred,
}: TransferModalProps) {
  const transferAllocation = useProcurementStore((s) => s.transferAllocation)

  const availableQty = line.stages.INBOX + line.stages.DISPATCHED

  const otherCustomers = allLines
    .filter(
      (l) =>
        l.product.id === line.product.id &&
        l.customer !== null &&
        l.customer.id !== sourceCustomerId,
    )
    .reduce<Array<{ id: string; name: string }>>((acc, l) => {
      if (!l.customer) return acc
      if (acc.some((c) => c.id === l.customer!.id)) return acc
      acc.push({ id: l.customer.id, name: l.customer.name })
      return acc
    }, [])

  const [targetCustomerId, setTargetCustomerId] = useState(
    otherCustomers[0]?.id ?? FREE_KEY,
  )
  const [freeCustomerName, setFreeCustomerName] = useState('')
  const [qty, setQty] = useState(Math.min(1, availableQty))
  const [stage, setStage] = useState<TransferStage>('INBOX')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function clamp(v: number) {
    return Math.min(availableQty, Math.max(1, v))
  }

  const targetName =
    targetCustomerId === FREE_KEY
      ? freeCustomerName.trim()
      : (otherCustomers.find((c) => c.id === targetCustomerId)?.name ?? '')

  async function handleConfirm() {
    if (!targetName) {
      toast.error('Select or enter a target customer')
      return
    }
    if (qty < 1 || qty > availableQty) {
      toast.error(`Qty must be between 1 and ${availableQty}`)
      return
    }

    setSaving(true)

    const toCustomerId =
      targetCustomerId === FREE_KEY
        ? `free-${Date.now()}`
        : targetCustomerId

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poLineItemId:     line.id,
          productId:        line.product.id,
          productName:      line.product.name,
          fromCustomerId:   sourceCustomerId,
          fromCustomerName: sourceCustomerName,
          toCustomerId,
          toCustomerName:   targetName,
          qty,
          stage,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { message?: string }
        toast.error(data.message ?? 'Transfer failed')
        return
      }
    } catch {
      // Network error — fall through to Zustand-only update
    }

    // Keep Zustand in sync for immediate UI response (optimistic)
    transferAllocation(
      line.poId,
      line.id,
      sourceCustomerId,
      sourceCustomerName,
      toCustomerId,
      targetName,
      line.product.id,
      line.product.name,
      line.product.sku,
      qty,
      stage as never,
      notes,
    )

    toast.success(`${qty} unit${qty !== 1 ? 's' : ''} transferred to ${targetName}`)
    onTransferred(line.stages)
    onClose()
    setSaving(false)
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ArrowRightLeft size={16} />
            </div>
            <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Transfer Items — {line.product.name}
            </Dialog.Title>
          </div>

          {/* Product info */}
          <div className="mt-4 rounded-2xl bg-[var(--n-50)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {line.product.brand}
            </p>
            <p
              className="mt-0.5 text-xs text-[var(--text-muted)]"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
            >
              {line.product.sku}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1">
              <span
                className="text-xs font-semibold tabular-nums text-violet-700"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {availableQty}
              </span>
              <span className="text-xs text-violet-500">available to transfer</span>
            </div>
          </div>

          {/* Transfer to customer */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Transfer to Customer
            </label>
            <select
              value={targetCustomerId}
              onChange={(e) => setTargetCustomerId(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#60a5fa]"
            >
              {otherCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={FREE_KEY}>Other customer…</option>
            </select>

            {targetCustomerId === FREE_KEY && (
              <input
                type="text"
                value={freeCustomerName}
                onChange={(e) => setFreeCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[#60a5fa]"
              />
            )}
          </div>

          {/* Qty */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Quantity to Transfer
            </label>
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
                max={availableQty}
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
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Max {availableQty} available for{' '}
              <span className="font-medium text-[var(--text-secondary)]">{sourceCustomerName}</span>
            </p>
          </div>

          {/* Stage after transfer */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Stage After Transfer
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as TransferStage)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#60a5fa]"
            >
              {(Object.keys(STAGE_LABELS) as TransferStage[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer, special instructions…"
              rows={2}
              className="w-full resize-none rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[#60a5fa]"
            />
          </div>

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
              onClick={() => void handleConfirm()}
              disabled={saving || availableQty === 0}
              className="flex-1 rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
            >
              {saving ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
