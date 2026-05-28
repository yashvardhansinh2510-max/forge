'use client'

import { useMemo } from 'react'
import { AlertCircle, ArrowRightLeft, CheckCircle2, Clock, PackageOpen, Truck, Zap } from 'lucide-react'
import useSWR from 'swr'
import {
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  type HeaderCounts,
  type PurchaseTrackerLine,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

interface TrackerOverviewProps {
  lines:        PurchaseTrackerLine[]
  headerCounts: HeaderCounts
  onSetStage:   (stage: PurchaseStage) => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentTransfer {
  id:               string
  productName:      string
  fromCustomerName: string
  toCustomerName:   string
  qty:              number
  stage:            string
  transferredAt:    string
}

const STUCK_DAYS: Record<PurchaseStage, number> = {
  ORDER_IN_CO: 7,
  CO_BILLING:  5,
  INBOX:       7,
  DISPATCHED:  3,
  COMPLETED:   30,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function fmtRelative(iso: string): string {
  const days = daysAgo(iso)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Failed to load transfers')
  return r.json() as Promise<{ transfers: RecentTransfer[] }>
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageCard({
  stage,
  count,
  onClick,
}: {
  stage:   PurchaseStage
  count:   number
  onClick: () => void
}) {
  const accent = STAGE_COLORS[stage]
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
      style={{
        borderLeftColor:   accent,
        borderLeftWidth:   4,
        borderTopWidth:    1,
        borderRightWidth:  1,
        borderBottomWidth: 1,
        borderTopColor:    'var(--border)',
        borderRightColor:  'var(--border)',
        borderBottomColor: 'var(--border)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${accent}80 0%, transparent 60%)` }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {STAGE_LABEL[stage]}
      </p>
      <p
        className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]"
        style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: count > 0 ? accent : undefined }}
      >
        {count}
      </p>
    </button>
  )
}

function KPIRow({ total, billingPending, dispatchReady, completed }: {
  total:          number
  billingPending: number
  dispatchReady:  number
  completed:      number
}) {
  const items = [
    { icon: PackageOpen,  label: 'Total lines',      value: total,          color: '#6366f1' },
    { icon: AlertCircle,  label: 'Billing pending',  value: billingPending, color: '#F59E0B' },
    { icon: Truck,        label: 'Ready to dispatch', value: dispatchReady, color: '#06B6D4' },
    { icon: CheckCircle2, label: 'Completed',        value: completed,      color: '#10B981' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}15` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p
              className="text-xl font-semibold tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackerOverview({ lines, headerCounts, onSetStage }: TrackerOverviewProps) {
  const { data: transferData } = useSWR(
    '/api/transfers?recent=true&limit=12',
    fetcher,
    { revalidateOnFocus: false },
  )
  const recentTransfers = transferData?.transfers ?? []

  // Compute metrics from lines
  const metrics = useMemo(() => {
    const now = Date.now()
    const DAY_MS = 86_400_000

    const stuckLines: Array<{ line: PurchaseTrackerLine; stage: PurchaseStage; days: number }> = []
    const pendingBillingLines: PurchaseTrackerLine[] = []
    const readyToDispatchLines: PurchaseTrackerLine[] = []
    const recentLines: PurchaseTrackerLine[] = []
    const awaitingReplacements: PurchaseTrackerLine[] = []

    for (const line of lines) {
      const ageDays = line.createdAt
        ? Math.floor((now - new Date(line.createdAt).getTime()) / DAY_MS)
        : 0

      // Pending billing
      if (line.stages.CO_BILLING > 0) {
        pendingBillingLines.push(line)
        if (ageDays >= STUCK_DAYS.CO_BILLING) {
          stuckLines.push({ line, stage: 'CO_BILLING', days: ageDays })
        }
      }

      // Ready to dispatch (in godown)
      if (line.stages.INBOX > 0) {
        readyToDispatchLines.push(line)
        if (ageDays >= STUCK_DAYS.INBOX) {
          stuckLines.push({ line, stage: 'INBOX', days: ageDays })
        }
      }

      // Order in co — stuck
      if (line.stages.ORDER_IN_CO > 0 && ageDays >= STUCK_DAYS.ORDER_IN_CO) {
        stuckLines.push({ line, stage: 'ORDER_IN_CO', days: ageDays })
      }

      // Recently added (last 3 days)
      if (line.createdAt && ageDays <= 3) {
        recentLines.push(line)
      }

      if (line.allocationStatus === 'AWAITING_REPLACEMENT') {
        awaitingReplacements.push(line)
      }
    }

    // Deduplicate stuck by line id (a line may have multiple active stages)
    const seen = new Set<string>()
    const dedupedStuck = stuckLines.filter((s) => {
      const key = `${s.line.id}-${s.stage}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return {
      pendingBillingCount:  pendingBillingLines.length,
      readyToDispatchCount: readyToDispatchLines.length,
      stuckLines:           dedupedStuck.sort((a, b) => b.days - a.days).slice(0, 10),
      recentLines:          recentLines.slice(0, 8),
      awaitingReplacements: awaitingReplacements,
    }
  }, [lines])

  const totalLines = lines.length
  const completed  = lines.filter((l) => l.stages.COMPLETED > 0).length

  return (
    <div className="flex flex-col gap-5">
      {/* Stage cards */}
      <div>
        <SectionLabel icon={Zap}>Pipeline overview</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {STAGE_ORDER.map((stage) => (
            <StageCard
              key={stage}
              stage={stage}
              count={headerCounts[stage]}
              onClick={() => onSetStage(stage)}
            />
          ))}
        </div>
      </div>

      {/* KPI summary */}
      <KPIRow
        total={totalLines}
        billingPending={metrics.pendingBillingCount}
        dispatchReady={metrics.readyToDispatchCount}
        completed={completed}
      />

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Stuck / delayed orders */}
        <div>
          <SectionLabel icon={Clock}>
            Orders overdue{' '}
            <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              {metrics.stuckLines.length}
            </span>
          </SectionLabel>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {metrics.stuckLines.length === 0 ? (
              <EmptyState message="No overdue orders. All lines moving on time." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <TableHead cols={['Product', 'Customer', 'Stage', 'Days']} />
                </thead>
                <tbody>
                  {metrics.stuckLines.map(({ line, stage, days }, i) => (
                    <tr
                      key={`${line.id}-${stage}`}
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                        background: days >= 14 ? 'rgba(239,68,68,0.03)' : undefined,
                      }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {line.product.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {line.product.sku}
                        </p>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.customer?.name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <StagePill stage={stage} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 12,
                            fontWeight: 600,
                            color: days >= 14 ? '#DC2626' : days >= 7 ? '#D97706' : 'var(--text-secondary)',
                          }}
                        >
                          {days}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent transfers */}
        <div>
          <SectionLabel icon={ArrowRightLeft}>Recent transfers</SectionLabel>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {recentTransfers.length === 0 ? (
              <EmptyState message="No transfers recorded yet." />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <ArrowRightLeft size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {t.productName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {t.fromCustomerName} → {t.toCustomerName} ·{' '}
                        <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                          {t.qty}
                        </span>
                        {' '}unit{t.qty !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                      {fmtRelative(t.transferredAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently added items */}
      {metrics.recentLines.length > 0 && (
        <div>
          <SectionLabel icon={PackageOpen}>Recently added (last 3 days)</SectionLabel>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <TableHead cols={['PO #', 'Product', 'Brand', 'Customer', 'Qty', 'Stage']} />
              </thead>
              <tbody>
                {metrics.recentLines.map((line, i) => {
                  const activeStage = STAGE_ORDER.find((s) => line.stages[s] > 0)
                  return (
                    <tr
                      key={line.id}
                      style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                    >
                      <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {line.poNumber ?? '—'}
                      </td>
                      <td style={{ padding: '9px 8px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{line.product.name}</p>
                      </td>
                      <td style={{ padding: '9px 8px', fontSize: 11, color: 'var(--text-muted)' }}>{line.product.brand}</td>
                      <td style={{ padding: '9px 8px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.customer?.name ?? '—'}
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {line.qtyOrdered}
                        </span>
                      </td>
                      <td style={{ padding: '9px 16px' }}>
                        {activeStage && <StagePill stage={activeStage} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Awaiting Replacements */}
      {metrics.awaitingReplacements.length > 0 && (
        <div>
          <SectionLabel icon={AlertCircle}>
            Pending Replacements (Transferred Out)
            <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              {metrics.awaitingReplacements.length}
            </span>
          </SectionLabel>
          <div className="mt-3 overflow-hidden rounded-2xl border border-red-200 bg-red-50/30">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <TableHead cols={['PO #', 'Product', 'Customer', 'Qty Pending', 'Stage']} />
              </thead>
              <tbody>
                {metrics.awaitingReplacements.map((line, i) => {
                  const activeStage = STAGE_ORDER.find((s) => line.stages[s] > 0)
                  return (
                    <tr
                      key={line.id}
                      style={{ borderTop: i > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : 'none' }}
                    >
                      <td style={{ padding: '9px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#991B1B', whiteSpace: 'nowrap' }}>
                        {line.poNumber ?? '—'}
                      </td>
                      <td style={{ padding: '9px 8px' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#991B1B' }}>{line.product.name}</p>
                      </td>
                      <td style={{ padding: '9px 8px', fontSize: 12, color: '#B91C1C', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.customer?.name ?? '—'}
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: '#7F1D1D' }}>
                          {line.stages.ORDER_IN_CO + line.stages.CO_BILLING}
                        </span>
                      </td>
                      <td style={{ padding: '9px 16px' }}>
                        {activeStage && <StagePill stage={activeStage} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-[var(--text-muted)]" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {children}
      </p>
    </div>
  )
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
      {cols.map((c, i) => (
        <th
          key={c}
          style={{
            padding: '7px ' + (i === 0 ? '16px' : '8px'),
            textAlign: i === cols.length - 1 ? 'right' : 'left',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            whiteSpace: 'nowrap',
          }}
        >
          {c}
        </th>
      ))}
    </tr>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-center">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  )
}

function StagePill({ stage }: { stage: PurchaseStage }) {
  const color = STAGE_COLORS[stage]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: `${color}15`, color }}
    >
      {STAGE_LABEL[stage]}
    </span>
  )
}
