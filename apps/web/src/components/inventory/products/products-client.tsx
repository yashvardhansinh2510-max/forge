'use client'

import * as React from 'react'
import { Search, List, LayoutGrid, Circle, AlertTriangle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { InventoryNav } from '../shared/inventory-nav'
import { ProductTable } from './product-table'
import { ProductGrid } from './product-grid'
import { ProductBrandView } from './product-brand-view'
import { ProductSlideOver } from './product-slide-over'
import { AdjustStockModal } from './adjust-stock-modal'
import { products, type Product } from '@/lib/mock/inventory-data'

type ViewMode = 'list' | 'grid' | 'brand'
type TierFilter = 'all' | 'luxury' | 'premium' | 'mid'

const TIER_OPTIONS: { label: string; value: TierFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Premium', value: 'premium' },
  { label: 'Mid-Range', value: 'mid' },
]

export function ProductsClient() {
  const [search, setSearch] = React.useState('')
  const [view, setView] = React.useState<ViewMode>('list')
  const [tierFilter, setTierFilter] = React.useState<TierFilter>('all')
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = React.useState<Product | null>(null)

  const alertProducts = products.filter(
    (p) => p.status === 'low_stock' || p.status === 'out_of_stock',
  )

  const filtered = products.filter((p) => {
    const matchTier = tierFilter === 'all' || p.tier === tierFilter
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    return matchTier && matchSearch
  })

  const inStockCount = products.filter((p) => p.status === 'in_stock').length
  const lowStockCount = products.filter((p) => p.status === 'low_stock').length
  const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length

  const kpiTiles = [
    { label: 'Total SKUs', value: products.length, color: 'var(--text-primary)' },
    { label: 'In Stock', value: inStockCount, color: 'var(--text-primary)' },
    { label: 'Low Stock', value: lowStockCount, color: 'var(--text-primary)' },
    { label: 'Out of Stock', value: outOfStockCount, color: 'var(--negative)' },
  ]

  const actions = (
    <Button size="sm" onClick={() => toast.success('Add product coming soon')}>
      <Plus size={14} className="mr-1.5" />
      Add Product
    </Button>
  )

  return (
    <PageContainer
      title="Inventory"
      subtitle={`${products.length} products · ${filtered.length} shown`}
      actions={actions}
    >
      <InventoryNav />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {kpiTiles.map((tile) => (
          <div
            key={tile.label}
            style={{
              flex: '1 1 120px',
              background: 'var(--surface)',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: 'var(--shadow-base)',
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: tile.color,
                letterSpacing: '-0.04em',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {tile.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {tile.label}
            </div>
          </div>
        ))}
      </div>

      {/* Low Stock Intelligence Banner */}
      {alertProducts.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--r-md)',
            padding: '12px 16px',
            marginBottom: 16,
            boxShadow: 'var(--shadow-base)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: alertProducts.length > 0 ? 10 : 0,
            }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {alertProducts.length} product{alertProducts.length !== 1 ? 's' : ''} need attention
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertProducts.slice(0, 3).map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                    flexShrink: 0,
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: p.status === 'out_of_stock' ? 'var(--negative)' : 'var(--caution)',
                    fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {p.totalStock} {p.unit}
                </span>
                <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  · reorder at {p.reorderPoint}
                </span>
                <button
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    marginLeft: 'auto',
                    flexShrink: 0,
                    height: 22,
                    padding: '0 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Order
                </button>
              </div>
            ))}
            {alertProducts.length > 3 && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>
                +{alertProducts.length - 3} more out of stock &rarr;{' '}
                <button
                  onClick={() => setTierFilter('all')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                    textDecoration: 'underline',
                  }}
                >
                  View all
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 32,
              padding: '0 10px 0 30px',
              fontSize: 13,
              border: '1px solid var(--border)',
              borderRadius: 6,
              outline: 'none',
              background: 'var(--surface)',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Tier filter pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTierFilter(opt.value)}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 6,
                border: tierFilter === opt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: tierFilter === opt.value ? 'var(--accent-light)' : 'var(--surface)',
                color: tierFilter === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: tierFilter === opt.value ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 120ms',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View switcher — segmented control */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            background: 'var(--n-100)',
            borderRadius: 8,
            padding: 2,
            gap: 1,
          }}
        >
          {(
            [
              { value: 'list' as const, icon: List, label: 'List' },
              { value: 'grid' as const, icon: LayoutGrid, label: 'Grid' },
              { value: 'brand' as const, icon: Circle, label: 'Brand' },
            ] as const
          ).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 30,
                padding: '0 12px',
                borderRadius: 6,
                border: 'none',
                background: view === value ? 'var(--accent)' : 'transparent',
                color: view === value ? 'white' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {view === 'list' && (
        <ProductTable data={filtered} globalFilter={search} onRowClick={setSelectedProduct} />
      )}
      {view === 'grid' && (
        <ProductGrid data={filtered} onCardClick={setSelectedProduct} />
      )}
      {view === 'brand' && (
        <ProductBrandView data={filtered} onProductClick={setSelectedProduct} />
      )}

      <ProductSlideOver
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdjust={(p) => {
          setSelectedProduct(null)
          setAdjustProduct(p)
        }}
      />

      <AdjustStockModal
        product={adjustProduct}
        onClose={() => setAdjustProduct(null)}
      />
    </PageContainer>
  )
}
