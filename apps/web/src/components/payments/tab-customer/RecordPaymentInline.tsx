'use client'

import { useState } from 'react'
import { usePaymentsStore } from '@/lib/payments-store'
import {
  formatINR,
  PAYMENT_MODE_LABELS,
  type PaymentMode,
} from '@/lib/mock/payments-data'

interface Props {
  customerId: string
  brand:      string
  pending:    number
  onClose:    () => void
}

const MODES: PaymentMode[] = ['NEFT', 'UPI', 'CHEQUE', 'CASH']

export function RecordPaymentInline({ customerId, brand, pending, onClose }: Props) {
  const recordPayment = usePaymentsStore((s) => s.recordPayment)

  const [amount,    setAmount]    = useState<string>(String(pending))
  const [mode,      setMode]      = useState<PaymentMode>('NEFT')
  const [reference, setReference] = useState('')
  const [note,      setNote]      = useState('')
  const [submitted, setSubmitted] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const isValid = parsedAmount > 0 && parsedAmount <= pending

  function handleSubmit() {
    if (!isValid) return
    recordPayment(
      customerId, brand, parsedAmount, mode,
      reference.trim() || null,
      note.trim() || null,
    )
    setSubmitted(true)
    setTimeout(onClose, 1200)
  }

  if (submitted) {
    return (
      <div style={{
        padding: '12px 16px', background: '#f0fdf4',
        border: '1px solid #bbf7d0', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 13, color: '#15803d', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
          Payment of {formatINR(parsedAmount)} recorded successfully
        </span>
      </div>
    )
  }

  return (
    <div style={{
      padding: 14, background: '#f8faff',
      border: '1px solid #bfdbfe', borderRadius: 8,
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#1d4ed8',
        fontFamily: 'var(--font-ui)', marginBottom: 10,
      }}>
        Record payment — {brand}
        <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>
          (outstanding: {formatINR(pending)})
        </span>
      </div>

      {/* Row 1: Amount + Mode */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>
            Amount (₹)
          </label>
          <input
            type="number"
            min={1}
            max={pending}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
              border: '1px solid ' + (!isValid && parsedAmount > 0 ? '#fca5a5' : '#e5e7eb'),
              fontSize: 13, fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
          {parsedAmount > pending && (
            <div style={{ fontSize: 10, color: '#dc2626', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
              Cannot exceed outstanding balance
            </div>
          )}
        </div>

        <div style={{ width: 140 }}>
          <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode)}
            style={{
              width: '100%', height: 32, padding: '0 8px', borderRadius: 6,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 13, fontFamily: 'var(--font-ui)', cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {MODES.map(m => (
              <option key={m} value={m}>{PAYMENT_MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Reference */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>
          Reference / Transaction ID (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. HDFC/2026/0315"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={{
            width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
            border: '1px solid #e5e7eb', fontSize: 13,
            fontFamily: 'var(--font-ui)', boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* Row 3: Note */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>
          Note (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. 50% advance against invoice"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            width: '100%', height: 32, padding: '0 10px', borderRadius: 6,
            border: '1px solid #e5e7eb', fontSize: 13,
            fontFamily: 'var(--font-ui)', boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            height: 32, padding: '0 16px', borderRadius: 6,
            border: 'none', background: isValid ? '#2563eb' : '#e5e7eb',
            color: isValid ? '#fff' : '#9ca3af',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          Record {parsedAmount > 0 && isValid ? formatINR(parsedAmount) : ''}
        </button>
        <button
          onClick={onClose}
          style={{
            height: 32, padding: '0 12px', borderRadius: 6,
            border: '1px solid #e5e7eb', background: '#fff',
            color: '#6b7280', fontSize: 13, fontFamily: 'var(--font-ui)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
