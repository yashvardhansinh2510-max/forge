'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { SalesNav } from '../shared/sales-nav'
import { QuotationTable } from './quotation-table'
import { QuotationBuilder } from './quotation-builder'
import { quotations, calcDocumentTotals, type Quotation } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'accepted', 'declined'] as const

export function QuotationsClient() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [selectedQuotation, setSelectedQuotation] = React.useState<Quotation | null>(null)

  const openCount = quotations.filter(q => q.status === 'sent' || q.status === 'viewed').length
  const pipelineValue = quotations
    .filter(q => q.status !== 'declined' && q.status !== 'draft')
    .reduce((sum, q) => sum + calcDocumentTotals(q.lineItems).grandTotal, 0)
  const acceptedValue = quotations
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + calcDocumentTotals(q.lineItems).grandTotal, 0)
  const conversionRate = Math.round(
    (quotations.filter(q => q.status === 'accepted').length /
      Math.max(1, quotations.filter(q => q.status !== 'draft').length)) * 100
  )

  const filtered = quotations.filter(q => {
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    const matchSearch = !search ||
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      q.projectName.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const kpis = [
    { label: 'Open Quotes', value: openCount.toString() },
    { label: 'Pipeline Value', value: formatINR(pipelineValue, true) },
    { label: 'Accepted (MTD)', value: formatINR(acceptedValue, true) },
    { label: 'Conversion Rate', value: `${conversionRate}%` },
  ]

  const actions = (
    <Button size="sm" onClick={() => toast.success('New quotation coming soon')}>
      <Plus size={14} className="mr-1.5" />
      New Quotation
    </Button>
  )

  return (
    <PageContainer
      title="Sales"
      subtitle={`${quotations.length} quotations · ${formatINR(pipelineValue, true)} in pipeline`}
      actions={actions}
    >
      <SalesNav />

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: APPLE_EASE, delay: i * 0.06 }}
            style={{
              flex: '1 1 140px',
              background: 'white',
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 2 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {kpi.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search quotations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', height: 32, padding: '0 10px 0 30px', fontSize: 13,
              background: 'var(--surface-tint)', border: '1.5px solid transparent', borderRadius: 8,
              outline: 'none', boxSizing: 'border-box', transition: 'all 150ms',
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.background = 'white'; (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.background = 'var(--surface-tint)'; (e.target as HTMLInputElement).style.borderColor = 'transparent'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border-default)'}`,
                background: statusFilter === s ? 'var(--accent-light)' : 'white',
                color: statusFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: statusFilter === s ? 600 : 500, cursor: 'pointer',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <QuotationTable data={filtered} globalFilter={search} onRowClick={setSelectedQuotation} />

      <QuotationBuilder
        quotation={selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        onConvertToOrder={() => {}}
      />
    </PageContainer>
  )
}
