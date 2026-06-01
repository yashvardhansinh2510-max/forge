'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { MapPin, ArrowLeftRight, Clipboard, Check } from 'lucide-react'
import { toast } from 'sonner'
import { SlideOver, DetailField } from '@/components/crm/shared/slide-over'
import { StockBadge, TierBadge } from '../shared/stock-badge'
import { StockLevelBar } from '../shared/stock-level-bar'
import { formatINR } from '@/lib/mock/sales-data'
import { BRANDS, movements, formatQty, type Product, type ProductTier } from '@/lib/mock/inventory-data'
import { deals } from '@/lib/mock/crm-data'

interface ProductSlideOverProps {
  product: Product | null
  onClose: () => void
  onAdjust: (product: Product) => void
}

const TABS = ['Overview', 'Stock', 'Movements', 'Details'] as const
type Tab = (typeof TABS)[number]

const ORIGIN_FLAGS: Record<string, string> = {
  Germany: '🇩🇪',
  Turkey: '🇹🇷',
  USA: '🇺🇸',
  India: '🇮🇳',
  Italy: '🇮🇹',
  UAE: '🇦🇪',
  Switzerland: '🇨🇭',
}

const STAGE_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  site_visit: 'Site Visit',
  sample_sent: 'Sample Sent',
  quote_shared: 'Quote Shared',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  enquiry: { bg: '#F4F4F5', color: '#71717A' },
  site_visit: { bg: '#EFF6FF', color: '#2563EB' },
  sample_sent: { bg: '#F5F3FF', color: '#7C3AED' },
  quote_shared: { bg: '#FFFBEB', color: '#B45309' },
  negotiation: { bg: '#FFF7ED', color: '#C2410C' },
  won: { bg: '#F0FDF4', color: '#15803D' },
  lost: { bg: '#FFF1F2', color: '#BE123C' },
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  IN: { bg: '#F0FDF4', color: '#15803D' },
  OUT: { bg: '#FFF1F2', color: '#BE123C' },
  TRANSFER: { bg: '#EFF6FF', color: '#2563EB' },
  ADJUST: { bg: '#FFFBEB', color: '#B45309' },
  RETURN: { bg: '#F5F3FF', color: '#6D28D9' },
}

function getBrandInfo(brandName: string) {
  const entry = Object.values(BRANDS).find((b) => b.name === brandName)
  return entry ?? { name: brandName, color: '#8E8E93', origin: 'India', tier: 'mid' as ProductTier }
}

function marginColor(pct: number): string {
  if (pct >= 40) return '#15803D'
  if (pct >= 30) return '#B45309'
  return '#C2410C'
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: 4,
        border: '1px solid var(--border-default)',
        background: 'white',
        cursor: 'pointer',
        color: 'var(--text-tertiary)',
        marginLeft: 6,
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={10} style={{ color: '#15803D' }} /> : <Clipboard size={10} />}
    </button>
  )
}

