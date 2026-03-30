'use client'

import * as React from 'react'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import type { POSProduct } from '@/lib/mock/pos-data'
import { BRAND_COLORS } from '@/lib/mock/procurement-data'

interface StockBadgeProps {
  physical: number
  committed: number
  onOrder: number
}

function StockBadge({ physical, committed, onOrder }: StockBadgeProps) {
  const available = physical - committed
  const color = available > 0 ? '#16A34A' : available === 0 ? '#D97706' : '#DC2626'
  const bg    = available > 0 ? 'rgba(34,197,94,0.10)' : available === 0 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: bg, color, fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}>
      <span>{available > 0 ? `${available} avail` : available === 0 ? 'low stock' : 'overcommitted'}</span>
      {onOrder > 0 && (
        <span style={{ opacity: 0.7 }}>· {onOrder} on order</span>
      )}
    </div>
  )
}

interface ProductPurchaseCardProps {
  product:         POSProduct
  stock?:          { physical: number; committed: number; onOrder: number; available: number }
  clientOfferRate?: number   // from linked quotation (PROJECT mode)
  roomName?:        string
  mode:            'PROJECT_LINKED' | 'BULK_COMPANY'
  onAdd:           (product: POSProduct, qty: number, landingCost: number | null) => void
}

export function ProductPurchaseCard({
  product,
  stock,
  clientOfferRate,
  roomName,
  mode,
  onAdd,
}: ProductPurchaseCardProps) {
  const [qty, setQty]               = React.useState(1)
  const [landingCost, setLandingCost] = React.useState<string>('')
  const [added, setAdded]           = React.useState(false)

  const brandColor = BRAND_COLORS[product.brand.toUpperCase()] ?? '#888'
  const margin = clientOfferRate && landingCost
    ? Math.round(((clientOfferRate - Number(landingCost)) / clientOfferRate) * 100)
    : null

  function handleAdd() {
    onAdd(product, qty, landingCost ? Number(landingCost) : null)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div style={{
      background: 'var(--background)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Brand stripe + stock */}
      <div style={{
        height: 3, background: brandColor, flexShrink: 0,
      }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px 0',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: brandColor, fontFamily: 'var(--font-ui)',
          textTransform: 'uppercase',
        }}>
          {product.brand}
        </span>
        {stock && (
          <StockBadge physical={stock.physical} committed={stock.committed} onOrder={stock.onOrder} />
        )}
      </div>

      {/* Product image / emoji */}
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)', margin: '8px 12px 0', borderRadius: 6,
        fontSize: 48, userSelect: 'none',
      }}>
        {product.emoji}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 0', flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', lineHeight: 1.3,
          marginBottom: 2,
        }}>
          {product.name}
        </div>
        {roomName && (
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', marginBottom: 2,
            fontFamily: 'var(--font-ui)',
          }}>
            📦 {roomName}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-muted)', marginBottom: 6,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {product.sku}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          marginBottom: 8,
        }}>
          ₹{product.mrp.toLocaleString('en-IN')} MRP
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

        {/* Landing cost input */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'var(--font-ui)' }}>
            Landing Cost
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹</span>
            <input
              type="number"
              value={landingCost}
              onChange={(e) => setLandingCost(e.target.value)}
              placeholder="—"
              disabled={mode === 'PROJECT_LINKED' && !clientOfferRate}
              style={{
                flex: 1, height: 26, padding: '0 6px',
                border: '1px solid var(--border)', borderRadius: 4,
                background: 'var(--surface)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                fontSize: 12, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Client rate + margin (PROJECT mode) */}
        {clientOfferRate && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                Client Rate
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              }}>
                ₹{clientOfferRate.toLocaleString('en-IN')}
              </div>
            </div>
            {margin !== null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  Margin
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: margin >= 20 ? '#16A34A' : margin >= 10 ? '#D97706' : '#DC2626',
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {margin}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Qty + Add */}
      <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Stepper */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
        }}>
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            style={{
              width: 28, height: 28, border: 'none', background: 'var(--surface)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Minus size={11} />
          </button>
          <div style={{
            width: 32, textAlign: 'center', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)', borderLeft: '1px solid var(--border)',
            borderRight: '1px solid var(--border)', lineHeight: '28px',
          }}>
            {qty}
          </div>
          <button
            onClick={() => setQty(qty + 1)}
            style={{
              width: 28, height: 28, border: 'none', background: 'var(--surface)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          style={{
            flex: 1, height: 28, borderRadius: 6, border: 'none',
            background: added ? '#16A34A' : 'var(--text-primary)',
            color: added ? '#fff' : 'var(--background)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 0.2s',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <ShoppingCart size={11} />
          {added ? 'Added!' : 'Add to PO'}
        </button>
      </div>
    </div>
  )
}
