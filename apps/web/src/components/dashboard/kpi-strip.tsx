'use client'

import { motion } from 'framer-motion'
import { staggerContainer } from '@forge/ui'
import { KPITile } from './kpi-tile'
import { type KPIItem } from '@/lib/mock/dashboard-data'
import type { StatsKPIs } from '@/app/api/dashboard/stats/route'
import { formatINR } from '@/lib/mock/dashboard-data'

// ── Build live KPI items from real data ───────────────────────────────────────

function buildKpiItems(data: StatsKPIs | undefined): KPIItem[] {
  if (!data) {
    return [
      { id: 'revenue',    label: 'Revenue MTD',           value: 0, previousValue: 0, format: 'currency', icon: 'IndianRupee', color: 'blue',   href: '/sales/orders' },
      { id: 'quotations', label: 'Active Quotations',     value: 0, previousValue: 0, format: 'number',   icon: 'FileText',    color: 'orange', href: '/sales/quotations' },
      { id: 'pos',        label: 'Open Purchase Orders',  value: 0, previousValue: 0, format: 'number',   icon: 'ShoppingBag', color: 'violet', href: '/purchases' },
      { id: 'followups',  label: 'Pending Follow-ups',    value: 0, previousValue: 0, format: 'number',   icon: 'Users',       color: 'amber',  href: '/follow-ups' },
    ]
  }

  return [
    {
      id: 'revenue',
      label: 'Revenue MTD',
      value: data.totalRevenue,
      previousValue: data.totalRevenuePrev,
      format: 'currency',
      icon: 'IndianRupee',
      color: 'blue',
      href: '/sales/orders',
    },
    {
      id: 'quotations',
      label: 'Active Quotations',
      value: data.activeQuotations,
      previousValue: 0,
      format: 'number',
      subLabel: data.quotationValue > 0
        ? `${formatINR(data.quotationValue, true)} pipeline`
        : undefined,
      icon: 'FileText',
      color: 'orange',
      href: '/sales/quotations',
    },
    {
      id: 'pos',
      label: 'Open Purchase Orders',
      value: data.openPurchaseOrders,
      previousValue: 0,
      format: 'number',
      icon: 'ShoppingBag',
      color: 'violet',
      href: '/purchases',
    },
    {
      id: 'followups',
      label: 'Pending Follow-ups',
      value: data.pendingFollowUps,
      previousValue: 0,
      format: 'number',
      subLabel: 'Due in next 7 days',
      icon: 'Users',
      color: 'amber',
      href: '/follow-ups',
      isAlert: data.pendingFollowUps > 10,
    },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

interface KPIStripProps {
  isLoading?: boolean
  data?: StatsKPIs
}

export function KPIStrip({ isLoading = false, data }: KPIStripProps) {
  const items = buildKpiItems(data)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
    >
      {items.map((item, i) => (
        <KPITile key={item.id} {...item} index={i} isLoading={isLoading} />
      ))}
    </motion.div>
  )
}
