'use client'

import { useEffect, useRef, useState } from 'react'
import {
  STAGE_LABEL,
  type BrandTab,
  type CustomerOption,
  type HeaderCounts,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

const LEGAL: Record<PurchaseStage, PurchaseStage[]> = {
  UNALLOCATED: ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO: ['PENDING_DIST', 'GODOWN'],
  PENDING_DIST: ['GODOWN'],
  GODOWN: ['IN_BOX'],
  IN_BOX: ['DISPATCHED'],
  DISPATCHED: ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}

interface MovePopoverProps {
  lineItemId: string
  productId: string
  currentStage: PurchaseStage
  availableQty: number
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  brandScope?: BrandTab
}

export default function MovePopover({
  lineItemId,
  productId,
  currentStage,
  availableQty,
  onMoved,
  brandScope = 'ALL',
}: MovePopoverProps) {
  const targets = LEGAL[currentStage] ?? []
  const ref = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [to, setTo] = useState<PurchaseStage | ''>(targets[0] ?? '')
  const [qty, setQty] = useState(1)
  const [custId, setCustId] = useState('')
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return

    setTo(targets[0] ?? '')
    setQty(1)
    setCustId('')
    setErr('')

    void fetch(`/api/products/${encodeURIComponent(productId)}/customers-who-ordered`)
      .then(async (response) => {
        if (!response.ok) return []
        return response.json() as Promise<CustomerOption[]>
      })
      .then((result) => setCustomers(Array.isArray(result) ? result : []))
      .catch(() => setCustomers([]))
  }, [open, productId, targets])

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

  if (targets.length === 0) {
    return (
      <span className="rounded-full border border-[var(--border)] bg-[var(--n-100)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
        Final stage
      </span>
    )
  }

  const handleMove = async () => {
    if (!to) {
      setErr('Select destination')
      return
    }

    setSaving(true)
    setErr('')

    try {
      const response = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(lineItemId)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStage: currentStage,
            toStage: to,
            qty,
            customerId: custId || undefined,
            brand: brandScope,
          }),
        },
      )

      const data = await response.json() as { error?: string; message?: string; stageTotals?: HeaderCounts }

      if (!response.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Move failed')
        return
      }

      onMoved(data.stageTotals, lineItemId, currentStage, to, qty)
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
        className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
      >
        Move →
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-[9999] w-64 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-float)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="text-xs text-[var(--text-muted)]">
            From:{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {STAGE_LABEL[currentStage]}
            </span>
            <span className="ml-2 text-[var(--text-placeholder)]">
              ({availableQty} available)
            </span>
          </div>

          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">How many?</p>
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
                className="w-14 rounded-xl border border-[var(--border)] py-1 text-center text-lg font-bold outline-none transition focus:border-[#60a5fa]"
              />
              <button
                type="button"
                onClick={() => setQty((value) => Math.min(availableQty, value + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--text-placeholder)]">
              {availableQty - qty} will stay at {STAGE_LABEL[currentStage]}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs text-[var(--text-muted)]">Move to</p>
            <div className="flex flex-col gap-2">
              {targets.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setTo(target)}
                  className={[
                    'w-full rounded-xl border-2 py-2.5 text-xs font-bold transition',
                    to === target
                      ? 'border-[#2563eb] bg-[#2563eb] text-white'
                      : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[#60a5fa]',
                  ].join(' ')}
                >
                  {STAGE_LABEL[target]}
                </button>
              ))}
            </div>
          </div>

          {customers.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-[var(--text-muted)]">Assign to customer</p>
              <select
                value={custId}
                onChange={(event) => setCustId(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none transition focus:border-[#60a5fa]"
              >
                <option value="">- No specific customer -</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {err && (
            <p className="rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">
              {err}
            </p>
          )}

          <button
            type="button"
            onClick={handleMove}
            disabled={saving || !to}
            className="w-full rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
          >
            {saving
              ? 'Moving...'
              : `Move ${qty} unit${qty > 1 ? 's' : ''} → ${to ? STAGE_LABEL[to] : '...'}`}
          </button>
        </div>
      )}
    </div>
  )
}
