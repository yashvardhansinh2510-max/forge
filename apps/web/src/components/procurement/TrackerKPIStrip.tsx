'use client'

import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { useStageTotals }      from '@/lib/swr-helpers'
import type { KPICardKey } from '@/lib/usePurchasesStore'

interface KPICardProps {
  label:        string
  value:        number
  accent:       string
  cardKey:      KPICardKey
  isOpen:       boolean
  onClick:      () => void
}

function KPICard({ label, value, accent, isOpen, onClick }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '20px 22px 16px',
        background: isOpen ? '#FFFFFF' : '#FFFFFF',
        borderRadius: 14,
        border: isOpen ? `1.5px solid ${accent}40` : '1px solid #E8E6E1',
        flex: '1 1 0',
        minWidth: 110,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isOpen
          ? `0 8px 30px ${accent}12, 0 0 0 3px ${accent}08`
          : '0 2px 12px rgba(28,31,29,0.03)',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden',
        transform: isOpen ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!isOpen) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.boxShadow = `0 8px 24px rgba(28,31,29,0.06)`
          el.style.borderColor = `${accent}30`
          el.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isOpen) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.boxShadow = '0 2px 12px rgba(28,31,29,0.03)'
          el.style.borderColor = '#E8E6E1'
          el.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Accent indicator line */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: isOpen ? '100%' : '40%',
        height: 2,
        background: accent,
        opacity: isOpen ? 0.8 : 0.3,
        transition: 'width 0.3s ease, opacity 0.2s',
        borderRadius: '14px 0 0 0',
      }} />

      {/* Number — serif for premium feel */}
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 36, fontWeight: 600,
        color: isOpen ? accent : '#1C1F1D',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.2s',
      }}>
        {value}
      </div>

      {/* Label — sans-serif, subtle */}
      <div style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: 10, fontWeight: 600,
        color: isOpen ? accent : '#8F9691',
        lineHeight: 1.3, marginTop: 8,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'color 0.2s',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>

      {/* Active badge */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 6, height: 6, borderRadius: '50%',
          background: accent,
        }} />
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
    label: string; value: number; accent: string; cardKey: KPICardKey
  }> = [
    { label: 'Unallocated',     value: t.unallocated,  accent: '#4A5D5E', cardKey: 'totalOrdered'    },
    { label: 'Pend. Company',   value: t.pendingCo,    accent: '#B87333', cardKey: 'pendingFromCo'   },
    { label: 'Pend. Dist.',     value: t.pendingDist,  accent: '#D4A373', cardKey: 'pendingFromDist' },
    { label: 'At Godown',       value: t.godown,       accent: '#1E5B8A', cardKey: 'atGodown'        },
    { label: 'In Box',          value: t.inBox,        accent: '#8A9A86', cardKey: 'inBox'           },
    { label: 'Dispatched',      value: t.dispatched,   accent: '#2A6A4E', cardKey: 'dispatched'      },
    { label: 'Not Displayed',   value: t.notDisplayed, accent: '#8F9691', cardKey: 'notDisplayed'    },
  ]

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'stretch',
      padding: '16px 24px',
      background: '#F6F5F2',
      borderBottom: openKPICard ? 'none' : '1px solid #E8E6E1',
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
