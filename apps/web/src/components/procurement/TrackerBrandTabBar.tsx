'use client'

import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { BRAND_GROUPS, BRAND_TABS, BRAND_COLORS } from '@/lib/mock/procurement-data'
import { BrandLogo } from './BrandLogo'

const NUM_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

export function TrackerBrandTabBar() {
  const activeBrand    = usePurchasesStore((s) => s.activeBrand)
  const setActiveBrand = usePurchasesStore((s) => s.setActiveBrand)
  const orders         = useProcurementStore((s) => s.orders)

  // Count line items per individual brand
  const countByBrand: Record<string, number> = {}
  for (const order of orders) {
    for (const line of order.lineItems) {
      const b = line.productBrand
      countByBrand[b] = (countByBrand[b] ?? 0) + 1
    }
  }

  // Count for a tab = sum of all brands in its group
  function tabCount(tab: string): number {
    if (tab === 'ALL') return orders.reduce((s, o) => s + o.lineItems.length, 0)
    const members = BRAND_GROUPS[tab] ?? [tab]
    return members.reduce((sum, b) => sum + (countByBrand[b] ?? 0), 0)
  }

  // Primary color for a tab
  function tabColor(tab: string): string {
    return BRAND_COLORS[tab] ?? '#374151'
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      padding: '0 24px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E8E6E1',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {/* ALL tab */}
      <TabButton
        tabKey="ALL"
        active={activeBrand === 'ALL'}
        color="#374151"
        count={tabCount('ALL')}
        onClick={() => setActiveBrand('ALL')}
      >
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: activeBrand === 'ALL' ? '#1C1F1D' : '#5C635E',
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '0.08em',
        }}>
          ALL
        </span>
      </TabButton>

      {/* Brand tabs */}
      {BRAND_TABS.map((tab) => {
        const active    = activeBrand === tab
        const color     = tabColor(tab)
        const members   = BRAND_GROUPS[tab] ?? [tab]

        return (
          <TabButton
            key={tab}
            tabKey={tab}
            active={active}
            color={color}
            count={tabCount(tab)}
            onClick={() => setActiveBrand(tab)}
          >
            {/* Show logos for all members side by side — no text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {members.map((brand) => (
                <BrandLogo
                  key={brand}
                  brand={brand}
                  sizePx={22}
                  active={active}
                />
              ))}
            </div>
          </TabButton>
        )
      })}
    </div>
  )
}

// ─── TabButton ────────────────────────────────────────────────────────────────

function TabButton({
  tabKey,
  active,
  color,
  count,
  onClick,
  children,
}: {
  tabKey: string
  active: boolean
  color: string
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        border: 'none',
        borderBottom: active ? `2.5px solid ${color}` : '2.5px solid transparent',
        background: active ? `${color}12` : 'transparent',
        cursor: 'pointer',
        borderRadius: '4px 4px 0 0',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
      <span style={{
        ...NUM_STYLE,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 10,
        background: active ? color : '#F0EFEB',
        color: active ? '#fff' : '#5C635E',
        minWidth: 18,
        textAlign: 'center',
        fontFamily: "'Manrope', sans-serif",
      }}>
        {count}
      </span>
    </button>
  )
}
