'use client'

import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { getFilteredLines, computeKPIs } from '@/lib/tracker-utils'
import type { KPICardKey } from '@/lib/usePurchasesStore'

const NUM: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

interface KPICardProps {
  label:        string
  value:        number
  color:        string
  bg:           string
  cardKey:      KPICardKey
  isOpen:       boolean
  pct:          number   // percentage of totalOrdered
  isTotal:      boolean
  onClick:      () => void
}

function KPICard({ label, value, color, bg, isOpen, pct, isTotal, onClick }: KPICardProps) {
  const barWidth = isTotal ? 100 : Math.min(100, pct)

  return (
    <button
      onClick={onClick}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '11px 16px 9px',
        background: isOpen ? bg : '#ffffff',
        borderRadius: 10,
        border: isOpen ? `1.5px solid ${color}66` : '1.5px solid #e5e7eb',
        flex: '0 0 auto',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        boxShadow: isOpen
          ? `0 0 0 3px ${color}18, 0 2px 8px ${color}14`
          : '0 1px 3px rgba(0,0,0,0.05)',
        outline: 'none',
        minWidth: 110,
        position: 'relative',
        overflow: 'hidden',
        transform: isOpen ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!isOpen) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = bg
          el.style.borderColor = `${color}44`
          el.style.boxShadow = `0 2px 8px ${color}12`
          el.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isOpen) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = '#ffffff'
          el.style.borderColor = '#e5e7eb'
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          el.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, borderRadius: '10px 10px 0 0',
        background: color, opacity: isOpen ? 1 : 0.35,
        transition: 'opacity 0.15s',
      }} />

      {/* Number */}
      <div style={{ ...NUM, fontSize: 26, fontWeight: 800, color, lineHeight: 1, marginTop: 2 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: isOpen ? color : '#6b7280',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.3, marginTop: 4,
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>

      {/* Progress bar (% of total) */}
      {!isTotal && (
        <div style={{
          marginTop: 7,
          height: 3, borderRadius: 2,
          background: `${color}20`,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${barWidth}%`,
            background: color,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* "OPEN" badge */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          fontSize: 7, fontWeight: 800, color,
          fontFamily: 'var(--font-ui)', letterSpacing: '0.08em',
          background: `${color}18`, padding: '1px 5px', borderRadius: 4,
        }}>
          OPEN
        </div>
      )}
    </button>
  )
}

export function TrackerKPIStrip() {
  const orders          = useProcurementStore((s) => s.orders)
  const activeBrand     = usePurchasesStore((s) => s.activeBrand)
  const activeCompanies = usePurchasesStore((s) => s.activeCompanies)
  const openKPICard     = usePurchasesStore((s) => s.openKPICard)
  const toggleKPICard   = usePurchasesStore((s) => s.toggleKPICard)

  const lines = getFilteredLines(orders, activeBrand, activeCompanies, '')
  const kpis  = computeKPIs(lines)
  const total = kpis.totalOrdered || 1  // avoid divide by zero

  const cards: Array<{
    label: string; value: number; color: string; bg: string
    cardKey: KPICardKey; isTotal: boolean
  }> = [
    { label: 'Total Ordered',      value: kpis.totalOrdered,    color: '#2563eb', bg: 'rgba(37,99,235,0.06)',   cardKey: 'totalOrdered',    isTotal: true  },
    { label: 'Pend. from Co.',     value: kpis.pendingFromCo,   color: '#F5A623', bg: 'rgba(245,166,35,0.07)',  cardKey: 'pendingFromCo',   isTotal: false },
    { label: 'Pend. from Dist.',   value: kpis.pendingFromDist, color: '#E8762C', bg: 'rgba(232,118,44,0.07)',  cardKey: 'pendingFromDist', isTotal: false },
    { label: 'At Godown',          value: kpis.atGodown,        color: '#4A90D9', bg: 'rgba(74,144,217,0.07)',  cardKey: 'atGodown',        isTotal: false },
    { label: 'In Box',             value: kpis.inBox,           color: '#7B68EE', bg: 'rgba(123,104,238,0.07)', cardKey: 'inBox',           isTotal: false },
    { label: 'Dispatched',         value: kpis.dispatched,      color: '#27AE60', bg: 'rgba(39,174,96,0.07)',   cardKey: 'dispatched',      isTotal: false },
    { label: 'Not Displayed',      value: kpis.notDisplayed,    color: '#95A5A6', bg: 'rgba(149,165,166,0.07)', cardKey: 'notDisplayed',    isTotal: false },
  ]

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'stretch',
      padding: '12px 20px',
      background: '#FAFAF8',
      borderBottom: openKPICard ? 'none' : '1px solid #e5e7eb',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {cards.map((c) => (
        <KPICard
          key={c.cardKey}
          {...c}
          pct={Math.round((c.value / total) * 100)}
          isOpen={openKPICard === c.cardKey}
          onClick={() => toggleKPICard(c.cardKey)}
        />
      ))}
    </div>
  )
}
