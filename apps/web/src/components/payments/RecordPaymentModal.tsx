'use client'

import { useState } from 'react'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { PaymentSummary } from '@/app/api/payments/route'

type Method = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD'

const METHODS: { value: Method; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
]

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

export default function RecordPaymentModal({
  order,
  onClose,
  onSaved,
}: {
  order: PaymentSummary
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [amount, setAmount] = useState(String(order.outstandingTotal))
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<Method>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseFloat(amount.replace(/,/g, ''))

  async function handleSave() {
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (parsedAmount > order.outstandingTotal + 0.01) {
      setError(`Amount exceeds outstanding (${formatINR(order.outstandingTotal)})`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: parsedAmount,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          receivedAt: new Date(date).toISOString(),
          recordedBy: 'Staff',
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Failed to save payment')
      }

      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[20px] border border-[var(--border)] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              Record Payment
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              {order.customerName} · {order.number} · {formatINR(order.outstandingTotal)} outstanding
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Amount Received (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-[10px] border border-[var(--accent)] bg-white px-3 py-2.5 text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-ui)' }}
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Outstanding: {formatINR(order.outstandingTotal)}
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Date Received
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--n-50)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>

          {/* Method */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className="rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition"
                  style={{
                    background: method === m.value ? '#141414' : 'var(--n-100)',
                    borderColor: method === m.value ? '#141414' : 'var(--border)',
                    color: method === m.value ? '#fff' : 'var(--text-secondary)',
                    fontWeight: method === m.value ? 600 : 500,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              Reference / Notes
              <span className="ml-1 font-normal normal-case text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cheque no., UTR, or any note..."
              className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--n-50)] px-3 py-2.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-[12px] text-[var(--danger)]">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-[var(--border)] px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 rounded-[10px] bg-[#141414] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2E2E2B] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--n-100)] px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}
