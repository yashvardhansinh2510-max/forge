'use client'

import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { getFilteredLines, computeKPIs } from '@/lib/tracker-utils'
import type { KPICardKey } from '@/lib/usePurchasesStore'

const NUM: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

interface KPIChipProps {
  label:    string
  value:    number
  color:    string
  bg:       string
  cardKey:  KPICardKey
  isOpen:   boolean
  onClick:  () => void
}

function KPIChip({ label, value, color, bg, isOpen, onClick }: KPIChipProps) {
  return (
    <button
      onClick={onClick}
      title={isOpen ? `Close ${label} panel` : `Drill into ${label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px',
        background: isOpen ? bg : '#f9fafb',
        borderRadius: 8,
        border: isOpen
          ? `1.5px solid ${color}55`
          : '1.5px solid #e5e7eb',
        flex: '0 0 auto',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        boxShadow: isOpen ? `0 0 0 3px ${color}18` : 'none',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = bg
      }}
      onMouseLeave={(e) => {
        if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'
      }}
    >
      <span style={{ ...NUM, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 11, fontWeight: 500, color: isOpen ? color : '#6b7280',
          fontFamily: 'var(--font-ui)', lineHeight: 1.3,
          maxWidth: 72,
          transition: 'color 0.15s',
        }}>
          {label}
        </span>
        {isOpen && (
          <span style={{
            fontSize: 8, fontWeight: 700, color, fontFamily: 'var(--font-ui)',
            letterSpacing: '0.06em', opacity: 0.8,
          }}>
            ▲ OPEN
          </span>
        )}
      </div>
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

  const chips: Array<{ label: string; value: number; color: string; bg: string; cardKey: KPICardKey }> = [
    { label: 'Total Ordered',      value: kpis.totalOrdered,    color: '#2563eb', bg: 'rgba(37,99,235,0.06)',   cardKey: 'totalOrdered'    },
    { label: 'Pend. from Co.',     value: kpis.pendingFromCo,   color: '#F5A623', bg: 'rgba(245,166,35,0.06)',  cardKey: 'pendingFromCo'   },
    { label: 'Pend. from Dist.',   value: kpis.pendingFromDist, color: '#E8762C', bg: 'rgba(232,118,44,0.06)',  cardKey: 'pendingFromDist' },
    { label: 'At Godown',          value: kpis.atGodown,        color: '#4A90D9', bg: 'rgba(74,144,217,0.06)',  cardKey: 'atGodown'        },
    { label: 'In Box',             value: kpis.inBox,           color: '#7B68EE', bg: 'rgba(123,104,238,0.06)', cardKey: 'inBox'           },
    { label: 'Dispatched',         value: kpis.dispatched,      color: '#27AE60', bg: 'rgba(39,174,96,0.06)',   cardKey: 'dispatched'      },
    { label: 'Not Displayed',      value: kpis.notDisplayed,    color: '#95A5A6', bg: 'rgba(149,165,166,0.06)', cardKey: 'notDisplayed'    },
  ]

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center',
      padding: '12px 20px',
      background: '#ffffff',
      borderBottom: openKPICard ? 'none' : '1px solid #e5e7eb',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {chips.map((c) => (
        <KPIChip
          key={c.cardKey}
          {...c}
          isOpen={openKPICard === c.cardKey}
          onClick={() => toggleKPICard(c.cardKey)}
        />
      ))}
    </div>
  )
}
