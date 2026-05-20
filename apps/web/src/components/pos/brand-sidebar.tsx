'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useSWR from 'swr'
import { usePOSStore } from '@/lib/pos-store'
import { usePOSCatalog } from '@/lib/pos-catalog'
import { usePOSSeriesStore } from '@/lib/pos-series-store'

interface SeriesGroup {
  brand: string
  series: string[]
}

const seriesFetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<SeriesGroup[]>)

interface BrandSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function BrandSidebar({ collapsed, onToggle }: BrandSidebarProps) {
  const selectedBrand       = usePOSStore((s) => s.selectedBrand)
  const selectedCategory    = usePOSStore((s) => s.selectedCategory)
  const setSelectedBrand    = usePOSStore((s) => s.setSelectedBrand)
  const setSelectedCategory = usePOSStore((s) => s.setSelectedCategory)
  const selectedSeries      = usePOSSeriesStore((s) => s.selectedSeries)
  const setSelectedSeries   = usePOSSeriesStore((s) => s.setSelectedSeries)
  const { products, brands, isLoading } = usePOSCatalog()

  const { data: seriesData } = useSWR<SeriesGroup[]>('/api/products/series', seriesFetcher, {
    revalidateOnFocus: false,
  })

  React.useEffect(() => {
    if (!selectedBrand && brands.length > 0) {
      setSelectedBrand(brands[0]?.name ?? null)
      return
    }
    if (selectedBrand && brands.length > 0 && !brands.some((b) => b.name === selectedBrand)) {
      setSelectedBrand(brands[0]?.name ?? null)
    }
  }, [brands, selectedBrand, setSelectedBrand])

  // Reset series when brand changes
  React.useEffect(() => { setSelectedSeries(null) }, [selectedBrand, setSelectedSeries])

  // Series list from endpoint, counts from loaded products
  const seriesList = React.useMemo(() => {
    if (!selectedBrand || !seriesData) return []
    const brandUpper = selectedBrand.toUpperCase()
    const group = seriesData.find((g) => g.brand === brandUpper)
    if (!group) return []

    // Count products per series from loaded data
    const counts = new Map<string, number>()
    for (const p of products) {
      if (p.brand === selectedBrand && !p.isConcealed && p.seriesName)
        counts.set(p.seriesName, (counts.get(p.seriesName) ?? 0) + 1)
    }
    return group.series.map((name) => ({ name, count: counts.get(name) ?? 0 }))
  }, [seriesData, selectedBrand, products])

  // Derive categories + counts for the selected brand
  const categories = React.useMemo(() => {
    if (!selectedBrand) return []
    const catMap = new Map<string, number>()
    for (const p of products) {
      if (p.brand === selectedBrand && !p.isConcealed)
        catMap.set(p.category, (catMap.get(p.category) ?? 0) + 1)
    }
    return Array.from(catMap.entries()).map(([name, count]) => ({ name, count }))
  }, [products, selectedBrand])

  // Brand color for selected-series pill
  const activeBrandColor = React.useMemo(() => {
    return brands.find((b) => b.name === selectedBrand)?.color ?? 'rgba(255,255,255,0.4)'
  }, [brands, selectedBrand])

  if (collapsed) {
    return (
      <div
        style={{
          width: 36, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'var(--shell-bg)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          paddingTop: 8,
          gap: 6,
        }}
      >
        <button
          onClick={onToggle}
          title="Expand brand panel"
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        >
          <ChevronRight size={13} />
        </button>

        {brands.map((brand) => {
          const isActive = selectedBrand === brand.name
          return (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.name)}
              title={brand.name}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: isActive ? brand.color : 'rgba(255,255,255,0.12)',
                border: isActive ? `2px solid ${brand.color}` : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
                transition: 'background 120ms, border-color 120ms',
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 180, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--shell-bg)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px 6px',
        }}
      >
        <span
          style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          Brands
        </span>
        <button
          onClick={onToggle}
          title="Collapse brand panel"
          style={{
            width: 20, height: 20, borderRadius: 4,
            background: 'rgba(255,255,255,0.06)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        >
          <ChevronLeft size={11} />
        </button>
      </div>

      <div style={{ flexShrink: 0 }}>
        {brands.map((brand) => {
          const isActive = selectedBrand === brand.name
          return (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.name)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 14px',
                background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute', left: 0, top: 4, bottom: 4,
                    width: 2, background: brand.color, borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
              <span
                style={{
                  flex: 1, fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
                  letterSpacing: '-0.01em',
                }}
              >
                {brand.name}
              </span>
              <span
                style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.28)',
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                }}
              >
                {brand.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Series section */}
      {!isLoading && selectedBrand && seriesList.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0', flexShrink: 0 }} />
          <div style={{
            padding: '0 14px 6px', fontSize: 10, fontWeight: 600,
            color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            Series
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 10px 8px', flexShrink: 0 }}>
            {seriesList.map(({ name, count }) => {
              const isActive = selectedSeries === name
              return (
                <button
                  key={name}
                  onClick={() => setSelectedSeries(isActive ? null : name)}
                  title={count > 0 ? `${count} products` : name}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    border: isActive
                      ? `1px solid ${activeBrandColor}`
                      : '1px solid rgba(255,255,255,0.14)',
                    background: isActive ? `${activeBrandColor}33` : 'transparent',
                    cursor: 'pointer',
                    fontSize: 10, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.52)',
                    transition: 'all 100ms',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {name}
                  {count > 0 && (
                    <span style={{ marginLeft: 4, opacity: 0.5, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Category section */}
      {isLoading && (
        <div className="px-4 py-3 text-xs text-[rgba(255,255,255,0.42)]">Loading catalog…</div>
      )}
      {selectedBrand && categories.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0', flexShrink: 0 }} />
          <div style={{
            padding: '0 14px 6px', fontSize: 10, fontWeight: 600,
            color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            Category
          </div>

          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '6px 14px',
              background: selectedCategory === null ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { if (selectedCategory !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={(e) => { if (selectedCategory !== null) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{
              fontSize: 12, fontWeight: selectedCategory === null ? 600 : 400,
              color: selectedCategory === null ? '#fff' : 'rgba(255,255,255,0.52)',
            }}>
              All {selectedBrand}
            </span>
          </button>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {categories.map(({ name, count }) => {
              const isActive = selectedCategory === name
              return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 14px',
                    background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.52)',
                  }}>
                    {name}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.25)',
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
