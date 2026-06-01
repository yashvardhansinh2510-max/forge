'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import type { DashboardRecentQuotation } from '@/app/api/dashboard/route'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:            { bg: 'rgba(142,142,147,0.1)', text: '#636366', label: 'Draft' },
  PENDING_APPROVAL: { bg: 'rgba(217,119,6,0.08)',  text: '#D97706', label: 'Pending' },
  APPROVED:         { bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'Approved' },
  LOCKED:           { bg: 'rgba(0,113,227,0.08)',  text: '#0071E3', label: 'Locked' },
  FINALIZED:        { bg: 'rgba(22,163,74,0.08)',  text: '#16A34A', label: 'Finalized' },
  REJECTED:         { bg: 'rgba(220,38,38,0.08)',  text: '#DC2626', label: 'Rejected' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'rgba(142,142,147,0.1)', text: '#636366', label: status }
  return (
    <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

interface RecentQuotationsProps {
  isLoading?: boolean
  data?: DashboardRecentQuotation[]
}

export function RecentQuotations({ isLoading = false, data }: RecentQuotationsProps) {
  if (isLoading) {
    return (
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 130, height: 15 }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <div className="animate-pulse rounded bg-zinc-100" style={{ width: 80, height: 13 }} />
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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Quotations</span>
        <a href="/pos" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>No quotations yet</div>
      ) : (
        items.map((q) => (
          <div
            key={q.id}
            style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--accent)', minWidth: 90 }}>
              {q.number}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.customerName ?? 'Unknown'}
            </span>
            <StatusBadge status={q.currentStatus} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>
              {format(new Date(q.createdAt), 'dd MMM')}
            </span>
          </div>
        ))
      )}
    </motion.div>
  )
}
