'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { InvoicingNav } from '@/components/sales/shared/invoicing-nav'
import { InvoiceTable } from '@/components/invoicing/invoices/invoice-table'
import { InvoiceSlideOver } from '@/components/invoicing/invoices/invoice-slide-over'
import { RecordPaymentModal } from '@/components/invoicing/invoices/record-payment-modal'
import type { PaymentFormData } from '@/components/invoicing/invoices/record-payment-modal'
import { invoices, calcDocumentTotals, formatINR } from '@/lib/mock/sales-data'
import type { Invoice, InvoiceStatus } from '@/lib/mock/sales-data'

const STATUS_FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Overdue', value: 'overdue' },
]

export function InvoicesClient() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)

  const allTotals = useMemo(
    () => invoices.map((inv) => ({ inv, totals: calcDocumentTotals(inv.lineItems) })),
    []
  )

  const totalInvoiced = allTotals.reduce((s, { totals }) => s + totals.grandTotal, 0)
  const totalCollected = invoices.reduce((s, inv) => s + inv.paidAmount, 0)
  const totalOutstanding = totalInvoiced - totalCollected
  const totalOverdue = allTotals
    .filter(({ inv }) => inv.status === 'overdue')
    .reduce((s, { totals }) => s + totals.grandTotal, 0)

  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue')
  const overdueOutstanding = overdueInvoices.reduce(
    (s, inv) => s + (calcDocumentTotals(inv.lineItems).grandTotal - inv.paidAmount),
    0
  )

  const filtered = useMemo(() => {
    let result = invoices
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
      )
    }
    return result
  }, [search, statusFilter])

  function handlePayment(data: PaymentFormData) {
    // Mock: just close the modal
    console.log('Payment recorded:', data)
    setPaymentTarget(null)
  }

  const kpiStyle = {
    background: '#fff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: 'var(--shadow-sm)',
  }

  return (
    <PageContainer
      title="Invoices"
      subtitle="Create, send, and track client invoices"
      actions={<Button>New Invoice</Button>}
    >
      <InvoicingNav />

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={16} color="#DC2626" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>
            {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''} overdue —{' '}
            {formatINR(overdueOutstanding)} total outstanding
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Total Invoiced
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalInvoiced)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Collected
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalCollected)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Outstanding
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalOutstanding)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Overdue
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--negative)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalOverdue)}
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
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
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map(({ label, value }) => {
            const active = statusFilter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  background: active ? 'var(--accent)' : '#fff',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <InvoiceTable data={filtered} globalFilter={search} onRowClick={setSelected} />

      {/* Slide-over */}
      <InvoiceSlideOver
        open={!!selected}
        invoice={selected}
        onClose={() => setSelected(null)}
        onRecordPayment={setPaymentTarget}
      />

      {/* Payment modal */}
      <RecordPaymentModal
        open={!!paymentTarget}
        invoice={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={handlePayment}
      />
    </PageContainer>
  )
}
