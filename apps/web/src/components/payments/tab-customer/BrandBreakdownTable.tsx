'use client'

import { useState } from 'react'
import {
  formatINR, BRAND_COLORS, buildWhatsAppLink, buildEmailLink,
  type CustomerAccount, type BrandAccount,
} from '@/lib/mock/payments-data'
import { RecordPaymentInline } from './RecordPaymentInline'

interface Props { account: CustomerAccount }

export function BrandBreakdownTable({ account }: Props) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)

  const allTotals = account.brandAccounts.reduce(
    (acc, ba) => ({
      ordered:  acc.ordered  + ba.ordered,
      billed:   acc.billed   + ba.billed,
      received: acc.received + ba.received,
      pending:  acc.pending  + Math.max(0, ba.billed - ba.received),
    }),
    { ordered: 0, billed: 0, received: 0, pending: 0 },
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Brand rows */}
      {account.brandAccounts.map(ba => (
        <BrandRow
          key={ba.brand}
          ba={ba}
          account={account}
          isOpen={expandedBrand === ba.brand}
          onToggle={() => setExpandedBrand(expandedBrand === ba.brand ? null : ba.brand)}
        />
      ))}

      {/* Totals strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 6, padding: '10px 14px',
        background: '#f9fafb', borderRadius: 8,
        border: '1px solid #e5e7eb', marginTop: 2,
      }}>
        <TotalCell label="Ordered"  value={allTotals.ordered}  color="#374151" />
        <TotalCell label="Billed"   value={allTotals.billed}   color="#2563eb" />
        <TotalCell label="Received" value={allTotals.received} color="#16a34a" />
        <TotalCell label="Pending"  value={allTotals.pending}
          color={allTotals.pending > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Action buttons */}
      {allTotals.pending > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={buildWhatsAppLink(account, allTotals.pending)}
            target="_blank" rel="noreferrer"
            style={actionLink('#f0fdf4', '#065f46', '#bbf7d0')}
          >
            💬 WhatsApp Reminder
          </a>
          <a
            href={buildEmailLink(account, allTotals.pending)}
            style={actionLink('#eef2ff', '#3730a3', '#c7d2fe')}
          >
            ✉️ Email Reminder
          </a>
        </div>
      )}
    </div>
  )
}

function BrandRow({ ba, account, isOpen, onToggle }: {
  ba:       BrandAccount
  account:  CustomerAccount
  isOpen:   boolean
  onToggle: () => void
}) {
  const color   = BRAND_COLORS[ba.brand] ?? '#6b7280'
  const pending = Math.max(0, ba.billed - ba.received)
  const pct     = ba.billed > 0 ? (ba.received / ba.billed) * 100 : 0
  const fullyPaid = ba.billed > 0 && pending === 0
  const notBilled = ba.billed === 0

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid ' + (isOpen ? '#bfdbfe' : '#e5e7eb'),
      background: isOpen ? '#f8faff' : '#fff',
      overflow: 'hidden',
    }}>
      {/* Main row */}
      <div style={{ padding: '12px 14px' }}>
        {/* Top: brand name + pct + action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#111827',
            fontFamily: 'var(--font-ui)', flex: 1,
          }}>
            {ba.brand}
          </span>
          {!notBilled && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: fullyPaid ? '#16a34a' : color,
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(pct)}% collected
            </span>
          )}
          {notBilled && (
            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
              Not yet billed
            </span>
          )}
          {!notBilled && pending > 0 && (
            <button
              onClick={onToggle}
              style={{
                height: 26, padding: '0 10px', borderRadius: 5,
                border: '1px solid ' + (isOpen ? '#93c5fd' : '#2563eb'),
                background: isOpen ? '#dbeafe' : '#2563eb',
                color: isOpen ? '#1d4ed8' : '#fff',
                fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >
              {isOpen ? 'Close' : 'Record'}
            </button>
          )}
          {fullyPaid && (
            <span style={{
              fontSize: 11, color: '#16a34a', background: '#dcfce7',
              padding: '2px 8px', borderRadius: 12,
              fontFamily: 'var(--font-ui)', fontWeight: 600,
            }}>
              ✓ Paid
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!notBilled && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, pct)}%`, height: '100%',
                background: fullyPaid ? '#16a34a' : color,
                borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Numbers row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
          <NumCell label="Ordered"  value={ba.ordered}  color="#6b7280" />
          <NumCell label="Billed"   value={ba.billed}   color={notBilled ? '#d1d5db' : '#2563eb'} />
          <NumCell label="Received" value={ba.received} color={ba.received > 0 ? '#16a34a' : '#d1d5db'} />
          <NumCell label="Pending"  value={pending}     color={pending > 0 ? '#dc2626' : '#d1d5db'} />
        </div>
      </div>

      {/* Inline record payment form */}
      {isOpen && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #dbeafe' }}>
          <RecordPaymentInline
            customerId={account.customerId}
            brand={ba.brand}
            pending={pending}
            onClose={onToggle}
          />
        </div>
      )}
    </div>
  )
}

function NumCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color,
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value === 0 ? '—' : formatINR(value)}
      </div>
    </div>
  )
}

function TotalCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 800, color,
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value === 0 ? '—' : formatINR(value)}
      </div>
    </div>
  )
}

function actionLink(bg: string, color: string, border: string): React.CSSProperties {
  return {
    height: 32, padding: '0 14px', borderRadius: 7,
    border: `1px solid ${border}`, background: bg, color,
    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
    textDecoration: 'none', display: 'inline-flex',
    alignItems: 'center', gap: 5, cursor: 'pointer',
  }
}
