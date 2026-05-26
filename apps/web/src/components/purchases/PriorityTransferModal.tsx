'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { useProcurementStore } from '@/lib/procurement-store'
import type { PriorityTransfer } from '@/lib/mock/procurement-data'
import type { HeaderCounts, PurchaseTrackerLine } from '@/lib/purchases-tracker'

interface PriorityTransferModalProps {
  line: PurchaseTrackerLine
  sourceCustomerName: string
  allLines: PurchaseTrackerLine[]
  onClose: () => void
  onTransferred: (newCounts: HeaderCounts) => void
}

export default function PriorityTransferModal({
  line,
  sourceCustomerName,
  allLines,
  onClose,
  onTransferred,
}: PriorityTransferModalProps) {
  const logTransfer = useProcurementStore((s) => s.logTransfer)

  const availableQty = line.stages.AT_GODOWN + line.stages.IN_BOX

  const otherCustomers = allLines
    .filter(
      (l) =>
        l.product.id === line.product.id &&
        l.customer !== null &&
        l.customer.id !== line.customer?.id,
    )
    .reduce<Array<{ id: string; name: string }>>((acc, l) => {
      if (!l.customer) return acc
      if (acc.some((c) => c.id === l.customer!.id)) return acc
      acc.push({ id: l.customer.id, name: l.customer.name })
      return acc
    }, [])

  const FREE_KEY = '__free__'

  const [targetCustomerId, setTargetCustomerId] = useState(
    otherCustomers[0]?.id ?? FREE_KEY,
  )
  const [freeCustomerName, setFreeCustomerName] = useState('')
  const [qty, setQty] = useState(Math.min(1, availableQty))
  const [createReorder, setCreateReorder] = useState(true)
  const [saving, setSaving] = useState(false)

  function clamp(v: number) {
    return Math.min(availableQty, Math.max(1, v))
  }

  const targetName =
    targetCustomerId === FREE_KEY
      ? freeCustomerName.trim()
      : (otherCustomers.find((c) => c.id === targetCustomerId)?.name ?? '')

  function handleConfirm() {
    if (!targetName) {
      toast.error('Select or enter a target customer')
      return
    }
    if (qty < 1 || qty > availableQty) {
      toast.error(`Qty must be between 1 and ${availableQty}`)
      return
    }

    setSaving(true)

    const now = new Date().toISOString()
    const dateLabel = new Date(now).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const transfer: PriorityTransfer = {
      id:               `xfer-${Date.now()}`,
      productId:        line.product.id,
      productName:      line.product.name,
      qty,
      fromCustomerId:   line.customer?.id ?? 'unknown',
      fromCustomerName: sourceCustomerName,
      toCustomerId:
        targetCustomerId === FREE_KEY
          ? `free-${Date.now()}`
          : targetCustomerId,
      toCustomerName:   targetName,
      reorderCreated:   createReorder,
      note:             createReorder
        ? `Reordered after priority transfer to ${targetName} on ${dateLabel}`
        : '',
      transferredAt:    now,
      transferredBy:    'Buildcon Team',
    }

    logTransfer(transfer)

    toast.success(
      `Priority transfer: ${qty}× ${line.product.name} → ${targetName}` +
        (createReorder ? ` · Reorder queued for ${sourceCustomerName}` : ''),
    )

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

          <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Priority Transfer
          </Dialog.Title>

          {/* Product info */}
          <div className="mt-4 rounded-2xl bg-[var(--n-50)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {line.product.brand}
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {line.product.name}
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
              <span className="text-xs text-violet-500">available at godown</span>
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
              Qty to Transfer
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
              Max {availableQty} · currently allocated to{' '}
              <span className="font-medium text-[var(--text-secondary)]">{sourceCustomerName}</span>
            </p>
          </div>

          {/* Reorder checkbox */}
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--n-50)] p-4">
            <input
              type="checkbox"
              checked={createReorder}
              onChange={(e) => setCreateReorder(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-[#2563eb]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Auto-create <span className="font-semibold text-[var(--text-primary)]">NEEDS_PO</span>{' '}
              for{' '}
              <span className="font-semibold text-[var(--text-primary)]">{sourceCustomerName}</span>
              {' '}(qty:{' '}
              <span
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {qty}
              </span>
              )
            </span>
          </label>

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
              onClick={handleConfirm}
              disabled={saving || availableQty === 0}
              className="flex-1 rounded-2xl bg-[#ea580c] py-3 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:opacity-40"
            >
              {saving ? 'Transferring…' : 'Transfer & Reorder'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
