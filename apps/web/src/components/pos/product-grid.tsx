'use client'

import * as React from 'react'
import { Search, X, Plus } from 'lucide-react'
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

// ─── Highlight helper ─────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(251,191,36,0.35)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product, onClick, offerDiscount,
}: {
  product: POSProduct
  onClick: () => void
  offerDiscount: number
}) {
  const tier = TIER_COLORS[product.tier] ?? TIER_COLORS.mid!
  const bg   = BRAND_BG[product.brand] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'
  const offerPrice = offerDiscount > 0 ? product.mrp * (1 - offerDiscount / 100) : null

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

        {/* Price row: MRP + offer if discount active */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{
            fontSize: offerPrice ? 11 : 14,
            fontWeight: offerPrice ? 400 : 700,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: offerPrice ? 'var(--text-muted)' : 'var(--text-primary)',
            letterSpacing: '-0.02em',
            textDecoration: offerPrice ? 'line-through' : 'none',
          }}>
            {formatINR(product.mrp)}
            <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>MRP</span>
          </span>
          {offerPrice && (
            <span style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              color: '#15803d', letterSpacing: '-0.02em',
            }}>
              {formatINR(offerPrice)}
            </span>
          )}
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

// ─── Search types ─────────────────────────────────────────────────────────────

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

type SearchApiResponse = { products: SearchApiItem[] }

type MatchField = 'sku' | 'article' | 'name' | 'series'

function detectMatchField(item: SearchApiItem, query: string): MatchField {
  const q = query.toLowerCase()
  if (item.sku.toLowerCase().includes(q) || item.articleNumber.toLowerCase().includes(q)) return 'sku'
  if (item.seriesName?.toLowerCase().includes(q)) return 'series'
  return 'name'
}

const MATCH_LABELS: Record<MatchField, { label: string; bg: string; color: string }> = {
  sku:    { label: 'SKU',    bg: 'rgba(99,102,241,0.12)',  color: '#4338ca' },
  article:{ label: 'Article',bg: 'rgba(99,102,241,0.12)',  color: '#4338ca' },
  series: { label: 'Series', bg: 'rgba(16,185,129,0.12)',  color: '#047857' },
  name:   { label: 'Name',   bg: 'rgba(107,114,128,0.08)', color: '#4b5563' },
}

const BRAND_NAME_MAP: Record<string, string> = {
  GROHE: 'Grohe', HANSGROHE: 'Hansgrohe', AXOR: 'Axor',
  VITRA: 'Vitra', GEBERIT: 'Geberit', OTHER: 'Other',
}
const BRAND_COLORS: Record<string, string> = {
  Grohe: '#009FE3', Hansgrohe: '#00529A', Axor: '#1C1C1E',
  Vitra: '#E5002B', Geberit: '#6B7280', Other: '#4B5563',
}

