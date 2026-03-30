'use client'

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  getMonthlyByBrand,
  formatINR,
  BRAND_COLORS,
  type CustomerPaymentRecord,
  type CustomerAccount,
} from '@/lib/mock/payments-data'

interface Props {
  brand:    string
  accounts: CustomerAccount[]
  payments: CustomerPaymentRecord[]
  year:     number
}

export function BrandCard({ brand, accounts, payments, year }: Props) {
  const color = BRAND_COLORS[brand] ?? '#6b7280'

  // Aggregate totals for this brand across all customers
  const totalBilled   = accounts.flatMap(a => a.brandAccounts).filter(b => b.brand === brand).reduce((s, b) => s + b.billed, 0)
  const totalReceived = accounts.flatMap(a => a.brandAccounts).filter(b => b.brand === brand).reduce((s, b) => s + b.received, 0)
  const totalPending  = Math.max(0, totalBilled - totalReceived)

  const monthlyData = getMonthlyByBrand(payments, year, brand)
  const hasData = monthlyData.some(d => d.received > 0)

  const collectionPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 12, padding: 14, minWidth: 0,
      borderTop: `3px solid ${color}`,
    }}>
      {/* Brand indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)' }}>
          {brand}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12, fontWeight: 700,
          color: collectionPct === 100 ? '#16a34a' : color,
          fontFamily: 'var(--font-ui)',
        }}>
          {collectionPct}%
        </span>
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        <AmtCell label="Billed"   value={totalBilled}   color="#374151" />
        <AmtCell label="Received" value={totalReceived} color="#16a34a" />
        {totalPending > 0 && (
          <AmtCell label="Pending" value={totalPending} color="#dc2626" />
        )}
      </div>

      {/* Progress bar */}
      {totalBilled > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3 }}>
            <div style={{
              width: `${collectionPct}%`, height: '100%',
              background: collectionPct === 100 ? '#16a34a' : color,
              borderRadius: 3, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Monthly bar chart */}
      {hasData ? (
        <div style={{ height: 60 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="received" fill={color} radius={[2, 2, 0, 0]} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 8, fontFamily: 'var(--font-ui)', fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={(v) => [typeof v === 'number' ? formatINR(v) : String(v), 'Received']}
                contentStyle={{
                  fontSize: 11, fontFamily: 'var(--font-ui)',
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '4px 8px',
                }}
                cursor={{ fill: `${color}11` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{
          height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f9fafb', borderRadius: 6,
          fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)',
        }}>
          No payments in {year}
        </div>
      )}
    </div>
  )
}

function AmtCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>{label}</div>
      <div style={{
        fontSize: 12, fontWeight: 600, color,
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        {formatINR(value)}
      </div>
    </div>
  )
}
