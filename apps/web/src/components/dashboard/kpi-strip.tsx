'use client'

import { motion } from 'framer-motion'
import { staggerContainer } from '@forge/ui'
import { KPITile } from './kpi-tile'
import { type KPIItem } from '@/lib/mock/dashboard-data'
import type { DashboardKPIs } from '@/app/api/dashboard/route'
import { formatINR } from '@/lib/mock/dashboard-data'

// ── Build live KPI items from real data ───────────────────────────────────────

function buildKpiItems(data: DashboardKPIs | undefined): KPIItem[] {
  if (!data) {
    // Return 6 placeholder skeletons while loading
    return [
      { id: 'followups',         label: 'Active Follow-ups',              value: 0, previousValue: 0, format: 'number',   icon: 'Users',        color: 'emerald', href: '/follow-ups' },
      { id: 'quotations',        label: 'Open Quotations',                value: 0, previousValue: 0, format: 'number',   icon: 'FileText',     color: 'orange',  href: '/pos' },
      { id: 'quot_followup',     label: 'Quotations Awaiting Follow-Up',  value: 0, previousValue: 0, format: 'number',   icon: 'Bell',         color: 'violet',  href: '/follow-ups' },
      { id: 'overdue',           label: 'Overdue Follow-ups',             value: 0, previousValue: 0, format: 'number',   icon: 'AlertCircle',  color: 'amber',   href: '/follow-ups', isAlert: true },
      { id: 'purchases',         label: 'PO Lines In Transit',            value: 0, previousValue: 0, format: 'number',   icon: 'ShoppingBag',  color: 'blue',    href: '/purchases' },
      { id: 'outstanding',       label: 'Outstanding',                    value: 0, previousValue: 0, format: 'currency', icon: 'IndianRupee',  color: 'violet',  href: '/payments' },
    ]
  }

  return [
    {
      id: 'followups',
      label: 'Active Follow-ups',
      value: data.activeFollowUps,
      previousValue: 0,
      format: 'number',
      icon: 'Users',
      color: 'emerald',
      href: '/follow-ups',
    },
    {
      id: 'quotations',
      label: 'Open Quotations',
      value: data.openQuotationsCount,
      previousValue: 0,
      format: 'number',
      subLabel: data.openQuotationsPipelineValue > 0
        ? `${formatINR(data.openQuotationsPipelineValue, true)} pipeline`
        : undefined,
      icon: 'FileText',
      color: 'orange',
      href: '/pos',
    },
    {
      id: 'quot_followup',
      label: 'Quotations Awaiting Follow-Up',
      value: data.openQuotationsAwaitingFollowUp,
      previousValue: 0,
      format: 'number',
      subLabel: 'Saved, no order yet',
      icon: 'Bell',
      color: 'violet',
      href: '/follow-ups',
      isAlert: data.openQuotationsAwaitingFollowUp > 0,
    },
    {
      id: 'overdue',
      label: 'Overdue Follow-ups',
      value: data.overdueFollowUps,
      previousValue: 0,
      format: 'number',
      icon: 'AlertCircle',
      color: 'amber',
      href: '/follow-ups',
      isAlert: data.overdueFollowUps > 0,
    },
    {
      id: 'purchases',
      label: 'PO Lines In Transit',
      value: data.poLinesInTransit,
      previousValue: 0,
      format: 'number',
      subLabel: 'Pending CO + Dist + Godown',
      icon: 'ShoppingBag',
      color: 'blue',
      href: '/purchases',
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: data.outstandingPayments,
      previousValue: 0,
      format: 'currency',
      subLabel: data.collectedThisMonth > 0
        ? `${formatINR(data.collectedThisMonth, true)} collected MTD`
        : undefined,
      icon: 'IndianRupee',
      color: 'violet',
      href: '/payments',
    },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

interface KPIStripProps {
  isLoading?: boolean
  data?: DashboardKPIs
}

export function KPIStrip({ isLoading = false, data }: KPIStripProps) {
  const items = buildKpiItems(data)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item, i) => (
        <KPITile key={item.id} {...item} index={i} isLoading={isLoading} />
      ))}
    </motion.div>
  )
}
