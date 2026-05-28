'use client'

import useSWR from 'swr'
import { AlertTriangle, Clock, Package, Truck, Zap, CheckCircle2, IndianRupee, Users } from 'lucide-react'
import type { OperationalDashboard } from '@/app/api/dashboard/operational/route'

const fetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<OperationalDashboard>

function fmt(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n}`
}

interface KPICardProps {
  icon:    React.ElementType
  label:   string
  value:   string | number
  color:   string
  alert?:  boolean
}

function KPICard({ icon: Icon, label, value, color, alert }: KPICardProps) {
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4"
      style={{
        borderColor:      alert ? `${color}40` : 'var(--border-default)',
        borderLeftColor:  color,
        borderLeftWidth:  4,
        borderTopWidth:   1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${color}60 0%, transparent 80%)` }}
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${color}15` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p
          className="mt-1 text-2xl font-semibold tracking-tight"
          style={{
            color:              alert ? color : 'var(--text-primary)',
            fontFamily:         'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function OperationalKPIs() {
  const { data, isLoading } = useSWR('/api/dashboard/operational', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--n-100)]" />
        ))}
      </div>
    )
  }

  const { kpis } = data

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KPICard icon={Truck}        label="Pending Dispatch"  value={kpis.pendingDispatches} color="#6366F1" alert={kpis.pendingDispatches > 10} />
      <KPICard icon={AlertTriangle} label="Delayed Orders"   value={kpis.delayedOrders}     color="#EF4444" alert={kpis.delayedOrders > 0} />
      <KPICard icon={Clock}        label="Billing Pending"   value={kpis.billingPending}     color="#F59E0B" alert={kpis.billingPending > 5} />
      <KPICard icon={Zap}          label="Urgent Orders"     value={kpis.urgentOrders}       color="#EF4444" alert={kpis.urgentOrders > 0} />
      <KPICard icon={CheckCircle2} label="Completed Today"   value={kpis.completedToday}     color="#10B981" />
      <KPICard icon={IndianRupee}  label="Pending Value"     value={fmt(kpis.totalPendingValue)} color="#3B82F6" />
    </div>
  )
}

export function EmployeeWorkload() {
  const { data, isLoading } = useSWR('/api/dashboard/operational', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data || data.employeeWork.length === 0) return null

  const maxPending = Math.max(...data.employeeWork.map((e) => e.pending), 1)

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <Users size={13} className="text-[var(--text-muted)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Team Workload
        </p>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {data.employeeWork.map((emp) => (
          <div key={emp.userId} className="flex items-center gap-3 px-4 py-3">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: '#6366F1' }}
            >
              {emp.userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                  {emp.userName}
                </p>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {emp.pending} pending
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-subtle)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${(emp.pending / maxPending) * 100}%`,
                    background: emp.pending > 5 ? '#EF4444' : '#6366F1',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SupplierDelays() {
  const { data, isLoading } = useSWR('/api/dashboard/operational', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data || data.supplierDelays.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <AlertTriangle size={13} className="text-red-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Delayed Suppliers
        </p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            {['Supplier', 'Delayed', 'Total', 'Rate'].map((h) => (
              <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.supplierDelays.map((s, i) => {
            const rate = Math.round((s.delayedLines / s.totalLines) * 100)
            return (
              <tr key={s.vendorName} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>
                  {s.vendorName}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.delayedLines}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.totalLines}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    color: rate > 50 ? '#EF4444' : rate > 25 ? '#F59E0B' : 'var(--text-secondary)',
                  }}>
                    {rate}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AlertCenter() {
  const { data, isLoading } = useSWR('/api/dashboard/operational', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data || data.alerts.length === 0) return null

  const SEVERITY_COLOR = {
    warning:  { bg: '#FFFBEB', border: '#F59E0B40', text: '#92400E', dot: '#F59E0B' },
    alert:    { bg: '#FEF2F2', border: '#EF444440', text: '#991B1B', dot: '#EF4444' },
    critical: { bg: '#450A0A', border: '#EF4444',   text: '#FEF2F2', dot: '#EF4444' },
  } as const

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50">
      <div className="flex items-center gap-2 border-b border-red-200 px-4 py-3">
        <AlertTriangle size={13} className="text-red-500" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
          Operational Alerts
        </p>
        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {data.alerts.length}
        </span>
      </div>
      <div className="space-y-2 p-3">
        {data.alerts.map((alert) => {
          const cfg = SEVERITY_COLOR[alert.severity]
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-xl border p-3"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: cfg.dot }}
              />
              <div>
                <p className="text-xs font-semibold" style={{ color: cfg.text, fontFamily: 'var(--font-ui)' }}>
                  {alert.title}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: cfg.text, opacity: 0.8 }}>
                  {alert.body}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
