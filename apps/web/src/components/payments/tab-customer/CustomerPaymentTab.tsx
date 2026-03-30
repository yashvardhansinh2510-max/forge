'use client'

import { getAccountTotals, formatINR, type CustomerAccount } from '@/lib/mock/payments-data'
import { getInitials, getAvatarColor } from '@/lib/tracker-utils'
import { BrandBreakdownTable } from './BrandBreakdownTable'
import { PaymentHistoryList } from './PaymentHistoryList'

interface Props { account: CustomerAccount }

export function CustomerPaymentTab({ account }: Props) {
  const totals = getAccountTotals(account.brandAccounts)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Customer header strip */}
      <div style={{
        flexShrink: 0, padding: '14px 20px',
        borderBottom: '1px solid #e5e7eb', background: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: getAvatarColor(account.customerName),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
          fontFamily: 'var(--font-ui)', flexShrink: 0,
        }}>
          {getInitials(account.customerName)}
        </div>

        {/* Name + project */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)' }}>
            {account.customerName}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
            {account.projectName} · {account.projectAddress}
          </div>
        </div>

        {/* 4 KPI chips */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Chip label="Ordered"  value={formatINR(totals.ordered)}  color="#374151" bg="#f3f4f6" />
          <Chip label="Billed"   value={formatINR(totals.billed)}   color="#2563eb" bg="#dbeafe" />
          <Chip label="Received" value={formatINR(totals.received)} color="#16a34a" bg="#dcfce7" />
          <Chip
            label="Pending"
            value={totals.pending > 0 ? formatINR(totals.pending) : 'All clear'}
            color={totals.pending > 0 ? '#dc2626' : '#16a34a'}
            bg={totals.pending > 0 ? '#fee2e2' : '#dcfce7'}
          />
        </div>
      </div>

      {/* Two-column body — fills remaining height */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: brand breakdown (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <SectionLabel>Brand-wise Breakdown</SectionLabel>
          <BrandBreakdownTable account={account} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#e5e7eb', flexShrink: 0 }} />

        {/* Right: payment history (scrollable) */}
        <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', padding: '16px 14px' }}>
          <SectionLabel>Payment History</SectionLabel>
          <PaymentHistoryList customerId={account.customerId} />
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value, color, bg }: {
  label: string; value: string; color: string; bg: string
}) {
  return (
    <div style={{ background: bg, borderRadius: 7, padding: '5px 10px', textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 9, color: '#6b7280', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700, color,
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#9ca3af',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      fontFamily: 'var(--font-ui)', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}
