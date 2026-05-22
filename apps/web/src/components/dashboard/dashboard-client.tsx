'use client'

import * as React from 'react'
import { CalendarDays, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { KPIStrip } from './kpi-strip'
import { RevenueChart } from './revenue-chart'
import { PipelineChart } from './pipeline-chart'
import { ActivityFeed } from './activity-feed'
import { TopCustomers } from './top-customers'
import { QuickActions } from './quick-actions'
import type { DashboardStats } from '@/app/api/dashboard/stats/route'

const fetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<DashboardStats>

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreetingParts(firstName: string): { salutation: string; name: string } {
  const hour = new Date().getHours()
  const name = firstName || 'Buildcon'
  if (hour < 12) return { salutation: 'Good morning,', name }
  if (hour < 17) return { salutation: 'Good afternoon,', name }
  return { salutation: 'Good evening,', name }
}

function GreetingTitle({ firstName }: { firstName: string }) {
  const { salutation, name } = getGreetingParts(firstName)
  return (
    <span>
      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 20, letterSpacing: '-0.025em' }}>{salutation}</span>
      <br />
      <span style={{ color: 'var(--text-primary)' }}>{name}</span>
    </span>
  )
}

// ─── Live Dot ─────────────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#16A34A',
        animation: 'live-dot-pulse 2s ease-in-out infinite',
        verticalAlign: 'middle',
        marginRight: 6,
      }}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  firstName?: string
}

export function DashboardClient({ firstName = '' }: DashboardClientProps) {
  const { data, isLoading, mutate } = useSWR<DashboardStats>('/api/dashboard/stats', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  })
  const [isRefetching, setIsRefetching] = React.useState(false)

  async function handleRefresh() {
    setIsRefetching(true)
    await mutate()
    setIsRefetching(false)
    toast.success('Dashboard refreshed')
  }

  function exportDashboardData() {
    const kpis = data?.kpis
    const rows = [
      ['Metric', 'Value'],
      ['Revenue MTD', String(kpis?.totalRevenue ?? 0)],
      ['Revenue MoM Change %', String(kpis?.totalRevenueChange ?? 0)],
      ['Active Quotations', String(kpis?.activeQuotations ?? 0)],
      ['Quotation Pipeline Value', String(kpis?.quotationValue ?? 0)],
      ['Open Purchase Orders', String(kpis?.openPurchaseOrders ?? 0)],
      ['Pending Follow-ups', String(kpis?.pendingFollowUps ?? 0)],
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forge-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lastUpdatedLabel = data?.generatedAt
    ? formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })
    : 'just now'

  const actions = (
    <>
      <Button variant="secondary" size="sm">
        <CalendarDays size={14} className="mr-1.5" />
        {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefetching}
      >
        <RefreshCw size={14} className={`mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
        {isRefetching ? 'Refreshing…' : 'Refresh'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={exportDashboardData}
      >
        <Download size={14} className="mr-1.5" />
        Export
      </Button>
    </>
  )

  return (
    <>
      <style>{`
        @keyframes live-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <PageContainer
        title={<GreetingTitle firstName={firstName} />}
        subtitle="Here's your Buildcon House overview for today."
        actions={actions}
      >


        {/* Last updated */}
        <div className="-mt-4 mb-6 flex items-center" style={{ gap: 4 }}>
          <LiveDot />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Last updated: {lastUpdatedLabel}
          </span>
        </div>

        <div className="relative space-y-5">
          {/* Section 1: KPI Strip */}
          <KPIStrip isLoading={isLoading} data={data?.kpis} />

          {/* Section 2: Charts Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RevenueChart isLoading={isLoading} data={data?.revenueChart} />
            </div>
            <div className="lg:col-span-4">
              <PipelineChart isLoading={isLoading} data={data?.pipelineStages} />
            </div>
          </div>

          {/* Section 3: Tables Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" style={{ minHeight: 400 }}>
            <div className="lg:col-span-7 lg:h-full">
              <ActivityFeed isLoading={isLoading} data={data?.recentActivity} />
            </div>
            <div className="lg:col-span-5 lg:h-full">
              <TopCustomers isLoading={isLoading} data={data?.topCustomers} />
            </div>
          </div>

          {/* Section 4: Quick Actions */}
          <QuickActions />
        </div>
      </PageContainer>
    </>
  )
}
