'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { SalesNav } from '../shared/sales-nav'
import { QuotationTable } from './quotation-table'
import { QuotationBuilder } from './quotation-builder'
import useSWR from 'swr'
import { type Quotation, type LineItem } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'accepted', 'declined'] as const

interface ApiQuotation {
  id: string
  revisionId: string
  quotationNumber: string
  status: string
  customerName: string | null
  siteAddress: string | null
  grandTotal: number
  createdAt: string
  lineItemCount: number
  isLocked: boolean
}

interface ApiLineItem {
  id: string
  sku: string
  productName: string
  unit: string
  qty: number
  unitPrice: number
  discount: number
  gstRate: number
}

function mapStatus(dbStatus: string): 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' {
  const map: Record<string, 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'> = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'sent',
    APPROVED: 'accepted',
    REJECTED: 'declined',
    LOCKED: 'accepted',
    FINALIZED: 'accepted',
  }
  return map[dbStatus] ?? 'draft'
}

function apiToQuotation(q: ApiQuotation, lineItems: LineItem[] = []): Quotation {
  return {
    id: q.id,
    revisionId: q.revisionId,
    number: q.quotationNumber,
    customerId: '',
    customerName: q.customerName ?? '',
    customerGST: '',
    billingAddress: '',
    siteAddress: q.siteAddress ?? '',
    projectName: q.siteAddress ?? '',
    revisionStatus: q.isLocked ? 'LOCKED' : 'DRAFT',
    status: mapStatus(q.status),
    grandTotal: q.grandTotal,
    lineItemCount: q.lineItemCount,
    lineItems,
    notes: '',
    termsAndConditions: '',
    createdBy: '',
    createdAt: new Date(q.createdAt),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }
}

