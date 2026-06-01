'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { MapPin, Phone } from 'lucide-react'
import { SlideOver, DetailField } from '@/components/crm/shared/slide-over'
import { StockBadge } from '../shared/stock-badge'
import { formatINR } from '@/lib/mock/sales-data'
import { formatQty, products, movements, type Warehouse } from '@/lib/mock/inventory-data'

interface WarehouseSlideOverProps {
  warehouse: Warehouse | null
  onClose: () => void
}

const TABS = ['Overview', 'Products', 'Movements'] as const
type Tab = (typeof TABS)[number]

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  IN: { bg: '#F0FDF4', color: '#15803D' },
  OUT: { bg: '#FFF1F2', color: '#BE123C' },
  TRANSFER: { bg: '#EFF6FF', color: '#2563EB' },
  ADJUST: { bg: '#FFFBEB', color: '#B45309' },
  RETURN: { bg: '#F5F3FF', color: '#6D28D9' },
}

export function WarehouseSlideOver({ warehouse, onClose }: WarehouseSlideOverProps) {
  const [tab, setTab] = React.useState<Tab>('Overview')

  React.useEffect(() => {
    if (warehouse) setTab('Overview')
  }, [warehouse?.id])

  if (!warehouse) return null

  // Products stocked in this warehouse
  const warehouseProducts = products.filter((p) =>
    p.warehouses.some((w) => w.warehouseId === warehouse.id && w.quantity > 0),
  )

  // Movements for this warehouse (using flat fields)
  const warehouseMovements = movements.filter(
    (m) => m.fromWarehouseId === warehouse.id || m.toWarehouseId === warehouse.id,
  )

  return (
    <SlideOver
      open={!!warehouse}
      onClose={onClose}
      title={warehouse.name}
      subtitle={`${warehouse.city}, ${warehouse.state}`}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 20,
          marginTop: -4,
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
          {/* Stats row */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}
          >
            {[
              { label: 'SKUs', value: warehouse.totalSKUs },
              { label: 'Total Units', value: warehouse.totalUnits.toLocaleString() },
              { label: 'Stock Value', value: formatINR(warehouse.totalValue) },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Utilization */}
          <div
            style={{
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Space Utilization
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {warehouse.utilization}%
              </span>
            </div>
            <div
              style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}
            >
              <div
                style={{
                  width: `${warehouse.utilization}%`,
                  height: '100%',
                  background:
                    warehouse.utilization > 85
                      ? '#EF4444'
                      : warehouse.utilization > 70
                        ? '#F59E0B'
                        : warehouse.color,
                  borderRadius: 99,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />

          <DetailField
            label="Type"
            value={warehouse.type.charAt(0).toUpperCase() + warehouse.type.slice(1)}
          />
          <DetailField
            label="Address"
            value={
              <div style={{ display: 'flex', gap: 5 }}>
                <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
                {warehouse.address}
              </div>
            }
          />
          <DetailField
            label="Phone"
            value={
              <div style={{ display: 'flex', gap: 5 }}>
                <Phone size={13} style={{ color: 'var(--text-tertiary)' }} />
                {warehouse.phone}
              </div>
            }
          />
          <DetailField label="Manager" value={warehouse.manager.name} />
          {warehouse.notes && <DetailField label="Notes" value={warehouse.notes} />}
        </div>
      )}

      {tab === 'Products' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {warehouseProducts.length} products stocked
          </div>
          {warehouseProducts.map((p) => {
            const wh = p.warehouses.find((w) => w.warehouseId === warehouse.id)!
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-ui)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.sku}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatQty(wh.quantity, p.unit)}
                  </div>
                  <StockBadge status={p.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Movements' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {warehouseMovements.length} movements
          </div>
          {warehouseMovements.map((m) => {
            const tc = TYPE_COLORS[m.type] ?? { bg: '#F4F4F5', color: '#71717A' }
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
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
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {m.productName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {m.quantity} units · {format(m.createdAt, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            )
          })}
          {warehouseMovements.length === 0 && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                padding: 24,
                textAlign: 'center',
              }}
            >
              No movements recorded
            </div>
          )}
        </div>
      )}
    </SlideOver>
  )
}
