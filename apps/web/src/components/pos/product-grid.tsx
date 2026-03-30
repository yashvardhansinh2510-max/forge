'use client'

import * as React from 'react'
import { usePOSStore } from '@/lib/pos-store'
import { POS_PRODUCTS } from '@/lib/mock/pos-data'
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

// Map brand to a clean color swatch for the card header
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
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        transition: 'box-shadow 0.12s, transform 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow    = '0 4px 16px rgba(0,0,0,0.10)'
        e.currentTarget.style.transform    = 'translateY(-1px)'
        e.currentTarget.style.borderColor  = 'rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow    = 'none'
        e.currentTarget.style.transform    = 'translateY(0)'
        e.currentTarget.style.borderColor  = 'var(--border)'
      }}
    >
      {/* Brand color header strip */}
      <div
        style={{
          background: bg,
          padding: '14px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          position: 'relative',
        }}
      >
        <CategoryIcon category={product.category} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.20)',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.04em',
              backdropFilter: 'blur(2px)',
            }}
          >
            {product.brand.toUpperCase()}
          </span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 500,
              background: tier.bg,
              color: tier.text,
            }}
          >
            {TIER_LABELS[product.tier]}
          </span>
        </div>
      </div>

      {/* Info body */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.subCategory}</div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginTop: 2,
          }}
        >
          {formatINR(product.mrp)}
          <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>MRP</span>
        </div>

        {/* Finish swatches */}
        {product.finishes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
            {product.finishes.slice(0, 6).map((f) => (
              <div
                key={f.code}
                title={f.name}
                style={{
                  width: 11, height: 11,
                  borderRadius: '50%',
                  background: f.color,
                  border: '1px solid rgba(0,0,0,0.12)',
                  flexShrink: 0,
                }}
              />
            ))}
            {product.finishes.length > 6 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{product.finishes.length - 6}</span>
            )}
          </div>
        )}

        {product.isConcealed && (
          <span
            style={{
              fontSize: 9, fontWeight: 600,
              background: 'rgba(107,114,128,0.10)',
              color: '#6B7280',
              padding: '1px 6px',
              borderRadius: 999,
              alignSelf: 'flex-start',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginTop: 2,
            }}
          >
            Concealed
          </span>
        )}
      </div>
    </button>
  )
}

export function ProductGrid() {
  const selectedBrand    = usePOSStore((s) => s.selectedBrand)
  const selectedCategory = usePOSStore((s) => s.selectedCategory)
  const openModal        = usePOSStore((s) => s.openModal)

  const products = React.useMemo(() => {
    let list = POS_PRODUCTS.filter((p) => !p.isConcealed)
    if (selectedBrand)    list = list.filter((p) => p.brand === selectedBrand)
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory)
    return list
  }, [selectedBrand, selectedCategory])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--surface)',
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          gap: 8,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--background)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {products.length} {products.length === 1 ? 'product' : 'products'}
          {selectedBrand && ` · ${selectedBrand}`}
          {selectedCategory && ` · ${selectedCategory}`}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          — click to configure &amp; add
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gridAutoRows: 'max-content',
          gap: 9,
          alignContent: 'start',
        }}
      >
        {products.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
              color: 'var(--text-muted)',
              gap: 8,
            }}
          >
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
