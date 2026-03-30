'use client'

import {
  formatINR, BRANDS_LIST, BRAND_COLORS,
  type CustomerAccount,
} from '@/lib/mock/payments-data'
import { getInitials, getAvatarColor } from '@/lib/tracker-utils'

interface Props { accounts: CustomerAccount[] }

export function CustomerBrandMatrix({ accounts }: Props) {
  let maxReceived = 0
  for (const a of accounts)
    for (const ba of a.brandAccounts)
      if (ba.received > maxReceived) maxReceived = ba.received

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '170px repeat(5, 1fr)',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: 8,
      }}>
        <div />
        {BRANDS_LIST.map(brand => (
          <div key={brand} style={{ textAlign: 'center' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: BRAND_COLORS[brand] ?? '#6b7280',
              margin: '0 auto 3px',
            }} />
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#374151',
              fontFamily: 'var(--font-ui)',
            }}>
              {brand}
            </div>
          </div>
        ))}
      </div>

      {/* Rows */}
      {accounts.map((account, ri) => (
        <div key={account.customerId} style={{
          display: 'grid',
          gridTemplateColumns: '170px repeat(5, 1fr)',
          borderBottom: '1px solid #f3f4f6',
          background: ri % 2 === 0 ? '#fff' : '#fafafa',
          alignItems: 'center',
        }}>
          {/* Customer */}
          <div style={{ padding: '8px 6px 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: getAvatarColor(account.customerName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff',
              fontFamily: 'var(--font-ui)', flexShrink: 0,
            }}>
              {getInitials(account.customerName)}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#111827',
              fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 120,
            }}>
              {account.customerName}
            </span>
          </div>

          {/* Brand cells */}
          {BRANDS_LIST.map(brand => {
            const ba = account.brandAccounts.find(b => b.brand === brand)
            if (!ba) {
              return (
                <div key={brand} style={{ textAlign: 'center', padding: '8px 2px', color: '#e5e7eb', fontSize: 11 }}>
                  —
                </div>
              )
            }
            const pending = Math.max(0, ba.billed - ba.received)
            const opacity = maxReceived > 0 ? 0.2 + (ba.received / maxReceived) * 0.6 : 0.1
            const color   = BRAND_COLORS[brand] ?? '#6b7280'
            const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0')

            return (
              <div key={brand} style={{ textAlign: 'center', padding: '4px 3px' }}>
                <div style={{
                  background: ba.received > 0 ? color + hexOpacity : 'transparent',
                  borderRadius: 5, padding: '4px 2px', margin: '0 2px',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: ba.received > 0 ? (opacity > 0.5 ? '#fff' : '#111827') : '#9ca3af',
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {ba.received > 0 ? formatINR(ba.received, true) : (ba.billed > 0 ? 'Due' : '–')}
                  </div>
                  {pending > 0 && (
                    <div style={{ fontSize: 9, color: '#fee2e2', fontFamily: 'var(--font-ui)' }}>
                      {formatINR(pending, true)} due
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* Totals */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '170px repeat(5, 1fr)',
        borderTop: '2px solid #e5e7eb',
        background: '#f9fafb',
        alignItems: 'center',
      }}>
        <div style={{ padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)' }}>
          Total
        </div>
        {BRANDS_LIST.map(brand => {
          const rcvd   = accounts.flatMap(a => a.brandAccounts).filter(b => b.brand === brand).reduce((s, b) => s + b.received, 0)
          const billed = accounts.flatMap(a => a.brandAccounts).filter(b => b.brand === brand).reduce((s, b) => s + b.billed, 0)
          return (
            <div key={brand} style={{ textAlign: 'center', padding: '8px 2px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                {rcvd > 0 ? formatINR(rcvd, true) : '—'}
              </div>
              {billed - rcvd > 0 && (
                <div style={{ fontSize: 9, color: '#dc2626', fontFamily: 'var(--font-ui)' }}>
                  {formatINR(billed - rcvd, true)} due
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
