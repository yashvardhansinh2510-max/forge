'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { tableRowVariants } from '@forge/ui'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { StatsTopCustomer } from '@/app/api/dashboard/stats/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#6B7280']

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length] ?? '#2563EB'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TopCustomersSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 'var(--r-md)', padding: 20, height: '100%' }}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 110, height: 15 }} />
          <div className="mt-1.5 animate-pulse rounded bg-zinc-100" style={{ width: 140, height: 12 }} />
        </div>
        <div className="animate-pulse rounded bg-zinc-100" style={{ width: 60, height: 12 }} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="animate-pulse rounded-full bg-zinc-100" style={{ width: 28, height: 28 }} />
          <div className="flex-1 animate-pulse rounded bg-zinc-100" style={{ height: 13 }} />
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 60, height: 13 }} />
        </div>
      ))}
    </div>
  )
}

// ── Customer Row ──────────────────────────────────────────────────────────────

function CustomerRow({ customer, index, maxRevenue }: { customer: StatsTopCustomer; index: number; maxRevenue: number }) {
  const barWidth = maxRevenue > 0 ? (customer.revenue / maxRevenue) * 80 : 0
  const initials = getInitials(customer.customerName)
  const color = getAvatarColor(customer.customerName)

  return (
    <motion.tr
      variants={tableRowVariants}
      initial="initial"
      animate="animate"
      custom={index}
      style={{ borderBottom: '1px solid var(--border)', transition: 'background 80ms' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--n-50)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
    >
      {/* Rank */}
      <td style={{ width: 32, padding: '10px 8px 10px 0', verticalAlign: 'middle' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--text-muted)' }}>
          {customer.rank}
        </span>
      </td>

      {/* Customer */}
      <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color, flexShrink: 0 }}>
            {initials}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {customer.customerName}
          </span>
        </div>
      </td>

      {/* Revenue */}
      <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'middle' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(customer.revenue, true)}
          </div>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: barWidth }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
            style={{ marginTop: 3, height: 2, borderRadius: 1, background: 'linear-gradient(90deg, var(--accent-light), var(--accent))' }}
          />
        </div>
      </td>

      {/* Orders */}
      <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'middle', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
        {customer.orderCount}
      </td>

      {/* Outstanding */}
      <td style={{ padding: '10px 8px 10px 0', verticalAlign: 'middle' }}>
        {customer.outstanding === 0 ? (
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>Cleared</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(customer.outstanding, true)}
          </span>
        )}
      </td>

      {/* Trend — neutral since no historical data */}
      <td style={{ padding: '10px 0', verticalAlign: 'middle', textAlign: 'right' }}>
        {customer.outstanding === 0
          ? <TrendingUp size={13} color="var(--text-muted)" />
          : customer.outstanding > customer.revenue * 0.5
          ? <TrendingDown size={13} color="var(--text-muted)" />
          : <Minus size={13} color="var(--text-muted)" />}
      </td>
    </motion.tr>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TopCustomersProps {
  isLoading?: boolean
  data?: StatsTopCustomer[]
}

export function TopCustomers({ isLoading = false, data }: TopCustomersProps) {
  if (isLoading) return <TopCustomersSkeleton />

  const customers = data ?? []

  if (customers.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 'var(--r-md)', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
          No customers yet. Create your first sales order.
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...customers.map((c) => c.revenue))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 'var(--r-md)', padding: 20, height: '100%', transition: 'box-shadow var(--t-base)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-raised)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-base)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Top Customers</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>By revenue · all time</div>
        </div>
        <button style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          View all →
        </button>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'Customer', 'Revenue', 'Orders', 'Outstanding', ''].map((col) => (
              <th key={col} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: col === 'Orders' ? 'center' : 'left', paddingBottom: 8, paddingTop: 4 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer, i) => (
            <CustomerRow key={customer.rank} customer={customer} index={i} maxRevenue={maxRevenue} />
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}
