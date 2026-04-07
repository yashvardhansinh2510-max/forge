'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { SalesNav } from '../shared/sales-nav'
import { QuotationTable } from './quotation-table'
import { QuotationBuilder } from './quotation-builder'
import { quotations, calcDocumentTotals, type Quotation } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'
import { fetcher } from '@/lib/swr-helpers'

interface PendingRevision {
  id: string
  number: string
  revisionNumber: number
  clientName: string
  itemCount: number
  lockedAt: string | null
}

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'accepted', 'declined'] as const

export function QuotationsClient() {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [selectedQuotation, setSelectedQuotation] = React.useState<Quotation | null>(null)
  const [creatingPoId, setCreatingPoId] = React.useState<string | null>(null)

  const { data: pendingRevisions = [] } = useSWR<PendingRevision[]>(
    '/api/quotations/pending-po',
    fetcher,
    { revalidateOnFocus: false },
  )

  async function handleCreatePO(revisionId: string) {
    setCreatingPoId(revisionId)
    try {
      const res = await fetch(`/api/purchase-orders/from-revision/${revisionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message || 'Failed to create PO')
        return
      }
      toast.success('Purchase Order created — redirecting to Tracker')
      router.push('/purchases')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setCreatingPoId(null)
    }
  }

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

      {/* Ready to Order — locked DB revisions awaiting PO creation */}
      {pendingRevisions.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 10, letterSpacing: '0.05em' }}>
            READY TO ORDER — {pendingRevisions.length} revision{pendingRevisions.length !== 1 ? 's' : ''} approved
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingRevisions.map((rev) => (
              <div key={rev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow-sm)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                    {rev.number}
                  </span>
                  {rev.revisionNumber > 0 && (
                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>Rev {rev.revisionNumber}</span>
                  )}
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 10 }}>
                    {rev.clientName} · {rev.itemCount} item{rev.itemCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleCreatePO(rev.id)}
                  disabled={creatingPoId === rev.id}
                  style={{ height: 28, padding: '0 14px', borderRadius: 6, border: 'none', background: '#0071e3', color: 'white', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)', cursor: creatingPoId === rev.id ? 'not-allowed' : 'pointer', opacity: creatingPoId === rev.id ? 0.6 : 1 }}
                >
                  {creatingPoId === rev.id ? 'Creating…' : 'Create PO'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuotationTable data={filtered} globalFilter={search} onRowClick={setSelectedQuotation} />

      <QuotationBuilder
        quotation={selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        onConvertToOrder={() => {}}
      />
    </PageContainer>
  )
}
