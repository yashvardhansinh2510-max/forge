'use client'

import * as React from 'react'
import { CalendarDays, RefreshCw, Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { KPIStrip } from './kpi-strip'
import { RevenueChart } from './revenue-chart'
import { PipelineChart } from './pipeline-chart'
import { ActivityFeed } from './activity-feed'
import { TopCustomers } from './top-customers'
import { QuickActions } from './quick-actions'
import { invoices, calcDocumentTotals } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'
import { samples } from '@/lib/mock/samples-data'

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
  isLoading?: boolean
}

export function DashboardClient({ firstName = '', isLoading = false }: DashboardClientProps) {
  const router = useRouter()
  const [isRefetching, setIsRefetching] = React.useState(false)

  function handleRefresh() {
    setIsRefetching(true)
    setTimeout(() => {
      setIsRefetching(false)
      toast.success('Dashboard refreshed')
    }, 1200)
  }

  function exportDashboardData() {
    const rows = [
      ['Metric', 'Value'],
      ['Revenue MTD', 'See dashboard'],
      ['Open Deals', 'See dashboard'],
      ['Active Contacts', 'See dashboard'],
      ['Low Stock Products', 'See dashboard'],
      ['Pending Invoices', 'See dashboard'],
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

  const actions = (
    <>
      <Button variant="secondary" size="sm">
        <CalendarDays size={14} className="mr-1.5" />
        Mar 2025
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
        {/* Overdue Invoice Alert */}
        {(() => {
          const overdueInvoices = invoices.filter(inv => inv.status === 'overdue')
          const overdueCount = overdueInvoices.length
          const overdueTotal = overdueInvoices.reduce((sum, inv) => {
            const { grandTotal } = calcDocumentTotals(inv.lineItems)
            return sum + (grandTotal - inv.paidAmount)
          }, 0)
          if (overdueCount === 0) return null
          return (
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: '#FFF9F9',
                border: '1px solid rgba(220,38,38,0.15)',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {overdueCount} invoice{overdueCount > 1 ? 's' : ''} overdue —{' '}
                  <span style={{ fontWeight: 600, color: '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(overdueTotal, true)} outstanding
                  </span>
                </p>
              </div>
              <button
                onClick={() => router.push('/invoicing/invoices')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--accent)',
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                View invoices →
              </button>
            </div>
          )
        })()}

        {/* Overdue Samples Alert */}
        {(() => {
          const today = new Date()
          const overdueSamples = samples.filter(s =>
            (s.status === 'with_client' || s.status === 'sent') &&
            s.expectedReturn && s.expectedReturn < today
          ).length
          if (overdueSamples === 0) return null
          return (
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                <span style={{ color: 'var(--caution)' }}>{overdueSamples} sample{overdueSamples > 1 ? 's' : ''}</span>
                {' '}expected back but not yet returned
              </p>
              <button
                onClick={() => router.push('/samples')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', padding: 0 }}
              >
                View →
              </button>
            </div>
          )
        })()}

        {/* Last updated */}
        <div className="-mt-4 mb-6 flex items-center" style={{ gap: 4 }}>
          <LiveDot />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Last updated: just now
          </span>
        </div>

        <div className="relative space-y-5">
          {/* Section 1: KPI Strip */}
          <KPIStrip isLoading={isLoading} />

          {/* Section 2: Charts Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RevenueChart isLoading={isLoading} />
            </div>
            <div className="lg:col-span-4">
              <PipelineChart isLoading={isLoading} />
            </div>
          </div>

          {/* Section 3: Tables Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12" style={{ minHeight: 400 }}>
            <div className="lg:col-span-7 lg:h-full">
              <ActivityFeed isLoading={isLoading} />
            </div>
            <div className="lg:col-span-5 lg:h-full">
              <TopCustomers isLoading={isLoading} />
            </div>
          </div>

          {/* Section 4: Quick Actions */}
          <QuickActions />
        </div>
      </PageContainer>
    </>
  )
}
