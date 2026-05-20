'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useSWR from 'swr'
import { usePOSStore } from '@/lib/pos-store'

interface BrandEntry {
  brand: string
  count: number
  series: { name: string; count: number }[]
}

const BRANDS = [
  { id: 'grohe',     name: 'Grohe',     dbKey: 'GROHE',     color: '#009FE3' },
  { id: 'hansgrohe', name: 'Hansgrohe', dbKey: 'HANSGROHE', color: '#00529A' },
  { id: 'axor',      name: 'Axor',      dbKey: 'AXOR',      color: '#1C1C1E' },
  { id: 'vitra',     name: 'Vitra',     dbKey: 'VITRA',     color: '#E5002B' },
  { id: 'geberit',   name: 'Geberit',   dbKey: 'GEBERIT',   color: '#6B7280' },
  { id: 'kajaria',   name: 'Kajaria',   dbKey: 'KAJARIA',   color: '#F59E0B' },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<BrandEntry[]>

interface BrandSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function BrandSidebar({ collapsed, onToggle }: BrandSidebarProps) {
  const selectedBrand       = usePOSStore((s) => s.selectedBrand)
  const selectedCategory    = usePOSStore((s) => s.selectedCategory)
  const setSelectedBrand    = usePOSStore((s) => s.setSelectedBrand)
  const setSelectedCategory = usePOSStore((s) => s.setSelectedCategory)

  const { data: seriesData } = useSWR('/api/products/series', fetcher, {
    revalidateOnFocus: false,
  })

  const activeBrandEntry = React.useMemo(() => {
    if (!selectedBrand || !seriesData) return null
    const dbKey = BRANDS.find((b) => b.name === selectedBrand)?.dbKey
    return seriesData.find((e) => e.brand === dbKey) ?? null
  }, [selectedBrand, seriesData])

  const brandCount = (name: string) => {
    const dbKey = BRANDS.find((b) => b.name === name)?.dbKey
    return seriesData?.find((e) => e.brand === dbKey)?.count ?? null
  }

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

        {BRANDS.map((brand) => {
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
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px 6px',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
        {BRANDS.map((brand) => {
          const isActive = selectedBrand === brand.name
          const count    = brandCount(brand.name)
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
              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.62)', letterSpacing: '-0.01em' }}>
                {brand.name}
              </span>
              {count !== null && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Series section */}
      {selectedBrand && activeBrandEntry && activeBrandEntry.series.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0', flexShrink: 0 }} />
          <div style={{ padding: '0 14px 6px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            Series
          </div>

          {/* All button */}
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
            <span style={{ fontSize: 12, fontWeight: selectedCategory === null ? 600 : 400, color: selectedCategory === null ? '#fff' : 'rgba(255,255,255,0.52)' }}>
              All {selectedBrand}
            </span>
          </button>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeBrandEntry.series.map(({ name, count }) => {
              const isActive   = selectedCategory === name
              const brandColor = BRANDS.find((b) => b.name === selectedBrand)?.color ?? '#6B7280'
              return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 14px',
                    background: isActive
                      ? `${brandColor}22`
                      : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? `2px solid ${brandColor}` : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.52)', letterSpacing: '-0.01em' }}>
                    {name}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
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
