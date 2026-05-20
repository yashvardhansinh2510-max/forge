'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { usePOSStore } from '@/lib/pos-store'
import { usePOSCatalog } from '@/lib/pos-catalog'
import { usePOSSeriesStore } from '@/lib/pos-series-store'
import type { POSProduct } from '@/lib/mock/pos-data'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  luxury:  { bg: 'rgba(212,175,55,0.15)',  text: '#92700A' },
  premium: { bg: 'rgba(99,102,241,0.12)',  text: '#4338CA' },
  mid:     { bg: 'rgba(107,114,128,0.10)', text: '#4B5563' },
}

const BRAND_BG: Record<string, string> = {
  Grohe:      'linear-gradient(135deg, #009FE3 0%, #0077B6 100%)',
  Hansgrohe:  'linear-gradient(135deg, #00529A 0%, #003f7a 100%)',
  Axor:       'linear-gradient(135deg, #1C1C1E 0%, #3a3a3c 100%)',
  Vitra:      'linear-gradient(135deg, #E5002B 0%, #b0001f 100%)',
  Geberit:    'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
}

function ProductCard({ product, onClick }: { product: POSProduct; onClick: () => void }) {
  const tier = TIER_COLORS[product.tier] ?? TIER_COLORS.mid!
  const bg   = BRAND_BG[product.brand] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        width: '100%',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: 12, padding: 0,
        cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
        transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow   = '0 6px 24px rgba(0,0,0,0.13)'
        e.currentTarget.style.transform   = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ background: bg, width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16, background: 'rgba(255,255,255,0.92)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.9 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.82)', letterSpacing: '-0.03em' }}>
              {product.brand.slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>
              {product.brand}
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
          {product.brand.toUpperCase()}
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 600, background: tier.bg, color: tier.text, backdropFilter: 'blur(4px)' }}>
          {product.tier === 'luxury' ? 'Luxury' : product.tier === 'premium' ? 'Premium' : 'Mid'}
        </div>
      </div>

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {product.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
          {product.articleNumber ?? product.sku}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: 2 }}>
          {formatINR(product.mrp)}
          <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>MRP</span>
        </div>
        {product.finishes.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {product.finishes.slice(0, 6).map((f) => (
              <div key={f.code} title={f.name} style={{ width: 11, height: 11, borderRadius: '50%', background: f.color, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
            ))}
            {product.finishes.length > 6 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{product.finishes.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Search types ──────────────────────────────────────────────────────────────

type SearchApiItem = {
  id: string
  sku: string
  articleNumber: string
  name: string
  brand: string
  mrp: number
  imageUrl: string | null
  seriesName: string | null
}

type SearchApiResponse = {
  products: SearchApiItem[]
}

function POSSearch({ onSelect }: { onSelect: (product: POSProduct) => void }) {
  const [query, setQuery]               = React.useState('')
  const [results, setResults]           = React.useState<SearchApiItem[]>([])
  const [isOpen, setIsOpen]             = React.useState(false)
  const [isFetching, setIsFetching]     = React.useState(false)
  const [activeIdx, setActiveIdx]       = React.useState(-1)
  const containerRef                    = React.useRef<HTMLDivElement>(null)
  const inputRef                        = React.useRef<HTMLInputElement>(null)
  const debounceRef                     = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const BRAND_NAME_MAP: Record<string, string> = {
    GROHE: 'Grohe', HANSGROHE: 'Hansgrohe', AXOR: 'Axor',
    VITRA: 'Vitra', GEBERIT: 'Geberit', OTHER: 'Other',
  }
  const BRAND_COLORS: Record<string, string> = {
    Grohe: '#009FE3', Hansgrohe: '#00529A', Axor: '#1C1C1E',
    Vitra: '#E5002B', Geberit: '#6B7280', Other: '#4B5563',
  }

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setIsOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=20`)
        if (!res.ok) return
        const data = await res.json() as SearchApiResponse
        const items = data.products ?? []
        // Exact SKU/article matches bubble to top
        const q = query.trim().toLowerCase()
        items.sort((a, b) => {
          const aExact = a.sku.toLowerCase() === q || a.articleNumber.toLowerCase() === q ? 0 : 1
          const bExact = b.sku.toLowerCase() === q || b.articleNumber.toLowerCase() === q ? 0 : 1
          return aExact - bExact
        })
        setResults(items)
        setIsOpen(items.length > 0)
        setActiveIdx(-1)
      } finally {
        setIsFetching(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectResult(results[activeIdx]!) }
    if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur() }
  }

  function selectResult(item: SearchApiItem) {
    const brandName = BRAND_NAME_MAP[item.brand] ?? item.brand
    const posProduct: POSProduct = {
      id:             item.id,
      sku:            item.sku,
      articleNumber:  item.articleNumber,
      name:           item.name,
      description:    '',
      brand:          brandName,
      brandColor:     BRAND_COLORS[brandName] ?? '#4B5563',
      category:       '',
      subCategory:    item.seriesName ?? '',
      seriesName:     item.seriesName ?? undefined,
      mrp:            item.mrp,
      gstRate:        18,
      unit:           'pcs',
      tier:           'premium',
      finishes:       [{ name: 'Standard', code: 'STD', color: '#C8D0D8', priceAdj: 0 }],
      defaultFinish:  'Standard',
      requiresPartIds: [],
      isConcealed:    false,
      features:       [],
      imageUrl:       item.imageUrl ?? undefined,
    }
    onSelect(posProduct)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 28, paddingInline: 8,
        border: '1px solid var(--border)',
        borderRadius: 7, background: 'var(--surface)',
        width: 220,
        transition: 'border-color 150ms',
      }}>
        <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder="Search article, name, series…"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 11, color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false) }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}
          >
            <X size={11} />
          </button>
        )}
        {isFetching && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--border)', borderTopColor: 'var(--text-secondary)', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          width: 360,
          background: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden',
          zIndex: 50,
        }}>
          {results.slice(0, 10).map((item, idx) => {
            const brandName = BRAND_NAME_MAP[item.brand] ?? item.brand
            const bg = BRAND_BG[brandName] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'
            return (
              <button
                key={item.id}
                onMouseDown={() => selectResult(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: idx === activeIdx ? 'var(--surface-tint)' : 'transparent',
                  transition: 'background 80ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = idx === activeIdx ? 'var(--surface-tint)' : 'transparent' }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 36, height: 36, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, background: 'rgba(255,255,255,0.9)' }} />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>
                      {brandName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    Article&nbsp;
                    <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.articleNumber}
                    </span>
                    {item.seriesName && (
                      <span style={{ marginLeft: 6, color: 'var(--text-muted)', opacity: 0.7 }}>· {item.seriesName}</span>
                    )}
                  </div>
                </div>
                {/* Price */}
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatINR(item.mrp)}
                </div>
              </button>
            )
          })}
          {results.length > 10 && (
            <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              +{results.length - 10} more — type more to narrow down
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Main grid ─────────────────────────────────────────────────────────────────

export function ProductGrid() {
  const selectedBrand    = usePOSStore((s) => s.selectedBrand)
  const selectedCategory = usePOSStore((s) => s.selectedCategory)
  const openModal        = usePOSStore((s) => s.openModal)
  const selectedSeries   = usePOSSeriesStore((s) => s.selectedSeries)
  const { products: catalogProducts, isLoading, error, mutate } = usePOSCatalog()

  const products = React.useMemo(() => {
    let list = catalogProducts.filter((p) => !p.isConcealed)
    if (selectedBrand)    list = list.filter((p) => p.brand === selectedBrand)
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory)
    if (selectedSeries)   list = list.filter((p) => p.subCategory === selectedSeries)
    return list
  }, [catalogProducts, selectedBrand, selectedCategory, selectedSeries])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--surface)' }}>
      <style>{`@keyframes pos-pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      {/* Filter + search bar */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', paddingInline: 16, gap: 8,
        borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--background)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {isLoading ? 'Loading catalog…' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
          {selectedBrand && ` · ${selectedBrand}`}
          {selectedCategory && ` · ${selectedCategory}`}
          {selectedSeries && ` · ${selectedSeries}`}
        </span>
        {!isLoading && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— click to configure &amp; add</span>
        )}
        <div style={{ flex: 1 }} />
        <POSSearch onSelect={openModal} />
      </div>

      {/* Product grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 14,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gridAutoRows: 'max-content', gap: 12, alignContent: 'start',
      }}>
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: 260, borderRadius: 12, background: 'var(--surface)', animation: 'pos-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
          ))
        ) : error ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Failed to load products</span>
            <button
              onClick={() => mutate()}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 8 }}>
            <span style={{ fontSize: 13 }}>No products found</span>
            <span style={{ fontSize: 11 }}>Select a brand from the left to browse</span>
          </div>
        ) : (
          products.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => openModal(p)} />
          ))
        )}
      </div>
    </div>
  )
}
