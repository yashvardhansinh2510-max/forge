'use client'

import { usePaymentsStore } from '@/lib/payments-store'
import { BRANDS_LIST } from '@/lib/mock/payments-data'
import { BrandCard } from './BrandCard'
import { CustomerBrandMatrix } from './CustomerBrandMatrix'

export function CompanyDashboardTab() {
  const { accounts, payments, yearFilter } = usePaymentsStore()

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#f9fafb',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Brand cards — 3×2 grid */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: 'var(--font-ui)', marginBottom: 10,
        }}>
          Per-brand Collection — {yearFilter}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: 20,
        }}>
          {BRANDS_LIST.map(brand => (
            <BrandCard
              key={brand}
              brand={brand}
              accounts={accounts}
              payments={payments}
              year={yearFilter}
            />
          ))}
        </div>

        {/* Customer × Brand matrix */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: 'var(--font-ui)', marginBottom: 10,
        }}>
          Customer × Brand — Received
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 10, overflow: 'hidden', padding: '12px 14px',
        }}>
          <CustomerBrandMatrix accounts={accounts} />
        </div>
      </div>
    </div>
  )
}
