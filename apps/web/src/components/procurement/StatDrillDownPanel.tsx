'use client'

import { useState, useEffect } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { BRAND_COLORS, BRANDS_ORDERED } from '@/lib/mock/procurement-data'
import type { MockPOLineItem } from '@/lib/mock/procurement-data'
import { getLinesForKPIDrillDown } from '@/lib/tracker-utils'
import type { KPICardKey } from '@/lib/usePurchasesStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const NUM: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

const KPI_LABELS: Record<KPICardKey, string> = {
  totalOrdered:    'ALL ORDERED',
  pendingFromCo:   'PENDING FROM CO.',
  pendingFromDist: 'PENDING FROM DIST.',
  atGodown:        'AT GODOWN',
  inBox:           'IN BOX',
  dispatched:      'DISPATCHED',
  notDisplayed:    'NOT DISPLAYED',
}

const KPI_ACCENT: Record<KPICardKey, string> = {
  totalOrdered:    '#2563eb',
  pendingFromCo:   '#F5A623',
  pendingFromDist: '#E8762C',
  atGodown:        '#4A90D9',
  inBox:           '#7B68EE',
  dispatched:      '#27AE60',
  notDisplayed:    '#95A5A6',
}

const CARD_TO_FIELD: Record<KPICardKey, keyof MockPOLineItem> = {
  totalOrdered:    'qtyOrdered',
  pendingFromCo:   'qtyPendingCo',
  pendingFromDist: 'qtyPendingDist',
  atGodown:        'qtyAtGodown',
  inBox:           'qtyInBox',
  dispatched:      'qtyDispatched',
  notDisplayed:    'qtyNotDisplayed',
}

// ─── StatDrillDownPanel ───────────────────────────────────────────────────────

export function StatDrillDownPanel() {
  const openKPICard     = usePurchasesStore((s) => s.openKPICard)
  const closeKPICard    = usePurchasesStore((s) => s.closeKPICard)
  const activeBrand     = usePurchasesStore((s) => s.activeBrand)
  const activeCompanies = usePurchasesStore((s) => s.activeCompanies)
  const orders          = useProcurementStore((s) => s.orders)

  const [search, setSearch]         = useState('')
  const [localBrand, setLocalBrand] = useState('ALL')

  useEffect(() => {
    setSearch('')
    setLocalBrand('ALL')
  }, [openKPICard])

  if (!openKPICard) return null

  const effectiveBrand = localBrand !== 'ALL' ? localBrand : activeBrand
  const lines  = getLinesForKPIDrillDown(orders, openKPICard, effectiveBrand, activeCompanies, search)
  const accent = KPI_ACCENT[openKPICard]
  const label  = KPI_LABELS[openKPICard]
  const field  = CARD_TO_FIELD[openKPICard]

  return (
    <div style={{
      flexShrink: 0,
      background: '#fff',
      borderBottom: '2px solid #e5e7eb',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      zIndex: 10,
      maxHeight: 420,
      display: 'flex',
      flexDirection: 'column',
      animation: 'drilldown-slide-in 0.18s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`
        @keyframes drilldown-slide-in {
          from { max-height: 0; opacity: 0; transform: translateY(-8px); }
          to   { max-height: 420px; opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px',
        borderBottom: '1px solid #f3f4f6',
        flexShrink: 0,
      }}>
        {/* Title + count */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, color: accent,
            fontFamily: 'var(--font-ui)', letterSpacing: '0.07em',
          }}>
            {label}
          </span>
          <span style={{
            ...NUM, fontSize: 11, fontWeight: 600, color: '#6b7280',
          }}>
            ({lines.length} line{lines.length !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Brand pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['ALL', ...BRANDS_ORDERED].map((b) => {
            const active = localBrand === b
            const color  = BRAND_COLORS[b] ?? '#374151'
            return (
              <button
                key={b}
                onClick={() => setLocalBrand(b)}
                style={{
                  padding: '2px 8px', borderRadius: 10,
                  border: active
                    ? `1.5px solid ${b === 'ALL' ? '#374151' : color}`
                    : '1px solid #e5e7eb',
                  background: active
                    ? (b === 'ALL' ? '#111827' : `${color}14`)
                    : 'transparent',
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

        {/* Search */}
        <input
          type="text"
          placeholder="Search SKU or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '5px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: 11, fontFamily: 'var(--font-ui)', color: '#111827',
            background: '#f9fafb', outline: 'none', width: 180,
          }}
        />

        {/* Close */}
        <button
          onClick={closeKPICard}
          style={{
            width: 24, height: 24, borderRadius: 6,
            border: '1px solid #e5e7eb', background: '#f3f4f6',
            color: '#6b7280', fontSize: 14, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}
        >
          ✕
        </button>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 100px 120px 60px 70px',
        gap: 12,
        padding: '6px 20px',
        background: '#f9fafb',
        borderBottom: '1px solid #f3f4f6',
        flexShrink: 0,
      }}>
        {['', 'PRODUCT', 'BRAND', 'VENDOR', 'ORDERED', 'AT STAGE'].map((h) => (
          <span key={h} style={{
            fontSize: 9, fontWeight: 700, color: '#9ca3af',
            fontFamily: 'var(--font-ui)', letterSpacing: '0.07em',
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {lines.length === 0 ? (
          <div style={{
            padding: '28px', textAlign: 'center',
            fontSize: 13, color: '#9ca3af', fontFamily: 'var(--font-ui)',
          }}>
            No items match the current filters.
          </div>
        ) : (
          lines.map(({ order, line }) => {
            const brandColor  = BRAND_COLORS[line.productBrand] ?? '#374151'
            const qtyAtStage  = line[field] as number

            return (
              <div
                key={`${order.id}-${line.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 100px 120px 60px 70px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 20px',
                  borderBottom: '1px solid #f3f4f6',
                  background: '#fff',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#fff' }}
              >
                {/* Product icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: `${brandColor}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  📦
                </div>

                {/* Product name + SKU */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#111827',
                    fontFamily: 'var(--font-ui)', lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {line.productName}
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700,
                      background: `${brandColor}14`, color: brandColor,
                      padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em',
                    }}>
                      {line.productSku}
                    </span>
                  </div>
                </div>

                {/* Brand */}
                <div style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
                  color: brandColor, letterSpacing: '0.04em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {line.productBrand}
                </div>

                {/* Vendor */}
                <div style={{
                  fontSize: 11, fontFamily: 'var(--font-ui)', color: '#374151',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {order.vendorName}
                </div>

                {/* Qty ordered */}
                <div style={{ ...NUM, fontSize: 13, fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>
                  {line.qtyOrdered}
                </div>

                {/* Qty at this stage */}
                <div style={{ ...NUM, fontSize: 14, fontWeight: 700, color: accent, textAlign: 'right' }}>
                  {qtyAtStage}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
