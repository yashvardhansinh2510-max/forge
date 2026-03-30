'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { MOCK_CUSTOMERS, BRAND_COLORS } from '@/lib/mock/procurement-data'
import { getLinesForCustomer, getInitials, getAvatarColor } from '@/lib/tracker-utils'
import { useCustomerStageTotals } from '@/lib/swr-helpers'
import { OrderRow } from './OrderRow'
import type { KPICardKey } from '@/lib/usePurchasesStore'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }

// ─── Stage stat config ────────────────────────────────────────────────────────

type StageStatKey = KPICardKey

const STAGE_STAT_CONFIG: Array<{
  key:   StageStatKey
  label: string
  short: string
  color: string
  bg:    string
}> = [
  { key: 'totalOrdered',    label: 'Total Ordered',     short: 'Ordered',   color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'pendingFromCo',   label: 'Pend. from Co.',    short: 'Pend. Co',  color: '#F5A623', bg: 'rgba(245,166,35,0.07)'  },
  { key: 'pendingFromDist', label: 'Pend. from Dist.',  short: 'Pend. Dist',color: '#E8762C', bg: 'rgba(232,118,44,0.07)'  },
  { key: 'atGodown',        label: 'At Godown',         short: 'Godown',    color: '#4A90D9', bg: 'rgba(74,144,217,0.07)'  },
  { key: 'inBox',           label: 'In Box',            short: 'In Box',    color: '#7B68EE', bg: 'rgba(123,104,238,0.07)' },
  { key: 'dispatched',      label: 'Dispatched',        short: 'Dispatched',color: '#27AE60', bg: 'rgba(39,174,96,0.07)'   },
  { key: 'notDisplayed',    label: 'Not Displayed',     short: 'Not Disp',  color: '#95A5A6', bg: 'rgba(149,165,166,0.07)' },
]

