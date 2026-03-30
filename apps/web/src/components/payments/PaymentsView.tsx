'use client'

import { usePaymentsStore, useSelectedAccount } from '@/lib/payments-store'
import { getGlobalStats, formatINR } from '@/lib/mock/payments-data'
import { PaymentsCustomerListPanel } from './PaymentsCustomerListPanel'
import { CustomerPaymentTab } from './tab-customer/CustomerPaymentTab'
import { CompanyDashboardTab } from './tab-company/CompanyDashboardTab'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function PaymentsView() {
  const {
    accounts, payments, activeTab, yearFilter, monthFilter,
    setActiveTab, setYearFilter, setMonthFilter,
  } = usePaymentsStore()
  const selectedAccount = useSelectedAccount()

  const stats = getGlobalStats(accounts, payments, yearFilter, monthFilter)
  const periodLabel = monthFilter ? `${MONTHS[monthFilter - 1] ?? ''} ${yearFilter}` : String(yearFilter)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: '#f5f5f5', fontFamily: 'var(--font-ui)',
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        flexShrink: 0, padding: '14px 20px 0',
      }}>
        {/* Row 1: title + filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Payments</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
              Customer account &amp; collection tracker
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={2025}>FY 2025</option>
              <option value={2026}>FY 2026</option>
            </select>
            <select
              value={monthFilter ?? ''}
              onChange={e => setMonthFilter(e.target.value === '' ? null : Number(e.target.value))}
              style={selectStyle}
            >
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: 3 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <StatBlock
            label="Total Billed"
            value={formatINR(stats.totalBilled)}
            sub={`${accounts.length} customers · all time`}
            leftColor="#2563eb"
          />
          <StatBlock
            label={`Received in ${periodLabel}`}
            value={formatINR(stats.periodReceived)}
            sub={`${stats.collectionPct}% overall collection rate`}
            leftColor="#16a34a"
          />
          <StatBlock
            label="Outstanding"
            value={formatINR(stats.totalPending)}
            sub={stats.totalPending > 0 ? 'billed but not yet received' : 'All collected ✓'}
            leftColor={stats.totalPending > 0 ? '#dc2626' : '#16a34a'}
          />
        </div>

        {/* Row 3: tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
          {(['customer', 'company'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                height: 36, padding: '0 18px',
                border: 'none', background: 'transparent',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === tab ? '#2563eb' : '#6b7280',
                fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >
              {tab === 'customer' ? 'Customer View' : 'Company Dashboard'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'customer' ? (
          <>
            <PaymentsCustomerListPanel />
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', background: '#fff',
              borderLeft: '1px solid #e5e7eb',
            }}>
              {selectedAccount
                ? <CustomerPaymentTab account={selectedAccount} />
                : <EmptyState />
              }
            </div>
          </>
        ) : (
          <CompanyDashboardTab />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBlock({ label, value, sub, leftColor }: {
  label: string; value: string; sub: string; leftColor: string
}) {
  return (
    <div style={{
      borderLeft: `3px solid ${leftColor}`,
      background: '#f9fafb', borderRadius: '0 8px 8px 0',
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: '#111827',
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{sub}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontSize: 36 }}>💳</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', fontFamily: 'var(--font-ui)' }}>
        Select a customer
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
        Choose from the left panel to view payment details
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  height: 30, padding: '0 10px', borderRadius: 6,
  border: '1px solid #e5e7eb', background: '#f9fafb',
  fontSize: 12, fontFamily: 'var(--font-ui)',
  cursor: 'pointer', color: '#374151',
}
