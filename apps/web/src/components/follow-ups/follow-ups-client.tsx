'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, List, LayoutGrid } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/page-container'
import { useRole } from '@/lib/use-role'
import { FollowUpsTable } from './follow-ups-table'
import { FollowUpSlideOver } from './follow-up-slide-over'
import { AddFollowUpModal } from './add-followup-modal'
import { FollowUpBoard } from './follow-up-board'
import {
  getEffectiveStatus,
  type FollowUp,
  type FollowUpStatus,
  type CustomerType,
  type ResponseMethod,
} from '@/lib/mock/followup-data'
import { quotations } from '@/lib/mock/sales-data'
import type { FollowUpsListResponse, FollowUpItem } from '@/app/api/follow-ups/route'
import { formatINR } from '@/lib/mock/dashboard-data'

// ── API helpers ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<FollowUpsListResponse>

function mapApiFollowUp(item: FollowUpItem): FollowUp {
  return {
    id: item.id,
    type: item.type.toLowerCase().replace('_', '_') as FollowUp['type'],
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    customerType: item.customerType.toLowerCase() as CustomerType,
    brandsInterested: item.brandsInterested,
    productsNoted: item.productsNoted ?? '',
    estimatedBudget: item.estimatedBudget ?? undefined,
    projectName: item.projectName ?? undefined,
    quotationId: item.quotationId ?? undefined,
    quotationNumber: item.quotationNumber ?? undefined,
    quotationValue: item.quotationValue ?? undefined,
    status: item.status.toLowerCase() as FollowUpStatus,
    nextFollowUpDate: new Date(item.nextFollowUpDate),
    lastContactedAt: item.lastContactedAt ? new Date(item.lastContactedAt) : undefined,
    notes: item.notes ?? '',
    assignedTo: item.assignedTo ?? 'Unassigned',
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    responses: item.responses.map((r) => ({
      id: r.id,
      date: new Date(r.date),
      method: r.method.toLowerCase() as ResponseMethod,
      outcome: r.outcome,
      nextAction: r.nextAction ?? '',
      staffMember: r.staffMember,
    })),
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const STATUS_FILTERS = [
  'all', 'pending', 'contacted', 'interested', 'negotiating', 'won', 'lost', 'overdue',
] as const

const TYPE_FILTERS = ['all', 'walk_in', 'quotation'] as const
const BRAND_FILTERS = ['All', 'Grohe', 'Axor', 'Hansgrohe', 'Vitra', 'Kajaria'] as const

type ViewMode = 'list' | 'board'

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        padding: '0 10px',
        borderRadius: 6,
        fontSize: 12,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
        background: active ? 'var(--accent-light)' : 'white',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FollowUpsClient() {
  const { canEdit } = useRole()
  const { data: apiData, isLoading, mutate } = useSWR<FollowUpsListResponse>(
    '/api/follow-ups',
    fetcher,
    { revalidateOnFocus: true }
  )

  const data = React.useMemo(
    () => (apiData?.followUps ?? []).map(mapApiFollowUp),
    [apiData]
  )

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [brandFilter, setBrandFilter] = React.useState<string>('All')
  const [view, setView] = React.useState<ViewMode>('list')
  const [selected, setSelected] = React.useState<FollowUp | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)

  // KPIs — from API or computed locally as fallback
  const kpis = apiData?.kpis
    ? [
        { label: 'Active',            value: String(apiData.kpis.active) },
        { label: 'Overdue',           value: String(apiData.kpis.overdue),    alert: apiData.kpis.overdue > 0 },
        { label: 'Won (MTD)',          value: String(apiData.kpis.wonThisMonth) },
        { label: 'Won Value (MTD)',    value: formatINR(apiData.kpis.wonValueThisMonth, true) },
        { label: 'Lost (MTD)',         value: String(apiData.kpis.lostThisMonth) },
      ]
    : [
        { label: 'Active',         value: '—' },
        { label: 'Overdue',        value: '—', alert: false },
        { label: 'Won (MTD)',      value: '—' },
        { label: 'Won Value (MTD)', value: '—' },
        { label: 'Lost (MTD)',     value: '—' },
      ]

  const active = apiData?.kpis?.active ?? 0
  const overdue = apiData?.kpis?.overdue ?? 0

  const filtered = React.useMemo(() => {
    return data.filter((f) => {
      const effective = getEffectiveStatus(f)

      if (statusFilter === 'overdue' && effective !== 'overdue') return false
      if (statusFilter !== 'all' && statusFilter !== 'overdue' && f.status !== statusFilter) return false
      if (typeFilter !== 'all' && f.type !== typeFilter) return false
      if (brandFilter !== 'All' && !f.brandsInterested.includes(brandFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !f.customerName.toLowerCase().includes(q) &&
          !(f.quotationNumber?.toLowerCase().includes(q)) &&
          !(f.projectName?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [data, search, statusFilter, typeFilter, brandFilter])

  const handleRowClick = (f: FollowUp) => {
    const latest = data.find((x) => x.id === f.id) ?? f
    setSelected(latest)
  }

  // ── Mutation helpers ───────────────────────────────────────────────────────

  async function handleStatusChange(id: string, status: FollowUpStatus) {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status.toUpperCase() }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await mutate()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleLogResponse(
    id: string,
    outcome: string,
    method: string,
    nextAction: string,
    nextFollowUpDate: string
  ) {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextFollowUpDate,
          response: {
            date: new Date().toISOString(),
            method: method.toUpperCase(),
            outcome,
            nextAction,
            staffMember: 'Suresh Iyer',
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to log response')
      await mutate()
      // Re-sync selected slide-over
      if (selected?.id === id) {
        const fresh = (await mutate())?.followUps.find((f) => f.id === id)
        if (fresh) setSelected(mapApiFollowUp(fresh))
      }
    } catch {
      toast.error('Failed to log response')
    }
  }

  async function handleCreateFollowUp(payload: {
    customerName: string
    customerPhone: string
    customerType: string
    brandsInterested: string[]
    productsNoted: string
    estimatedBudget?: number
    projectName?: string
    assignedTo: string
    nextFollowUpDate: string
    notes: string
    status: string
  }) {
    const { customerType: ct, status: _st, ...rest } = payload
    const res = await fetch('/api/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...rest,
        type: 'WALK_IN',
        customerType: ct.toUpperCase(),
        status: 'PENDING',
      }),
    })
    if (!res.ok) throw new Error('Failed to create follow-up')
    await mutate()
  }

  return (
    <PageContainer
      title="Follow-ups"
      subtitle={`${active} active · ${overdue} overdue`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-tint)',
              borderRadius: 8,
              padding: 2,
              gap: 2,
            }}
          >
            {([['list', List], ['board', LayoutGrid]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: view === mode ? 'white' : 'transparent',
                  boxShadow: view === mode ? 'var(--shadow-sm)' : 'none',
                  color: view === mode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button
            onClick={() => setAddOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 120ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <Plus size={14} />
            New Walk-in
          </button>
        </div>
      }
    >
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: APPLE_EASE, delay: i * 0.05 }}
            style={{
              flex: '1 1 130px',
              background: 'white',
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: kpi.alert ? '3px solid #DC2626' : '3px solid transparent',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: kpi.alert ? '#DC2626' : 'var(--text-primary)',
                letterSpacing: '-0.03em',
                marginBottom: 2,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isLoading ? '—' : kpi.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {kpi.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 200, maxWidth: 280 }}>
          <Search
            size={13}
            style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)', pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search customer, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', height: 30, padding: '0 10px 0 30px', fontSize: 12,
              background: 'var(--surface-tint)', border: '1.5px solid transparent',
              borderRadius: 8, outline: 'none', boxSizing: 'border-box', transition: 'all 150ms',
            }}
            onFocus={(e) => {
              e.target.style.background = 'white'
              e.target.style.borderColor = 'rgba(0,113,227,0.5)'
              e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)'
            }}
            onBlur={(e) => {
              e.target.style.background = 'var(--surface-tint)'
              e.target.style.borderColor = 'transparent'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <FilterPill
              key={s}
              label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TYPE_FILTERS.map((t) => (
            <FilterPill
              key={t}
              label={t === 'all' ? 'All types' : t === 'walk_in' ? 'Walk-in' : 'Quotation'}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Brand filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {BRAND_FILTERS.map((b) => (
            <FilterPill
              key={b}
              label={b}
              active={brandFilter === b}
              onClick={() => setBrandFilter(b)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <FollowUpsTable
          data={filtered}
          onRowClick={handleRowClick}
          canEdit={canEdit}
        />
      ) : (
        <FollowUpBoard
          data={filtered}
          onCardClick={handleRowClick}
          onStatusChange={(id, status) => void handleStatusChange(id, status)}
          canEdit={canEdit}
        />
      )}

      {/* Detail slide-over */}
      <FollowUpSlideOver
        followUp={selected}
        onClose={() => setSelected(null)}
        onRefresh={async () => {
          await mutate()
          if (selected) {
            const fresh = apiData?.followUps.find((f) => f.id === selected.id)
            if (fresh) setSelected(mapApiFollowUp(fresh))
          }
        }}
        onStatusChange={handleStatusChange}
        onLogResponse={handleLogResponse}
        quotations={quotations}
        canEdit={canEdit}
      />

      {/* Add walk-in modal */}
      <AddFollowUpModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateFollowUp}
      />
    </PageContainer>
  )
}
