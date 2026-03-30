'use client'

import { useState, useMemo } from 'react'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { InvoicingNav } from '@/components/sales/shared/invoicing-nav'
import { PaymentsTable } from '@/components/invoicing/payments/payments-table'
import { payments, formatINR } from '@/lib/mock/sales-data'

export function PaymentsClient() {
  const [search, setSearch] = useState('')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const thisMonthTotal = useMemo(
    () =>
      payments
        .filter((p) => {
          const d = new Date(p.receivedAt)
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth
        })
        .reduce((s, p) => s + p.amount, 0),
    [currentYear, currentMonth]
  )

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0)
  const avgPayment = payments.length > 0 ? totalReceived / payments.length : 0

  const filtered = useMemo(() => {
    if (!search.trim()) return payments
    const q = search.toLowerCase()
    return payments.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
    )
  }, [search])

  const kpiStyle = {
    background: '#fff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: 'var(--shadow-sm)',
  }

  return (
    <PageContainer
      title="Payments"
      subtitle="Payment receipts and reconciliation"
      actions={<Button>Record Payment</Button>}
    >
      <InvoicingNav />

      {/* Stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={kpiStyle}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Total Received
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              color: '#15803D',
              letterSpacing: '-0.02em',
            }}
          >
            {formatINR(totalReceived)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            This Month
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              color: '#15803D',
              letterSpacing: '-0.02em',
            }}
          >
            {formatINR(thisMonthTotal)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Avg Payment
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatINR(avgPayment)}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search payments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '8px 12px',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-primary)',
            background: '#fff',
            outline: 'none',
          }}
        />
      </div>

      <PaymentsTable data={filtered} globalFilter={search} />
    </PageContainer>
  )
}
