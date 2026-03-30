'use client'

// ─── BrandTabBar — full-width brand filter tab bar ────────────────────────────
// 72px height, 6 tabs: ALL + 5 brands.
// Each tab: logo only (no text), count badge, brand-color bottom border when active.

import * as React from 'react'
import { BRAND_COLORS, BRANDS_ORDERED } from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { BrandLogo } from './BrandLogo'

const TABS = ['ALL', ...BRANDS_ORDERED] as const

function formatCount(n: number): string {
  return n > 99 ? '99+' : String(n)
}

export function BrandTabBar() {
  const orders        = useProcurementStore((s) => s.orders)
  const activeBrand   = usePurchasesStore((s) => s.activeBrand)
  const setActiveBrand = usePurchasesStore((s) => s.setActiveBrand)

  // PO count per brand
  const brandCounts = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const o of orders) {
      const k = (o.vendorName ?? 'OTHER').toUpperCase()
      map[k] = (map[k] ?? 0) + 1
    }
    map['ALL'] = orders.length
    return map
  }, [orders])

  return (
    <div style={{
      display: 'flex', height: 72, flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--background)',
    }}>
      {TABS.map((brand) => {
        const isActive    = activeBrand === brand
        const count       = brandCounts[brand] ?? 0
        const brandColor  = BRAND_COLORS[brand] ?? '#6B7280'

        return (
          <Tab
            key={brand}
            brand={brand}
            count={count}
            isActive={isActive}
            brandColor={brandColor}
            onClick={() => setActiveBrand(brand)}
          />
        )
      })}
    </div>
  )
}

// ─── Individual tab ───────────────────────────────────────────────────────────

function Tab({
  brand, count, isActive, brandColor, onClick,
}: {
  brand: string
  count: number
  isActive: boolean
  brandColor: string
  onClick: () => void
}) {
  const [hovered, setHovered] = React.useState(false)

  const opacity = isActive ? 1 : hovered ? 0.75 : 0.38

  return (
    <button
      onClick={onClick}
      title={brand === 'ALL' ? 'All brands' : brand}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        border: 'none',
        borderBottom: `3px solid ${isActive ? brandColor : 'transparent'}`,
        background: isActive ? `${brandColor}08` : 'none',
        cursor: 'pointer', padding: '0 4px',
        opacity, transition: 'opacity 0.15s, border-color 0.15s, background 0.15s',
      }}
    >
      {/* Logo only — no brand name text */}
      <BrandLogo brand={brand} sizePx={28} />

      {/* Count badge */}
      <span style={{
        fontSize: 9, fontWeight: 800, lineHeight: 1,
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        color: isActive ? brandColor : 'var(--text-muted)',
        minWidth: 16, textAlign: 'center',
      }}>
        {formatCount(count)}
      </span>
    </button>
  )
}
