'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TierBadge } from '../shared/stock-badge'
import { ProductImage } from '../shared/product-image'
import { formatINR } from '@/lib/mock/sales-data'
import { BRANDS, type Product, type ProductTier } from '@/lib/mock/inventory-data'

interface ProductBrandViewProps {
  data: Product[]
  onProductClick: (product: Product) => void
}

const ORIGIN_FLAGS: Record<string, string> = {
  Germany: '🇩🇪',
  Turkey: '🇹🇷',
  USA: '🇺🇸',
  India: '🇮🇳',
  Italy: '🇮🇹',
  UAE: '🇦🇪',
  Switzerland: '🇨🇭',
}

function getBrandInfo(brandName: string) {
  const entry = Object.values(BRANDS).find((b) => b.name === brandName)
  return entry ?? { name: brandName, color: '#8E8E93', origin: 'India', tier: 'mid' as ProductTier }
}

function formatStockValue(products: Product[]): string {
  const total = products.reduce((sum, p) => sum + p.totalStock * p.unitPrice, 0)
  if (total >= 10_00_000) return `₹${(total / 10_00_000).toFixed(1)}L`
  if (total >= 1_000) return `₹${(total / 1_000).toFixed(1)}K`
  return `₹${total}`
}

function stockQtyColor(status: Product['status']): string {
  if (status === 'in_stock') return 'var(--positive)'
  if (status === 'low_stock') return 'var(--caution)'
  return 'var(--negative)'
}

function MiniProductCard({
  product,
  onClick,
}: {
  product: Product
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 200,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-base)',
        cursor: 'pointer',
        transition: 'box-shadow 180ms, transform 180ms',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-raised)'
        el.style.transform = 'translateY(-0.5px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-base)'
        el.style.transform = ''
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px' }}>
        <ProductImage subCategory={product.subCategory} name={product.name} size="xs" />
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 550,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 2,
            }}
          >
            {product.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            }}
          >
            {product.sku}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 10px' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: stockQtyColor(product.status),
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {product.totalStock} {product.unit}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {formatINR(product.unitPrice)}
        </span>
      </div>
    </div>
  )
}

function BrandSection({
  brandName,
  brandProducts,
  onProductClick,
}: {
  brandName: string
  brandProducts: Product[]
  onProductClick: (product: Product) => void
}) {
  const [collapsed, setCollapsed] = React.useState(false)
  const brand = getBrandInfo(brandName)
  const flag = ORIGIN_FLAGS[brand.origin] ?? '🌐'
  const stockValue = formatStockValue(brandProducts)

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Brand header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderLeft: '4px solid var(--n-200)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          paddingLeft: 12,
          marginBottom: 12,
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {brandName}
        </span>

        <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--text-muted)' }}>{flag}</span>

        <TierBadge tier={brand.tier} />

        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          {brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} · {stockValue} stock value
        </span>

        <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 8,
                paddingLeft: 16,
              }}
            >
              {brandProducts.map((p) => (
                <MiniProductCard key={p.id} product={p} onClick={() => onProductClick(p)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProductBrandView({ data, onProductClick }: ProductBrandViewProps) {
  const brandGroups = React.useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of data) {
      const existing = map.get(p.brand) ?? []
      existing.push(p)
      map.set(p.brand, existing)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [data])

  if (brandGroups.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)' }}>
        No products found
      </div>
    )
  }

  return (
    <div>
      {brandGroups.map(([brandName, brandProducts]) => (
        <BrandSection
          key={brandName}
          brandName={brandName}
          brandProducts={brandProducts}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  )
}
