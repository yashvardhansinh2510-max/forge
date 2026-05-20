'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { usePOSStore } from '@/lib/pos-store'
import { useProducts, type ProductApiItem, mapToPOSProduct } from '@/lib/pos-catalog'
import type { POSProduct } from '@/lib/mock/pos-data'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const TIER_LABELS: Record<string, string> = {
  luxury:  'Luxury',
  premium: 'Premium',
  mid:     'Mid',
}

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  luxury:  { bg: 'rgba(212,175,55,0.15)',  text: '#92700A' },
  premium: { bg: 'rgba(99,102,241,0.12)',  text: '#4338CA' },
  mid:     { bg: 'rgba(107,114,128,0.10)', text: '#4B5563' },
}

const BRAND_BG: Record<string, string> = {
  'Grohe':     'linear-gradient(135deg, #009FE3 0%, #0077B6 100%)',
  'Hansgrohe': 'linear-gradient(135deg, #00529A 0%, #003f7a 100%)',
  'Axor':      'linear-gradient(135deg, #1C1C1E 0%, #3a3a3c 100%)',
  'Vitra':     'linear-gradient(135deg, #E5002B 0%, #b0001f 100%)',
  'Geberit':   'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
  'Kajaria':   'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    'Showers':      '🚿',
    'Basin Mixers': '🚰',
    'Thermostats':  '🌡️',
    'WCs':          '🚽',
    'Basins':       '🫧',
    'Bath Mixers':  '🛁',
    'Kitchen':      '🍳',
    'Accessories':  '🔩',
  }
  return <span style={{ fontSize: 28 }}>{icons[category] ?? '📦'}</span>
}

function ProductCard({ product, onClick }: { product: POSProduct; onClick: () => void }) {
  const tier = TIER_COLORS[product.tier] ?? TIER_COLORS.mid!
  const bg   = BRAND_BG[product.brand] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        background: 'var(--background)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 0, cursor: 'pointer', textAlign: 'left',
        overflow: 'hidden', transition: 'box-shadow 0.12s, transform 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow   = '0 4px 16px rgba(0,0,0,0.10)'
        e.currentTarget.style.transform   = 'translateY(-1px)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow   = 'none'
        e.currentTarget.style.transform   = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ background: bg, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
        <CategoryIcon category={product.category} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.20)', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', backdropFilter: 'blur(2px)' }}>
            {product.brand.toUpperCase()}
          </span>
          <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 500, background: tier.bg, color: tier.text }}>
            {TIER_LABELS[product.tier]}
          </span>
        </div>
      </div>

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {product.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.subCategory}</div>

        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: 2 }}>
          {formatINR(product.mrp)}
          <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>MRP</span>
        </div>

        {product.finishes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
            {product.finishes.slice(0, 6).map((f) => (
              <div key={f.code} title={f.name} style={{ width: 11, height: 11, borderRadius: '50%', background: f.color, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
            ))}
            {product.finishes.length > 6 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{product.finishes.length - 6}</span>
            )}
          </div>
        )}

        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
          {product.articleNumber ?? product.sku}
        </div>
      </div>
    </button>
  )
}

// ─── Search autocomplete ───────────────────────────────────────────────────────

function POSSearch() {
  const openModal = usePOSStore((s) => s.openModal)
  const [query,    setQuery]    = React.useState('')
  const [results,  setResults]  = React.useState<POSProduct[]>([])
  const [open,     setOpen]     = React.useState(false)
  const [loading,  setLoading]  = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) { setResults([]); setOpen(false); return }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}&limit=20`)
        const json = await res.json() as { products: ProductApiItem[] }
        const mapped = (json.products ?? []).map(mapToPOSProduct)
        // Exact SKU match first
        mapped.sort((a, b) => {
          const aExact = a.sku.toLowerCase() === trimmed.toLowerCase() ? -1 : 0
          const bExact = b.sku.toLowerCase() === trimmed.toLowerCase() ? -1 : 0
          return aExact - bExact
        })
        setResults(mapped)
        setOpen(true)
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }, 250)
  }, [query])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, article, or series…"
          style={{
            width: 220, fontSize: 12, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
          }}
          onFocus={() => { if (results.length) setOpen(true) }}
        />
        {loading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>…</span>}
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            width: 360, maxHeight: 360, overflowY: 'auto',
            background: 'var(--background)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            zIndex: 40,
          }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => { openModal(p); setQuery(''); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>📦</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  Article {p.articleNumber ?? p.sku}
                  {p.seriesName && ` · ${p.seriesName}`}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', flexShrink: 0 }}>
                {formatINR(p.mrp)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Product Grid ──────────────────────────────────────────────────────────────

export function ProductGrid() {
  const selectedBrand    = usePOSStore((s) => s.selectedBrand)
  const selectedCategory = usePOSStore((s) => s.selectedCategory)
  const openModal        = usePOSStore((s) => s.openModal)

  const { products, isLoading, error } = useProducts({
    brand:  selectedBrand,
    series: selectedCategory,
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--surface)' }}>
      {/* Filter bar */}
      <div
        style={{
          height: 40, display: 'flex', alignItems: 'center',
          paddingInline: 16, gap: 8,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--background)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {isLoading ? '…' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
          {selectedBrand    && ` · ${selectedBrand}`}
          {selectedCategory && ` · ${selectedCategory}`}
        </span>
        {!isLoading && !error && products.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— click to configure &amp; add</span>
        )}
        <div style={{ flex: 1 }} />
        <POSSearch />
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gridAutoRows: 'max-content',
          gap: 9, alignContent: 'start',
        }}
      >
        {error ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 8 }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <span style={{ fontSize: 13 }}>Failed to load products</span>
          </div>
        ) : isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', height: 160, background: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 8 }}>
            <span style={{ fontSize: 32 }}>📦</span>
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
