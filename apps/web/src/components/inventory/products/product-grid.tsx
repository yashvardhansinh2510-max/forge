'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { StockBadge, TierBadge } from '../shared/stock-badge'
import { ProductImage } from '../shared/product-image'
import { formatINR } from '@/lib/mock/sales-data'
import { type Product } from '@/lib/mock/inventory-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

interface ProductGridProps {
  data: Product[]
  onCardClick: (product: Product) => void
}

function stockQtyColor(status: Product['status']): string {
  if (status === 'in_stock') return 'var(--positive)'
  if (status === 'low_stock') return 'var(--caution)'
  return 'var(--negative)'
}

function ProductCard({
  product,
  index,
  onClick,
}: {
  product: Product
  index: number
  onClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: APPLE_EASE, delay: index * 0.04 }}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-base)',
        transition: 'box-shadow 180ms, transform 180ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-raised)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-base)'
        el.style.transform = ''
      }}
    >
      {/* Product image header area */}
      <div style={{ position: 'relative', height: 160, background: 'var(--n-100)' }}>
        <ProductImage subCategory={product.subCategory} name={product.name} size="lg" fullWidth />
        {/* Status dot — top right */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: product.status === 'in_stock' ? 'var(--positive)' : product.status === 'low_stock' ? 'var(--caution)' : 'var(--negative)',
          }} />
        </div>
        {/* Tier badge — top left (only for luxury/premium) */}
        {product.tier !== 'mid' && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <TierBadge tier={product.tier} />
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginBottom: 3,
          }}
        >
          {product.brand}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 540,
            color: 'var(--text-primary)',
            lineHeight: '18px',
            marginBottom: 3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            marginBottom: 10,
          }}
        >
          {product.sku}
        </div>

        {/* Bottom row: price + stock count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {formatINR(product.unitPrice)}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              color: stockQtyColor(product.status),
            }}
          >
            {product.totalStock} {product.unit}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function ProductGrid({ data, onCardClick }: ProductGridProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--text-tertiary)',
        }}
      >
        No products found
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {data.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          index={i}
          onClick={() => onCardClick(product)}
        />
      ))}
    </div>
  )
}
