'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calcDocumentTotals, formatINR } from '@/lib/mock/sales-data'
import type { Invoice, PaymentMethod } from '@/lib/mock/sales-data'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
]

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['bank_transfer', 'cheque', 'upi', 'cash', 'credit_card'] as const),
  reference: z.string().min(1, 'Reference is required'),
  notes: z.string().optional(),
})

export type PaymentFormData = z.infer<typeof paymentSchema>

interface RecordPaymentModalProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSubmit: (data: PaymentFormData) => void
}

export function RecordPaymentModal({
  open,
  invoice,
  onClose,
  onSubmit,
}: RecordPaymentModalProps) {
  const grandTotal = invoice ? calcDocumentTotals(invoice.lineItems).grandTotal : 0
  const outstanding = invoice ? grandTotal - invoice.paidAmount : 0

  const schema = invoice
    ? z.object({
        amount: z
          .number()
          .positive('Amount must be positive')
          .max(outstanding, `Cannot exceed outstanding balance of ${formatINR(outstanding)}`),
        method: z.enum(['bank_transfer', 'cheque', 'upi', 'cash', 'credit_card'] as const),
        reference: z.string().min(1, 'Reference is required'),
        notes: z.string().optional(),
      })
    : paymentSchema

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: outstanding,
      method: 'bank_transfer',
      reference: '',
      notes: '',
    },
  })

  const watchedAmount = watch('amount')
  const watchedMethod = watch('method')

  useEffect(() => {
    if (open && invoice) {
      reset({
        amount: outstanding,
        method: 'bank_transfer',
        reference: '',
        notes: '',
      })
    }
  }, [open, invoice, outstanding, reset])

  if (!open || !invoice) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
          padding: '28px 28px 24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Record Payment
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {invoice.number} · {invoice.customerName}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Amount */}
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}
            >
              <span>Amount</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                Outstanding: {formatINR(outstanding)}
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: `1px solid ${errors.amount ? '#DC2626' : 'var(--border-default)'}`,
                borderRadius: 8,
                fontSize: 15,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.amount && (
              <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Payment Method: segmented pill selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
              }}
            >
              Payment Method
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {PAYMENT_METHODS.map(({ value, label }) => {
                const active = watchedMethod === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('method', value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 99,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                      background: active ? 'var(--accent)' : '#fff',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}
            >
              Reference / UTR No.
            </label>
            <input
              type="text"
              {...register('reference')}
              placeholder="e.g. UTR123456789"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: `1px solid ${errors.reference ? '#DC2626' : 'var(--border-default)'}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errors.reference && (
              <p style={{ fontSize: 11, color: '#DC2626', margin: '4px 0 0' }}>
                {errors.reference.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 6,
              }}
            >
              Notes{' '}
              <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Any additional notes..."
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text-primary)',
                background: '#fff',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingTop: 4,
            }}
          >
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '11px 16px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              Record {watchedAmount && watchedAmount > 0 ? formatINR(watchedAmount) : ''} Payment
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 0',
                textAlign: 'center',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