function POSSearch({
  onSelect, catalogProducts, globalDiscount,
}: {
  onSelect: (product: POSProduct) => void
  catalogProducts: POSProduct[]
  globalDiscount: number
}) {
  const catalogById = React.useMemo(
    () => new Map(catalogProducts.map((p) => [p.id, p])),
    [catalogProducts],
  )
  const [query, setQuery]           = React.useState('')
  const [results, setResults]       = React.useState<SearchApiItem[]>([])
  const [isOpen, setIsOpen]         = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(false)
  const [activeIdx, setActiveIdx]   = React.useState(-1)
  const containerRef                = React.useRef<HTMLDivElement>(null)
  const inputRef                    = React.useRef<HTMLInputElement>(null)
  const listRef                     = React.useRef<HTMLDivElement>(null)
  const debounceRef                 = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
        const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=30`)
        if (!res.ok) return
        const data = await res.json() as SearchApiResponse
        const items = data.products ?? []
        // Exact SKU/article match → top
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
    const fullProduct = catalogById.get(item.id)
    if (fullProduct) {
      onSelect(fullProduct)
      setQuery('')
      setIsOpen(false)
      return
    }
    const brandName = BRAND_NAME_MAP[item.brand] ?? item.brand
    const posProduct: POSProduct = {
      id: item.id, sku: item.sku, articleNumber: item.articleNumber,
      name: item.name, description: '',
      brand: brandName, brandColor: BRAND_COLORS[brandName] ?? '#4B5563',
      category: '', subCategory: item.seriesName ?? '',
      subcategoryLabel: '', seriesName: item.seriesName ?? undefined,
      mrp: item.mrp, gstRate: 18, unit: 'pcs', tier: 'premium',
      finishes: [{ name: 'Chrome', code: '000', sku: item.sku, color: '#B0B7BC', priceAdj: 0 }],
      defaultFinish: 'Chrome', requiresPartIds: [], isConcealed: false, features: [],
      imageUrl: item.imageUrl ?? undefined,
    }
    onSelect(posProduct)
    setQuery('')
    setIsOpen(false)
  }

  const displayResults = results // show all, dropdown is scrollable

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 28, paddingInline: 8,
        border: '1px solid var(--border)',
        borderRadius: 7, background: 'var(--surface)',
        width: 240,
        transition: 'border-color 150ms',
      }}>
        <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder="Search article, name, SKU, series…"
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

      {isOpen && displayResults.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            width: 400,
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            zIndex: 50,
            maxHeight: 360,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {displayResults.map((item, idx) => {
              const brandName   = BRAND_NAME_MAP[item.brand] ?? item.brand
              const bg          = BRAND_BG[brandName] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'
              const matchField  = detectMatchField(item, query)
              const matchConfig = MATCH_LABELS[matchField]
              const isActive    = idx === activeIdx
              const offerPrice  = globalDiscount > 0 ? item.mrp * (1 - globalDiscount / 100) : null

              return (
                <button
                  key={item.id}
                  onMouseDown={() => selectResult(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 12px',
                    border: 'none', textAlign: 'left', cursor: 'pointer',
                    background: isActive ? 'var(--surface-tint)' : 'transparent',
                    transition: 'background 80ms',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--surface-tint)' : 'transparent' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        <Highlight text={item.name} query={matchField === 'name' ? query : ''} />
                      </div>
                      {/* Match source badge */}
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                        background: matchConfig.bg, color: matchConfig.color,
                        letterSpacing: '0.04em', flexShrink: 0,
                      }}>
                        {matchConfig.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                        <Highlight text={item.articleNumber} query={matchField === 'sku' || matchField === 'article' ? query : ''} />
                      </span>
                      {item.seriesName && (
                        <span style={{ opacity: 0.7 }}>
                          · <Highlight text={item.seriesName} query={matchField === 'series' ? query : ''} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
                    <div style={{
                      fontSize: offerPrice ? 10 : 12, fontWeight: 600,
                      color: offerPrice ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                      textDecoration: offerPrice ? 'line-through' : 'none',
                    }}>
                      {formatINR(item.mrp)}
                    </div>
                    {offerPrice && (
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: '#15803d',
                        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {formatINR(offerPrice)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} — click to configure &amp; add
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export function ProductGrid() {
  const selectedBrand    = usePOSStore((s) => s.selectedBrand)
  const selectedCategory = usePOSStore((s) => s.selectedCategory)
  const selectedTier     = usePOSStore((s) => s.selectedTier)
  const globalDiscount   = usePOSStore((s) => s.project.globalDiscount)
  const openModal        = usePOSStore((s) => s.openModal)
  const openCustomModal  = usePOSStore((s) => s.openCustomModal)
  const selectedSeries   = usePOSSeriesStore((s) => s.selectedSeries)
  const { products: catalogProducts, isLoading, error, mutate } = usePOSCatalog()

  const products = React.useMemo(() => {
    let list = catalogProducts.filter((p) => !p.isConcealed)
    if (selectedBrand)    list = list.filter((p) => p.brand === selectedBrand)
    if (selectedCategory) list = list.filter((p) => p.subcategoryLabel === selectedCategory)
    if (selectedSeries)   list = list.filter((p) => p.subCategory === selectedSeries)
    if (selectedTier)     list = list.filter((p) => p.tier === selectedTier)
    return list
  }, [catalogProducts, selectedBrand, selectedCategory, selectedSeries, selectedTier])

  const activeFilterCount = [selectedCategory, selectedSeries, selectedTier].filter(Boolean).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--surface)' }}>
      <style>{`@keyframes pos-pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      {/* Filter bar */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', paddingInline: 16, gap: 8,
        borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--background)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {isLoading ? 'Loading catalog…' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
          {selectedBrand && ` · ${selectedBrand}`}
          {selectedCategory && ` · ${selectedCategory}`}
          {selectedSeries && ` · ${selectedSeries}`}
          {selectedTier && ` · ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`}
        </span>
        {!isLoading && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— click to configure &amp; add</span>
        )}
        {/* Active filter count bubble */}
        {activeFilterCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
            background: 'rgba(99,102,241,0.12)', color: '#4338ca',
          }}>
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={openCustomModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 28, paddingInline: 10,
            border: '1px solid var(--border)',
            borderRadius: 7,
            background: 'var(--surface)',
            cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-secondary)',
            transition: 'border-color 150ms, color 150ms, background 150ms',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#1d4ed8'
            e.currentTarget.style.color = '#1d4ed8'
            e.currentTarget.style.background = 'rgba(29,78,216,0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'var(--surface)'
          }}
        >
          <Plus size={11} />
          Custom
        </button>
        <POSSearch
          onSelect={openModal}
          catalogProducts={catalogProducts}
          globalDiscount={globalDiscount}
        />
      </div>

      {/* Product grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 14,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
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
            <span style={{ fontSize: 13 }}>No products match the current filters</span>
            <span style={{ fontSize: 11 }}>Try selecting a different brand, category, or tier from the left panel</span>
          </div>
        ) : (
          products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => openModal(p)}
              offerDiscount={globalDiscount}
            />
          ))
        )}
      </div>
    </div>
  )
}