export function ProductSlideOver({ product, onClose, onAdjust }: ProductSlideOverProps) {
  const [tab, setTab] = React.useState<Tab>('Overview')

  React.useEffect(() => {
    if (product) setTab('Overview')
  }, [product?.id])

  if (!product) return null

  const brand = getBrandInfo(product.brand)
  const flag = ORIGIN_FLAGS[brand.origin] ?? '🌐'
  const productMovements = movements.filter((m) => m.productId === product.id)
  const linkedDeals = deals.filter((d) => d.brands.includes(product.brand)).slice(0, 3)

  const margin =
    product.unitPrice > 0
      ? ((product.unitPrice - product.costPrice) / product.unitPrice) * 100
      : 0
  const marginAmt = product.unitPrice - product.costPrice
  const gstAmount = product.costPrice * (product.gstRate / 100)

  return (
    <SlideOver
      open={!!product}
      onClose={onClose}
      title={product.name}
      subtitle={product.sku}
      width={560}
    >
      {/* Header extras: tier badge + brand origin */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          marginTop: -8,
        }}
      >
        <TierBadge tier={product.tier} />
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{flag}</span>
          <span>{brand.origin}</span>
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 20,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              height: 36,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 500,
              color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div>
          {/* Status + stock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <StockBadge status={product.status} />
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>·</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {formatQty(product.totalStock, product.unit)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>total stock</span>
          </div>

          {/* Stock bar */}
          <div style={{ marginBottom: 20 }}>
            <StockLevelBar
              current={product.totalStock}
              reorderPoint={product.reorderPoint}
              status={product.status}
              showLabel
            />
          </div>

          {/* Adjust button */}
          <button
            onClick={() => onAdjust(product)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            <ArrowLeftRight size={14} />
            Adjust Stock
          </button>

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />

          <DetailField label="Description" value={product.description} />
          <DetailField label="Brand" value={product.brand} />
          <DetailField label="Category" value={`${product.category} › ${product.subCategory}`} />
          <DetailField label="Unit" value={product.unit} />

          {/* Technical Specification card */}
          <div
            style={{
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '14px 16px',
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 12,
              }}
            >
              Technical Specifications
            </div>

            {[
              {
                label: 'Origin',
                value: (
                  <span>
                    {flag} {brand.origin}
                  </span>
                ),
              },
              {
                label: 'Dimensions',
                value: product.dimensions ?? '—',
              },
              {
                label: 'Weight',
                value: product.weight ?? '—',
              },
              {
                label: 'Barcode',
                value: product.barcode ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      {product.barcode}
                    </span>
                    <CopyButton text={product.barcode} />
                  </span>
                ) : (
                  '—'
                ),
              },
              {
                label: 'GST Rate',
                value: (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: product.gstRate === 28 ? '#FFF7ED' : '#EFF6FF',
                      color: product.gstRate === 28 ? '#C2410C' : '#2563EB',
                      border: `1px solid ${product.gstRate === 28 ? '#FED7AA' : '#BFDBFE'}`,
                    }}
                  >
                    {product.gstRate}%
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  paddingBottom: 8,
                  marginBottom: 8,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 90 }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    textAlign: 'right',
                    flex: 1,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Margin Analysis */}
          <div
            style={{
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 12,
              }}
            >
              Margin Analysis
            </div>

            {[
              { label: 'Cost Price', value: formatINR(product.costPrice), bold: false, color: undefined },
              { label: 'Sell Price', value: formatINR(product.unitPrice), bold: false, color: undefined },
              {
                label: 'Margin',
                value: `${formatINR(marginAmt)} (${margin.toFixed(0)}%)`,
                bold: true,
                color: marginColor(margin),
              },
              {
                label: `GST Amount (${product.gstRate}%)`,
                value: formatINR(gstAmount),
                bold: false,
                color: undefined,
              },
            ].map(({ label, value, bold, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: bold ? 700 : 500,
                    color: color ?? 'var(--text-primary)',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Linked Deals */}
          {linkedDeals.length > 0 && (
            <div
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                Linked Deals
              </div>
              {linkedDeals.map((deal) => {
                const sc = STAGE_COLORS[deal.stage] ?? { bg: '#F4F4F5', color: '#71717A' }
                return (
                  <div
                    key={deal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      paddingBottom: 8,
                      marginBottom: 8,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {deal.title}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: 'var(--font-ui)',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {formatINR(deal.value)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: sc.bg,
                        color: sc.color,
                        flexShrink: 0,
                      }}
                    >
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'Stock' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 10,
              }}
            >
              Stock by Warehouse
            </div>
            {product.warehouses.map((wh) => (
              <div
                key={wh.warehouseId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={13} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {wh.warehouseName}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatQty(wh.quantity, product.unit)}
                  </div>
                  {wh.reserved > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {wh.reserved} reserved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <DetailField label="Reorder Point" value={`${product.reorderPoint} ${product.unit}`} />
            <DetailField label="Lead Time" value={`${product.leadTimeDays} days`} />
          </div>
        </div>
      )}

      {tab === 'Movements' && (
        <div>
          {productMovements.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-tertiary)',
              }}
            >
              No movements recorded
            </div>
          ) : (
            productMovements.map((m) => {
              const tc = TYPE_COLORS[m.type] ?? { bg: '#F4F4F5', color: '#71717A' }
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: tc.bg,
                      color: tc.color,
                      padding: '2px 7px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {m.type}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {m.type === 'IN' && `+${m.quantity} ${product.unit}`}
                      {m.type === 'OUT' && `-${m.quantity} ${product.unit}`}
                      {m.type === 'TRANSFER' && `${m.quantity} ${product.unit} transferred`}
                      {m.type === 'ADJUST' &&
                        `${m.quantity > 0 ? '+' : ''}${m.quantity} ${product.unit}`}
                      {m.type === 'RETURN' && `+${m.quantity} ${product.unit} returned`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {m.reference} · {format(m.createdAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'Details' && (
        <div>
          <DetailField
            label="SKU"
            value={<span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{product.sku}</span>}
          />
          {product.barcode && (
            <DetailField
              label="Barcode"
              value={<span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{product.barcode}</span>}
            />
          )}
          <DetailField label="Unit Price (MRP)" value={formatINR(product.unitPrice)} />
          <DetailField label="Cost Price" value={formatINR(product.costPrice)} />
          <DetailField label="GST Rate" value={`${product.gstRate}%`} />
          {product.weight && <DetailField label="Weight" value={product.weight} />}
          {product.dimensions && <DetailField label="Dimensions" value={product.dimensions} />}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </SlideOver>
  )
}
