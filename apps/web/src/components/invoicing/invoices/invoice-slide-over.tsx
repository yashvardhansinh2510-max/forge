'use client'

import { format } from 'date-fns'
import { SlideOver, DetailField } from '@/components/crm/shared/slide-over'
import { StatusBadge } from '@/components/sales/shared/status-badge'
import { DocumentTotals } from '@/components/sales/shared/document-totals'
import { calcDocumentTotals, formatINR } from '@/lib/mock/sales-data'
import type { Invoice } from '@/lib/mock/sales-data'

interface InvoiceSlideOverProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onRecordPayment: (inv: Invoice) => void
}

export function InvoiceSlideOver({
  open,
  invoice,
  onClose,
  onRecordPayment,
}: InvoiceSlideOverProps) {
  if (!invoice) return null

  const totals = calcDocumentTotals(invoice.lineItems)
  const { grandTotal } = totals
  const outstanding = grandTotal - invoice.paidAmount
  const paidPct = grandTotal > 0 ? Math.min((invoice.paidAmount / grandTotal) * 100, 100) : 0
  const isFullyPaid = invoice.status === 'paid'
  const barColor = isFullyPaid ? '#15803D' : invoice.paidAmount > 0 ? '#F59E0B' : '#E5E7EB'

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={invoice.number}
      subtitle={invoice.customerName}
      width={560}
    >
      {/* Header band */}
      <div
        style={{
          background: 'var(--surface-ground)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--accent)',
              letterSpacing: '-0.01em',
            }}
          >
            BUILDCON HOUSE
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            GST: 27AABCB1234K1Z5
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Mumbai, Maharashtra
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            {invoice.number}
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={invoice.status} size="md" />
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 24px',
          }}
        >
          <DetailField
            label="Issue Date"
            value={format(new Date(invoice.issueDate), 'dd MMM yyyy')}
          />
          <DetailField
            label="Due Date"
            value={format(new Date(invoice.dueDate), 'dd MMM yyyy')}
          />
          <DetailField label="Customer" value={invoice.customerName} />
          <DetailField label="GST No." value={invoice.customerGST} />
        </div>
        <DetailField label="Billing Address" value={invoice.billingAddress} />
      </div>

      {/* Line items mini-table */}
      <div style={{ padding: '0 24px 16px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Line Items
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Item', 'Qty', 'Rate', 'Disc%', 'Total'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '6px 0',
                    textAlign: col === 'Item' ? 'left' : 'right',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => {
              const subtotal = item.qty * item.unitPrice
              const discAmt = subtotal * (item.discount / 100)
              const lineTotal = subtotal - discAmt
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom:
                      i < invoice.lineItems.length - 1
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                  }}
                >
                  <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.productName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {item.sku}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      textAlign: 'right',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {item.qty} {item.unit}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      textAlign: 'right',
                      fontSize: 13,
                      fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text-secondary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {formatINR(item.unitPrice)}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      textAlign: 'right',
                      fontSize: 13,
                      color: item.discount > 0 ? '#B45309' : 'var(--text-tertiary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {item.discount > 0 ? `${item.discount}%` : '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      textAlign: 'right',
                      fontSize: 13,
                      fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      verticalAlign: 'top',
                    }}
                  >
                    {formatINR(lineTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Document totals */}
      <div style={{ padding: '0 24px 16px' }}>
        <DocumentTotals lineItems={invoice.lineItems} />
      </div>

      {/* Payment status */}
      <div
        style={{
          margin: '0 24px 16px',
          padding: 16,
          background: 'var(--surface-ground)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Payment
          </span>
          <span
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              color: isFullyPaid ? '#15803D' : 'var(--text-primary)',
            }}
          >
            {formatINR(invoice.paidAmount)} / {formatINR(grandTotal)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            background: '#E5E7EB',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${paidPct}%`,
              background: barColor,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {!isFullyPaid && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Outstanding:{' '}
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {formatINR(outstanding)}
              </span>
            </span>
          </div>
        )}

        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <button
            type="button"
            onClick={() => onRecordPayment(invoice)}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '9px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Record Payment
          </button>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ padding: '0 24px 24px' }}>
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
            Notes
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {invoice.notes}
          </p>
        </div>
      )}
    </SlideOver>
  )
}