export function CustomerDetailPanel() {
  const activeCustomerId = usePurchasesStore((s) => s.activeCustomerId)
  const orders           = useProcurementStore((s) => s.orders)
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [stageFilter, setStageFilter] = useState<StageStatKey | null>(null)
  const [exporting, setExporting]     = useState(false)

  // IMPORTANT: Call hooks unconditionally before any early returns (React Rules of Hooks)
  const { data: apiCounts } = useCustomerStageTotals(activeCustomerId)

  if (!activeCustomerId) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
        color: '#9ca3af', fontFamily: 'var(--font-ui)',
      }}>
        <div style={{ fontSize: 32, opacity: 0.4 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Select a customer to view their orders</span>
        <span style={{ fontSize: 11, color: '#d1d5db' }}>Choose from the list on the left</span>
      </div>
    )
  }

  const customer = MOCK_CUSTOMERS.find((c) => c.id === activeCustomerId)
  if (!customer) return null

  const initials    = getInitials(customer.clientName)
  const avatarColor = getAvatarColor(customer.clientName)

  // All lines for this customer (brand-filtered)
  const allLines = getLinesForCustomer(orders, activeCustomerId, brandFilter)
  const counts: Record<string, number> = {
    totalOrdered:    apiCounts?.ordered      ?? 0,
    pendingFromCo:   apiCounts?.pendingCo    ?? 0,
    pendingFromDist: apiCounts?.pendingDist  ?? 0,
    atGodown:        apiCounts?.godown       ?? 0,
    inBox:           apiCounts?.inBox        ?? 0,
    dispatched:      apiCounts?.dispatched   ?? 0,
    notDisplayed:    apiCounts?.notDisplayed ?? 0,
  }

  // Filtered lines based on active stage filter
  const filteredLines = stageFilter
    ? allLines.filter(({ alloc }) => {
        // Map stage filter key to relevant boxStatuses or stage fields
        switch (stageFilter) {
          case 'totalOrdered':    return true
          case 'pendingFromCo':   return alloc.boxStatus === 'ORDERED'
          case 'pendingFromDist': return alloc.boxStatus === 'ORDERED'
          case 'atGodown':        return alloc.boxStatus === 'AT_GODOWN'
          case 'inBox':           return alloc.boxStatus === 'IN_BOX' || alloc.boxStatus === 'DEL_PENDING'
          case 'dispatched':      return alloc.boxStatus === 'DELIVERED' || alloc.boxStatus === 'GIVEN_OTHER'
          case 'notDisplayed':    return false
          default:                return true
        }
      })
    : allLines

  const customerBrands = Array.from(new Set(allLines.map((l) => l.line.productBrand)))

  async function handleExport() {
    if (!customer || exporting) return
    setExporting(true)
    try {
      const { exportCustomerLines } = await import('@/lib/excelExporter')
      const stageLabel = stageFilter
        ? (STAGE_STAT_CONFIG.find((s) => s.key === stageFilter)?.label ?? 'All')
        : 'All'
      const rows = filteredLines.map(({ order, line, alloc }) => ({
        order,
        line,
        customerName: customer.clientName,
        allocQty:     alloc.qty,
        stage:        alloc.boxStatus,
      }))
      await exportCustomerLines(rows, customer.clientName, stageLabel)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        {/* Customer identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: avatarColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)' }}>
              {customer.clientName}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
              {customer.projectName}
            </div>
            {customer.architectName && (
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
                Architect: {customer.architectName}
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting || filteredLines.length === 0}
            data-testid="customer-export-excel"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7,
              border: '1px solid #d1fae5', background: '#ecfdf5',
              color: '#059669', fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-ui)', cursor: filteredLines.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredLines.length === 0 ? 0.5 : 1,
              transition: 'all 0.1s',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M14 2H5.5L2 5.5V14a1 1 0 001 1h11a1 1 0 001-1V3a1 1 0 00-1-1zM5 2v3H2M8 7v6M5 10l3 3 3-3"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>

        {/* 7 Stage stat boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {STAGE_STAT_CONFIG.map(({ key, short, color, bg }) => {
            const value  = counts[key] ?? 0
            const active = stageFilter === key
            return (
              <button
                key={key}
                onClick={() => setStageFilter((prev) => prev === key ? null : key)}
                data-testid={`customer-stat-${key}`}
                style={{
                  padding: '7px 6px', borderRadius: 8,
                  background: active ? bg : '#f9fafb',
                  border: active ? `1.5px solid ${color}55` : '1.5px solid #e5e7eb',
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.15s', outline: 'none',
                  boxShadow: active ? `0 0 0 2px ${color}18` : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Top color bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: color, opacity: active ? 1 : 0.3,
                  borderRadius: '8px 8px 0 0',
                }} />
                <div style={{ ...NUM, fontSize: 17, fontWeight: 800, color: active ? color : '#374151', lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 600,
                  color: active ? color : '#9ca3af',
                  fontFamily: 'var(--font-ui)', marginTop: 3,
                  letterSpacing: '0.02em',
                }}>
                  {short}
                </div>
              </button>
            )
          })}
        </div>

        {/* Active stage filter indicator */}
        {stageFilter && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 8, padding: '5px 10px', borderRadius: 6,
            background: '#f0f9ff', border: '1px solid #bfdbfe',
          }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: '#1d4ed8', fontWeight: 500 }}>
              Showing: <strong>{STAGE_STAT_CONFIG.find((s) => s.key === stageFilter)?.label}</strong> only
              &nbsp;({filteredLines.length} item{filteredLines.length !== 1 ? 's' : ''})
            </span>
            <button
              onClick={() => setStageFilter(null)}
              style={{
                fontSize: 10, fontFamily: 'var(--font-ui)', color: '#1d4ed8',
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Brand filter bar */}
      {customerBrands.length > 1 && (
        <div style={{
          padding: '8px 20px',
          background: '#FAFAF8',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', gap: 6, alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 9, color: '#9ca3af', fontFamily: 'var(--font-ui)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4,
          }}>
            Brand:
          </span>
          {['ALL', ...customerBrands].map((b) => {
            const active = brandFilter === b
            const color  = BRAND_COLORS[b] ?? '#374151'
            return (
              <button
                key={b}
                onClick={() => setBrandFilter(b)}
                style={{
                  padding: '3px 10px', borderRadius: 12,
                  border: active ? `1.5px solid ${b === 'ALL' ? '#374151' : color}` : '1px solid #e5e7eb',
                  background: active ? (b === 'ALL' ? '#111827' : `${color}14`) : '#fff',
                  color: active ? (b === 'ALL' ? '#fff' : color) : '#6b7280',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                {b}
              </button>
            )
          })}
        </div>
      )}

      {/* Order rows */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {filteredLines.length === 0 ? (
          <div style={{
            padding: '32px 20px', textAlign: 'center',
            fontSize: 13, color: '#9ca3af', fontFamily: 'var(--font-ui)',
          }}>
            {stageFilter
              ? `No items at "${STAGE_STAT_CONFIG.find((s) => s.key === stageFilter)?.label}"${brandFilter !== 'ALL' ? ` for ${brandFilter}` : ''}.`
              : `No orders for this customer${brandFilter !== 'ALL' ? ` under ${brandFilter}` : ''}.`
            }
          </div>
        ) : (
          filteredLines.map(({ order, line, alloc }) => (
            <OrderRow key={`${order.id}-${line.id}`} order={order} line={line} alloc={alloc} />
          ))
        )}
      </div>
    </div>
  )
}
