'use client'

import { usePaymentsStore } from '@/lib/payments-store'
import {
  filterPaymentsByPeriod,
  formatINR,
  BRAND_COLORS,
  PAYMENT_MODE_LABELS,
  type CustomerPaymentRecord,
} from '@/lib/mock/payments-data'

interface Props { customerId: string }

export function PaymentHistoryList({ customerId }: Props) {
  const { payments, yearFilter, monthFilter } = usePaymentsStore()

  const all        = payments.filter(p => p.customerId === customerId)
  const inPeriod   = filterPaymentsByPeriod(all, yearFilter, monthFilter)
  const periodSum  = inPeriod.reduce((s, r) => s + r.amount, 0)

  if (all.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
        No payments recorded yet.
      </div>
    )
  }

  return (
    <div>
      {/* Period summary */}
      {inPeriod.length > 0 && (
        <div style={{
          padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 7, marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: '#15803d', fontFamily: 'var(--font-ui)' }}>
            {inPeriod.length} payment{inPeriod.length > 1 ? 's' : ''} in selected period
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#15803d',
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatINR(periodSum)}
          </span>
        </div>
      )}

      {/* Records */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {all.map((rec) => (
          <PaymentRow key={rec.id} rec={rec} dimmed={monthFilter !== null && !inPeriod.includes(rec)} />
        ))}
      </div>
    </div>
  )
}

function PaymentRow({ rec, dimmed }: { rec: CustomerPaymentRecord; dimmed: boolean }) {
  const brandColor = BRAND_COLORS[rec.brand] ?? '#6b7280'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 7,
      background: dimmed ? '#fafafa' : '#fff',
      border: '1px solid ' + (dimmed ? '#f3f4f6' : '#e5e7eb'),
      opacity: dimmed ? 0.55 : 1,
    }}>
      {/* Brand dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: brandColor, flexShrink: 0, marginTop: 1,
      }} />

      {/* Brand + mode */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#111827',
            fontFamily: 'var(--font-ui)',
          }}>
            {rec.brand}
          </span>
          <span style={{
            fontSize: 10, color: '#6b7280', background: '#f3f4f6',
            padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-ui)',
          }}>
            {PAYMENT_MODE_LABELS[rec.mode]}
          </span>
          {rec.reference && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
              {rec.reference}
            </span>
          )}
        </div>
        {rec.note && (
          <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
            {rec.note}
          </div>
        )}
      </div>

      {/* Amount + date */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#16a34a',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        }}>
          {formatINR(rec.amount)}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
          {fmtDate(rec.paidAt)} · {rec.recordedBy}
        </div>
      </div>
    </div>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
