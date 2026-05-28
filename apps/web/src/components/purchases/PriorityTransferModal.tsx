'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import type { HeaderCounts, PurchaseTrackerLine, PurchaseStage } from '@/lib/purchases-tracker'
import { AlertCircle, ArrowRightLeft } from 'lucide-react'

type TransferStage = 'AT_GODOWN' | 'INBOX' | 'DISPATCHED'

const STAGE_LABELS: Record<TransferStage, string> = {
  AT_GODOWN:  'At Godown',
  INBOX:      'In Box',
  DISPATCHED: 'Dispatched',
}

interface PriorityTransferModalProps {
  line: PurchaseTrackerLine
  sourceCustomerName: string
  allLines: PurchaseTrackerLine[]
  onClose: () => void
  onTransferred: (newCounts?: HeaderCounts) => void
}

export default function PriorityTransferModal({
  line,
  sourceCustomerName,
  allLines,
  onClose,
  onTransferred,
}: PriorityTransferModalProps) {
  const { mutate } = useSWRConfig()

  // Available from Inbox + Dispatched
  const availableQty = (line.stages.INBOX || 0) + (line.stages.DISPATCHED || 0)

  // Find other customers who also have a PO line for this product
  const otherCustomers = allLines
    .filter(
      (l) =>
        l.product.id === line.product.id &&
        l.customer !== null &&
        l.customer.id !== line.customer?.id,
    )
    .reduce<Array<{ id: string; name: string; lineId: string }>>((acc, l) => {
      if (!l.customer) return acc
      if (acc.some((c) => c.id === l.customer!.id)) return acc
      acc.push({ id: l.customer.id, name: l.customer.name, lineId: l.id })
      return acc
    }, [])

  const FREE_KEY = '__free__'

  const [targetCustomerId, setTargetCustomerId] = useState(
    otherCustomers[0]?.id ?? FREE_KEY,
  )
  const [freeCustomerName, setFreeCustomerName] = useState('')
  const [qty, setQty] = useState(Math.min(1, availableQty))
  
  // Stages
  const [sourceStage, setSourceStage] = useState<TransferStage>(
    line.stages.INBOX > 0 ? 'INBOX' : 'DISPATCHED'
  )
  const [targetStage, setTargetStage] = useState<TransferStage>('INBOX')
  
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('URGENT')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  
  const [saving, setSaving] = useState(false)

  function clamp(v: number, max: number) {
    return Math.min(max, Math.max(1, v))
  }

  const selectedTarget = otherCustomers.find((c) => c.id === targetCustomerId)
  const targetName = targetCustomerId === FREE_KEY ? freeCustomerName.trim() : (selectedTarget?.name ?? '')
  const targetLineId = selectedTarget?.lineId

  // The max available in the SELECTED source stage
  const maxForStage = line.stages[sourceStage as PurchaseStage] || 0

  async function handleConfirm() {
    if (!targetName) {
      toast.error('Select or enter a target customer')
      return
    }
    if (qty < 1 || qty > maxForStage) {
      toast.error(`Qty must be between 1 and ${maxForStage} for ${STAGE_LABELS[sourceStage]}`)
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poLineItemId:     line.id,
          targetPoLineItemId: targetLineId,
          productId:        line.product.id,
          productName:      line.product.name,
          fromCustomerId:   line.customer?.id ?? 'unknown',
          fromCustomerName: sourceCustomerName,
          toCustomerId:     targetCustomerId === FREE_KEY ? `free-${Date.now()}` : targetCustomerId,
          toCustomerName:   targetName,
          qty,
          sourceStage,
          targetStage,
          urgency,
          reason,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? 'Transfer failed')
      }

      toast.success(`${qty} units transferred to ${targetName} successfully`)
      
      // Real mutation! Fetch the fresh data from Postgres.
      // E.g. we might invalidate the entire purchase tracker data
      await mutate('/api/purchase-orders/tracker')
      
      onTransferred()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <ArrowRightLeft size={16} />
            </div>
            <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Priority Reallocation
            </Dialog.Title>
          </div>

          {/* Product info */}
          <div className="mt-4 rounded-2xl bg-[var(--n-50)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {line.product.brand}
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
              {line.product.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
              {line.product.sku}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Take from Stage */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Take from Stage
              </label>
              <select
                value={sourceStage}
                onChange={(e) => {
                  setSourceStage(e.target.value as TransferStage)
                  setQty(Math.min(qty, line.stages[e.target.value as PurchaseStage] || 0))
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ea580c]"
              >
                {(Object.keys(STAGE_LABELS) as TransferStage[]).map((s) => {
                  const q = line.stages[s as PurchaseStage] || 0
                  return (
                    <option key={s} value={s} disabled={q === 0}>
                      {STAGE_LABELS[s]} ({q})
                    </option>
                  )
                })}
              </select>
            </div>
            
            {/* Move to Stage */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Move to Target Stage
              </label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as TransferStage)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ea580c]"
              >
                {(Object.keys(STAGE_LABELS) as TransferStage[]).map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer to customer */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Target Customer
            </label>
            <select
              value={targetCustomerId}
              onChange={(e) => setTargetCustomerId(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ea580c]"
            >
              {otherCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={FREE_KEY}>Direct Sales / Other…</option>
            </select>

            {targetCustomerId === FREE_KEY && (
              <input
                type="text"
                value={freeCustomerName}
                onChange={(e) => setFreeCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[#ea580c]"
              />
            )}
          </div>

          <div className="mt-5 flex gap-4">
            {/* Qty */}
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Qty
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty((v) => clamp(v - 1, maxForStage))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#ea580c] hover:text-[#ea580c]"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  max={maxForStage}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    setQty(clamp(Number.isFinite(n) ? n : 1, maxForStage))
                  }}
                  className="w-full min-w-0 rounded-2xl border border-[var(--border)] py-2 text-center text-xl font-semibold tabular-nums outline-none transition focus:border-[#ea580c]"
                  style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                />
                <button
                  type="button"
                  onClick={() => setQty((v) => clamp(v + 1, maxForStage))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg font-medium transition hover:border-[#ea580c] hover:text-[#ea580c]"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Urgency */}
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Priority
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full h-10 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#ea580c]"
                style={{ color: urgency === 'URGENT' ? '#ea580c' : 'inherit' }}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent (VIP)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>{sourceCustomerName}</strong> will be placed in <strong className="font-mono">AWAITING_REPLACEMENT</strong> for {qty} unit(s). This will deduct their {STAGE_LABELS[sourceStage]} inventory and increase their Pending CO count.
            </p>
          </div>

          {/* Reason */}
          <div className="mt-5">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Short reason (e.g. VIP Site Ready)"
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[#ea580c]"
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
              onClick={handleConfirm}
              disabled={saving || maxForStage === 0}
              className="flex-1 rounded-2xl bg-[#ea580c] py-3 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:opacity-40"
            >
              {saving ? 'Processing…' : 'Reallocate'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
