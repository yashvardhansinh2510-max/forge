'use client'

import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { useStageTotals }      from '@/lib/swr-helpers'
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
  onClick:      () => void
}

function KPICard({ label, value, color, bg, isOpen, onClick }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '14px 18px 12px',
        background: isOpen ? bg : '#ffffff',
        borderRadius: 10,
        border: isOpen ? `1.5px solid ${color}66` : '1.5px solid #e5e7eb',
        flex: '1 1 0',
        minWidth: 100,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        boxShadow: isOpen
          ? `0 0 0 3px ${color}18, 0 2px 8px ${color}14`
          : '0 1px 3px rgba(0,0,0,0.04)',
        outline: 'none',
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
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
          el.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, borderRadius: '10px 10px 0 0',
        background: color, opacity: isOpen ? 1 : 0.4,
        transition: 'opacity 0.15s',
      }} />

      {/* Number */}
      <div style={{ ...NUM, fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginTop: 2 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: isOpen ? color : '#6b7280',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.3, marginTop: 6,
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>

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
  const openKPICard     = usePurchasesStore((s) => s.openKPICard)
  const toggleKPICard   = usePurchasesStore((s) => s.toggleKPICard)

  const { data: totals } = useStageTotals()

  const t = totals ?? { unallocated: 0, pendingCo: 0, pendingDist: 0, godown: 0, inBox: 0, dispatched: 0, notDisplayed: 0 }

  const cards: Array<{
    label: string; value: number; color: string; bg: string
    cardKey: KPICardKey
  }> = [
    { label: 'Unallocated',        value: t.unallocated,  color: '#64748b', bg: 'rgba(100,116,139,0.06)',  cardKey: 'totalOrdered'    },
    { label: 'Pend. from Co.',     value: t.pendingCo,    color: '#F5A623', bg: 'rgba(245,166,35,0.07)',   cardKey: 'pendingFromCo'   },
    { label: 'Pend. from Dist.',   value: t.pendingDist,  color: '#E8762C', bg: 'rgba(232,118,44,0.07)',   cardKey: 'pendingFromDist' },
    { label: 'At Godown',          value: t.godown,       color: '#4A90D9', bg: 'rgba(74,144,217,0.07)',   cardKey: 'atGodown'        },
    { label: 'In Box',             value: t.inBox,        color: '#7B68EE', bg: 'rgba(123,104,238,0.07)',  cardKey: 'inBox'           },
    { label: 'Dispatched',         value: t.dispatched,   color: '#27AE60', bg: 'rgba(39,174,96,0.07)',    cardKey: 'dispatched'      },
    { label: 'Not Displayed',      value: t.notDisplayed, color: '#95A5A6', bg: 'rgba(149,165,166,0.07)',  cardKey: 'notDisplayed'    },
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
          isOpen={openKPICard === c.cardKey}
          onClick={() => toggleKPICard(c.cardKey)}
        />
      ))}
    </div>
  )
}
