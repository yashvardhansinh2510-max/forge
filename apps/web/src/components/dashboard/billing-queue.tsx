'use client'

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { DashboardBillingQueueItem } from '@/app/api/dashboard/route'

interface BillingQueueProps {
  isLoading?: boolean
  data?: DashboardBillingQueueItem[]
}

export function BillingQueue({ isLoading = false, data }: BillingQueueProps) {
  if (isLoading) {
    return (
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 100, height: 15 }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <div className="animate-pulse rounded bg-zinc-100" style={{ flex: 1, height: 13 }} />
            <div className="animate-pulse rounded bg-zinc-100" style={{ width: 70, height: 13 }} />
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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {items.length > 0 && <AlertCircle size={14} color="#D97706" />}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Billing Queue</span>
          {items.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'rgba(217,119,6,0.1)', color: '#D97706' }}>
              {items.length}
            </span>
          )}
        </div>
        <a href="/payments" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Record →</a>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
          No outstanding orders
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.customerName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.number}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#DC2626' }}>
                {formatINR(item.outstanding, true)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>outstanding</div>
            </div>
          </div>
        ))
      )}
    </motion.div>
  )
}