// New Quotation modal
function NewQuotationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (q: Quotation) => void
}) {
  const [customerName, setCustomerName] = React.useState('')
  const [siteAddress, setSiteAddress] = React.useState('')
  const [projectName, setProjectName] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  async function handleCreate() {
    if (!customerName.trim()) { toast.error('Customer name required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          siteAddress: siteAddress.trim() || undefined,
          projectName: projectName.trim() || undefined,
          lineItems: [],
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Failed to create quotation')
      }
      const data = await res.json() as { id: string; quotationNumber: string; revisionId: string }
      const newQ: Quotation = {
        id: data.id,
        revisionId: data.revisionId,
        number: data.quotationNumber,
        customerId: '',
        customerName: customerName.trim(),
        customerGST: '',
        billingAddress: '',
        siteAddress: siteAddress.trim(),
        projectName: projectName.trim(),
        revisionStatus: 'DRAFT',
        status: 'draft',
        grandTotal: 0,
        lineItems: [],
        notes: '',
        termsAndConditions: '',
        createdBy: '',
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
      onCreated(newQ)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create quotation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: APPLE_EASE }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 420, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>New Quotation</h2>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'white', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Customer Name *
              </label>
              <input
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
                placeholder="e.g. Mehta Architects"
                style={{ width: '100%', height: 36, padding: '0 12px', fontSize: 14, border: '1.5px solid var(--border-default)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Project / Site Address
              </label>
              <input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="e.g. Lodha Altamount, Breach Candy"
                style={{ width: '100%', height: 36, padding: '0 12px', fontSize: 14, border: '1.5px solid var(--border-default)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Project Name
              </label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Master Bathroom"
                style={{ width: '100%', height: 36, padding: '0 12px', fontSize: 14, border: '1.5px solid var(--border-default)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, height: 38, borderRadius: 8, border: '1px solid var(--border-default)', background: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={saving || !customerName.trim()}
              style={{ flex: 1, height: 38, borderRadius: 8, border: 'none', background: saving || !customerName.trim() ? '#9ca3af' : '#111827', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving || !customerName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create & Open'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function QuotationsClient() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [selectedQuotation, setSelectedQuotation] = React.useState<Quotation | null>(null)
  const [showNewModal, setShowNewModal] = React.useState(false)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const { data: apiQuotations = [], isLoading, mutate } = useSWR<ApiQuotation[]>(
    '/api/quotations',
    (url: string) => fetch(url).then(r => r.json()),
  )

  const quotations = apiQuotations.map((q) => apiToQuotation(q))

  // Upsert follow-ups for sent/viewed quotations via API (idempotent)
  const processedRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    quotations.forEach((q) => {
      if (!q.id || processedRef.current.has(q.id)) return
      if (q.status === 'sent' || q.status === 'viewed') {
        processedRef.current.add(q.id)
        void fetch('/api/follow-ups/from-quotation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quotationId: q.id,
            quotationNumber: q.number,
            quotationValue: q.grandTotal ?? 0,
            revisionNumber: 0,
            customerName: q.customerName,
            customerPhone: '',
            projectName: q.projectName ?? undefined,
            brandsInterested: [],
            assignedTo: 'Suresh Iyer',
          }),
        })
      }
    })
  }, [quotations])

  const openCount = quotations.filter(q => q.status === 'sent' || q.status === 'viewed').length
  const pipelineValue = quotations
    .filter(q => q.status !== 'declined')
    .reduce((sum, q) => sum + (q.grandTotal ?? 0), 0)
  const acceptedValue = quotations
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + (q.grandTotal ?? 0), 0)
  const conversionRate = Math.round(
    (quotations.filter(q => q.status === 'accepted').length /
      Math.max(1, quotations.filter(q => q.status !== 'draft').length)) * 100
  )

  const filtered = quotations.filter(q => {
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    const matchSearch = !search ||
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const kpis = [
    { label: 'Open Quotes', value: openCount.toString() },
    { label: 'Pipeline Value', value: formatINR(pipelineValue, true) },
    { label: 'Accepted (MTD)', value: formatINR(acceptedValue, true) },
    { label: 'Conversion Rate', value: `${conversionRate}%` },
  ]

  // Load full quotation data (with line items) before opening builder
  async function handleRowClick(q: Quotation) {
    const revisionId = q.revisionId
    if (!revisionId) { setSelectedQuotation(q); return }

    setLoadingId(q.id)
    try {
      const res = await fetch(`/api/quotations/${revisionId}`)
      if (!res.ok) { setSelectedQuotation(q); return }
      const fullData = await res.json() as {
        id: string
        revisionId: string
        quotationNumber: string
        status: string
        isLocked: boolean
        customerName: string | null
        siteAddress: string | null
        lineItems: ApiLineItem[]
      }
      const lineItems: LineItem[] = fullData.lineItems.map((li) => ({
        id: li.id,
        productId: '',
        productName: li.productName,
        sku: li.sku,
        description: '',
        unit: li.unit,
        qty: li.qty,
        unitPrice: li.unitPrice,
        discount: li.discount,
        gstRate: li.gstRate,
      }))
      setSelectedQuotation({
        ...q,
        customerName: fullData.customerName ?? q.customerName,
        siteAddress: fullData.siteAddress ?? q.siteAddress,
        lineItems,
        revisionStatus: fullData.isLocked ? 'LOCKED' : 'DRAFT',
      })
    } catch {
      setSelectedQuotation(q)
    } finally {
      setLoadingId(null)
    }
  }

  function handleBuilderClose() {
    setSelectedQuotation(null)
    void mutate()
  }

  const actions = (
    <Button size="sm" onClick={() => setShowNewModal(true)}>
      <Plus size={14} className="mr-1.5" />
      New Quotation
    </Button>
  )

  return (
    <PageContainer
      title="Sales"
      subtitle={isLoading ? 'Loading…' : `${quotations.length} quotations · ${formatINR(pipelineValue, true)} in pipeline`}
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

      {/* Loading overlay on row */}
      {loadingId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8, background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#2563eb' }}>
          <Loader2 size={14} className="animate-spin" />
          Loading quotation…
        </div>
      )}

      <QuotationTable
        data={filtered}
        globalFilter={search}
        onRowClick={handleRowClick}
        loadingId={loadingId}
        isLoading={isLoading}
      />

      <QuotationBuilder
        quotation={selectedQuotation}
        onClose={handleBuilderClose}
        onSave={() => void mutate()}
        onConvertToOrder={() => {}}
      />

      {showNewModal && (
        <NewQuotationModal
          onClose={() => setShowNewModal(false)}
          onCreated={(q) => {
            setShowNewModal(false)
            void mutate()
            setSelectedQuotation(q)
          }}
        />
      )}
    </PageContainer>
  )
}
