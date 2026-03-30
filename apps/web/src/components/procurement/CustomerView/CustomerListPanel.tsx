'use client'

import { useState }            from 'react'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { MOCK_CUSTOMERS }      from '@/lib/mock/procurement-data'
import { BRAND_COLORS, BRANDS_ORDERED } from '@/lib/mock/procurement-data'
import { getInitials, getAvatarColor }   from '@/lib/tracker-utils'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }

export function CustomerListPanel() {
  const activeCustomerId = usePurchasesStore((s) => s.activeCustomerId)
  const setActiveCustomer = usePurchasesStore((s) => s.setActiveCustomer)
  const activeBrand      = usePurchasesStore((s) => s.activeBrand)

  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('ALL')

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const matchesBrand  = activeBrand === 'ALL' || c.brands.includes(activeBrand)
    const matchesLocal  = brandFilter === 'ALL' || c.brands.includes(brandFilter)
    const matchesSearch = !search || c.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          c.projectName.toLowerCase().includes(search.toLowerCase())
    return matchesBrand && matchesLocal && matchesSearch
  })

  return (
    <div style={{
      width: 260, flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 8px' }}>
        <input
          type="text"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px',
            border: '1px solid #e5e7eb', borderRadius: 7,
            fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
            background: '#f9fafb', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Brand filter pills */}
      <div style={{ padding: '0 12px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {['ALL', ...BRANDS_ORDERED].map((b) => {
          const active = brandFilter === b
          const color  = BRAND_COLORS[b] ?? '#374151'
          return (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              style={{
                padding: '2px 8px', borderRadius: 12,
                border: active ? `1.5px solid ${b === 'ALL' ? '#374151' : color}` : '1px solid #e5e7eb',
                background: active ? (b === 'ALL' ? '#111827' : `${color}14`) : 'transparent',
                color: active ? (b === 'ALL' ? '#fff' : color) : '#6b7280',
                fontSize: 9, fontWeight: 700,
                fontFamily: 'var(--font-ui)', letterSpacing: '0.05em',
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {b}
            </button>
          )
        })}
      </div>

      {/* Customer list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
            No customers found.
          </div>
        )}

        {filtered.map((customer) => {
          const active     = activeCustomerId === customer.id
          const initials   = getInitials(customer.clientName)
          const avatarColor = getAvatarColor(customer.clientName)

          return (
            <div
              key={customer.id}
              onClick={() => setActiveCustomer(active ? null : customer.id)}
              style={{
                padding: '12px 14px',
                background: active ? '#f0f9ff' : 'transparent',
                borderBottom: '1px solid #f3f4f6',
                borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: avatarColor, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)', lineHeight: 1.2 }}>
                    {customer.clientName}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customer.projectName}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {customer.dispatchedItems > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontFamily: 'var(--font-ui)', ...NUM }}>
                    ✓ {customer.dispatchedItems} delivered
                  </span>
                )}
                {customer.inBoxItems > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: '#dbeafe', color: '#2563eb', fontFamily: 'var(--font-ui)', ...NUM }}>
                    📦 {customer.inBoxItems} in box
                  </span>
                )}
                {customer.pendingItems > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: '#fef3c7', color: '#d97706', fontFamily: 'var(--font-ui)', ...NUM }}>
                    ⏳ {customer.pendingItems} pending
                  </span>
                )}
              </div>

              {/* Brand dots */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {customer.brands.map((b) => (
                  <div
                    key={b}
                    title={b}
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: BRAND_COLORS[b] ?? '#9ca3af',
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
