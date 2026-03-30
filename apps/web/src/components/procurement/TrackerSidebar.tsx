'use client'

import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { getVendorCompanies, getFilteredLines } from '@/lib/tracker-utils'
import type { ViewMode } from '@/lib/usePurchasesStore'

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  color: '#9ca3af', fontFamily: 'var(--font-ui)',
  textTransform: 'uppercase', marginBottom: 6,
}

const SECTION: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid #f3f4f6',
}

const STATUS_OPTIONS = [
  { value: 'ALL',                label: 'All Statuses', color: '#6b7280' },
  { value: 'SUBMITTED',          label: 'Ordered',      color: '#2563eb' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partial',      color: '#d97706' },
  { value: 'FULLY_RECEIVED',     label: 'Received',     color: '#16a34a' },
  { value: 'DRAFT',              label: 'Draft',        color: '#9ca3af' },
] as const

export function TrackerSidebar() {
  const orders          = useProcurementStore((s) => s.orders)
  const activeBrand     = usePurchasesStore((s) => s.activeBrand)
  const activeCompanies = usePurchasesStore((s) => s.activeCompanies)
  const activeStatuses  = usePurchasesStore((s) => s.activeStatuses)
  const viewMode        = usePurchasesStore((s) => s.viewMode)
  const toggleCompany   = usePurchasesStore((s) => s.toggleCompany)
  const clearCompanies  = usePurchasesStore((s) => s.clearCompanies)
  const toggleStatus    = usePurchasesStore((s) => s.toggleStatus)
  const setViewMode     = usePurchasesStore((s) => s.setViewMode)

  const companies = getVendorCompanies(orders, activeBrand)

  // Count orders per company
  const countByCompany: Record<string, number> = {}
  for (const order of orders) {
    if (!order.vendorName) continue
    if (activeBrand !== 'ALL' && !order.lineItems.some((l) => l.productBrand === activeBrand)) continue
    countByCompany[order.vendorName] = (countByCompany[order.vendorName] ?? 0) + 1
  }

  const allChecked = activeCompanies.length === 0

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* View Toggle */}
      <div style={{ ...SECTION }}>
        <div style={LABEL}>View</div>
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: 7, padding: 2,
        }}>
          {(['company', 'customer'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                flex: 1, padding: '5px 0',
                border: 'none', borderRadius: 5,
                fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                background: viewMode === mode ? '#ffffff' : 'transparent',
                color: viewMode === mode ? '#111827' : '#6b7280',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Company Filter */}
      {companies.length > 1 && (
        <div style={SECTION}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={LABEL}>Company</div>
            {!allChecked && (
              <button
                onClick={clearCompanies}
                style={{
                  fontSize: 10, color: '#2563eb', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  padding: 0, fontWeight: 500,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* All checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => clearCompanies()}
              style={{ accentColor: '#2563eb', width: 13, height: 13 }}
            />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: '#374151', fontWeight: 500 }}>
              All Companies
            </span>
          </label>

          {companies.map((co) => {
            const checked = allChecked || activeCompanies.includes(co)
            return (
              <label
                key={co}
                style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCompany(co)}
                  style={{ accentColor: '#2563eb', width: 13, height: 13 }}
                />
                <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-ui)', color: '#374151', lineHeight: 1.3 }}>
                  {co}
                </span>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  color: '#9ca3af', fontWeight: 600,
                }}>
                  {countByCompany[co] ?? 0}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* Status Filter */}
      <div style={SECTION}>
        <div style={LABEL}>Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {STATUS_OPTIONS.map(({ value, label, color }) => {
            const active = value === 'ALL'
              ? activeStatuses.length === 0
              : activeStatuses.includes(value as never)

            return (
              <button
                key={value}
                onClick={() => toggleStatus(value as never)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 8px', borderRadius: 6,
                  border: active ? `1px solid ${color}44` : '1px solid transparent',
                  background: active ? `${color}12` : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-ui)',
                  color: active ? color : '#374151',
                  fontWeight: active ? 600 : 400,
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
