'use client'

import { useEffect, useRef, useState } from 'react'
import {
  STAGE_LABEL,
  type BrandTab,
  type CustomerOption,
  type HeaderCounts,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

interface TransferPopoverProps {
  lineItemId: string
  productId: string
  currentStage: PurchaseStage
  availableQty: number
  onMoved: (newCounts: HeaderCounts, lineId?: string, fromStage?: PurchaseStage, toStage?: PurchaseStage, qty?: number) => void
  brandScope?: BrandTab
}

export default function TransferPopover({
  lineItemId,
  productId,
  currentStage,
  availableQty,
  onMoved,
  brandScope = 'ALL',
}: TransferPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(1)
  const [targetLineId, setTargetLineId] = useState('')
  const [reason, setReason] = useState('')
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return

    setQty(1)
    setTargetLineId('')
    setReason('')
    setErr('')

    void fetch(
      `/api/products/${encodeURIComponent(productId)}/customers-who-ordered?excludeLineId=${encodeURIComponent(lineItemId)}`,
    )
      .then(async (response) => {
        if (!response.ok) return []
        return response.json() as Promise<CustomerOption[]>
      })
      .then((result) => {
        // Route now always returns lineId; filter is a safety guard only
        const valid = Array.isArray(result) ? result.filter(c => c.lineId) : []
        setCustomers(valid)
      })
      .catch(() => setCustomers([]))
  }, [open, productId, lineItemId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleTransfer = async () => {
    if (!targetLineId) {
      setErr('Select destination customer')
      return
    }
    if (!reason.trim()) {
      setErr('Reason is required')
      return
    }

    setSaving(true)
    setErr('')

    try {
      const response = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(lineItemId)}/transfer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: currentStage,
            qty,
            targetLineId,
            reason,
            brand: brandScope,
          }),
        },
      )

      const data = await response.json() as { error?: string; message?: string; stageTotals?: HeaderCounts }

      if (!response.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Transfer failed')
        return
      }

      // No per-line optimistic patch — source loses qty and a different line
      // gains it. Update header counts and let SWR revalidation render truth.
      onMoved(data.stageTotals)
      setOpen(false)
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--n-50)] hover:text-[var(--text-primary)]"
      >
        Transfer ↱
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-[9999] w-72 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-float)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="text-xs text-[var(--text-muted)]">
            Transfer from:{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {STAGE_LABEL[currentStage]}
            </span>
            <span className="ml-2 text-[var(--text-placeholder)]">
              ({availableQty} available)
            </span>
          </div>

          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Quantity</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
              >
                -
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                max={availableQty}
                onChange={(event) => {
                  const nextQty = Number(event.target.value)
                  setQty(Math.min(availableQty, Math.max(1, Number.isFinite(nextQty) ? nextQty : 1)))
                }}
                className="w-16 rounded-xl border border-[var(--border)] py-1 text-center text-sm font-bold outline-none transition focus:border-[#60a5fa]"
              />
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(availableQty, value + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Destination Customer</p>
            {customers.length > 0 ? (
              <select
                value={targetLineId}
                onChange={(event) => setTargetLineId(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#60a5fa]"
              >
                <option value="">- Select customer -</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.lineId}>
                    {customer.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[#dc2626]">No eligible customers with allocations found.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Reason</p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Urgent site requirement"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#60a5fa]"
            />
          </div>

          {err && (
            <p className="rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">
              {err}
            </p>
          )}

          <button
            type="button"
            onClick={handleTransfer}
            disabled={saving || !targetLineId || !reason.trim() || customers.length === 0}
            className="w-full rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
          >
            {saving ? 'Transferring...' : 'Execute Transfer'}
          </button>
        </div>
      )}
    </div>
  )
}
