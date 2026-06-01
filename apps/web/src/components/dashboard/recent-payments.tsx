'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { DashboardRecentPayment } from '@/app/api/dashboard/route'

const METHOD_LABEL: Record<string, string> = {
  CASH:          'Cash',
  UPI:           'UPI',
  BANK_TRANSFER: 'Bank',
  CHEQUE:        'Cheque',
  CREDIT_CARD:   'Card',
}

interface RecentPaymentsProps {
  isLoading?: boolean
  data?: DashboardRecentPayment[]
}

export function RecentPayments({ isLoading = false, data }: RecentPaymentsProps) {
  if (isLoading) {
    return (
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 110, height: 15 }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <div className="animate-pulse rounded bg-zinc-100" style={{ width: 70, height: 13 }} />
            <div className="animate-pulse rounded bg-zinc-100" style={{ flex: 1, height: 13 }} />
          </div>
        ))}
      </div>
    )
  }

  const items = data ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Payments</span>
        <a href="/payments" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No payments recorded</div>
      ) : (
        items.map((p) => (
          <div
            key={p.id}
            style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#16A34A', minWidth: 80 }}>
              {formatINR(p.amount, true)}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.customerName}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
              {METHOD_LABEL[p.method] ?? p.method}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', minWidth: 50, textAlign: 'right' }}>
              {format(new Date(p.receivedAt), 'dd MMM')}
            </span>
          </div>
        ))
      )}
    </motion.div>
  )
}
