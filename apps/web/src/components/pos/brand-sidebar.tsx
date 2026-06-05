'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import useSWR from 'swr'
import { usePOSStore } from '@/lib/pos-store'
import { usePOSCatalog } from '@/lib/pos-catalog'
import { usePOSSeriesStore } from '@/lib/pos-series-store'

interface SeriesGroup {
  brand: string
  series: string[]
}

const seriesFetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<SeriesGroup[]>)

const TIER_CONFIG: { key: 'luxury' | 'premium' | 'mid'; label: string; dot: string }[] = [
  { key: 'luxury',  label: 'Luxury',  dot: '#92700A' },
  { key: 'premium', label: 'Premium', dot: '#4338CA' },
  { key: 'mid',     label: 'Mid',     dot: '#4B5563' },
]

interface BrandSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function BrandSidebar({ collapsed, onToggle }: BrandSidebarProps) {
  const selectedBrand       = usePOSStore((s) => s.selectedBrand)
  const selectedCategory    = usePOSStore((s) => s.selectedCategory)
  const selectedTier        = usePOSStore((s) => s.selectedTier)
  const setSelectedBrand    = usePOSStore((s) => s.setSelectedBrand)
  const setSelectedCategory = usePOSStore((s) => s.setSelectedCategory)
  const setSelectedTier     = usePOSStore((s) => s.setSelectedTier)
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

  React.useEffect(() => { setSelectedSeries(null) }, [selectedBrand, setSelectedSeries])

  const seriesList = React.useMemo(() => {
    if (!selectedBrand || !seriesData) return []
    const brandUpper = selectedBrand.toUpperCase()
    const group = seriesData.find((g) => g.brand === brandUpper)
    if (!group) return []

    const counts = new Map<string, number>()
    for (const p of products) {
      if (p.brand === selectedBrand && !p.isConcealed && p.seriesName) {
        if (!selectedCategory || p.subcategoryLabel === selectedCategory)
          counts.set(p.seriesName, (counts.get(p.seriesName) ?? 0) + 1)
      }
    }
    const list = group.series.map((name) => ({ name, count: counts.get(name) ?? 0 }))
    return selectedCategory ? list.filter(({ count }) => count > 0) : list
  }, [seriesData, selectedBrand, products, selectedCategory])

  const categories = React.useMemo(() => {
    if (!selectedBrand) return []
    const catMap = new Map<string, number>()
    for (const p of products) {
      if (p.brand === selectedBrand && !p.isConcealed)
        catMap.set(p.subcategoryLabel, (catMap.get(p.subcategoryLabel) ?? 0) + 1)
    }
    return Array.from(catMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }))
  }, [products, selectedBrand])

  const activeBrandColor = React.useMemo(() => {
    return brands.find((b) => b.name === selectedBrand)?.color ?? 'rgba(255,255,255,0.4)'
  }, [brands, selectedBrand])

  const hasActiveFilters = !!(selectedCategory || selectedSeries || selectedTier)

  function clearAllFilters() {
    setSelectedCategory(null)
    setSelectedSeries(null)
    setSelectedTier(null)
  }

  if (collapsed) {
    return (
      <div style={{
        width: 36, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--shell-bg)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden', paddingTop: 8, gap: 6,
      }}>
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
    <div style={{
      width: 180, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--shell-bg)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px 6px',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Brands
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              title="Clear all filters"
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(239,68,68,0.18)',
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer', fontSize: 9, fontWeight: 600,
                color: '#fca5a5',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
            >
              <X size={9} />
              Clear
            </button>
          )}
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
      </div>

      {/* Brand list */}
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
                <div style={{
                  position: 'absolute', left: 0, top: 4, bottom: 4,
                  width: 2, background: brand.color, borderRadius: '0 2px 2px 0',
                }} />
              )}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
              <span style={{
                flex: 1, fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
                letterSpacing: '-0.01em',
              }}>
                {brand.name}
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.28)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              }}>
                {brand.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Tier Filter ─────────────────────────────────────────────────────── */}
      <>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0', flexShrink: 0 }} />
        <div style={{
          padding: '0 14px 6px', fontSize: 10, fontWeight: 600,
          color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase',
          letterSpacing: '0.08em', flexShrink: 0,
        }}>
          Tier
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingBottom: 2, flexShrink: 0 }}>
          {TIER_CONFIG.map(({ key, label, dot }) => {
            const isActive = selectedTier === key
            return (
              <button
                key={key}
                onClick={() => setSelectedTier(isActive ? null : key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '5px 14px',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.52)',
                  }}>
                    {label}
                  </span>
                </div>
                {isActive && <X size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />}
              </button>
            )
          })}
        </div>
      </>

      {/* ── Series ───────────────────────────────────────────────────────────── */}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 10px 8px', maxHeight: 140, overflowY: 'auto' }}>
            {seriesList.map(({ name, count }) => {
              const isActive = selectedSeries === name
              return (
                <button
                  key={name}
                  onClick={() => setSelectedSeries(isActive ? null : name)}
                  title={count > 0 ? `${count} products` : name}
                  style={{
                    padding: '3px 8px', borderRadius: 999,
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

      {/* ── Category ─────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ padding: '12px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Loading catalog…
        </div>
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
