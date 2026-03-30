'use client'

// ─── CompanyFilterPanel — Column A ────────────────────────────────────────────
//
// Left-most column of the 3-column purchases layout.
//
// Top:    View mode toggle (Company View / Customer View) — icon-only
// Middle: Brand tile grid  (Company View) or client list (Customer View)
// Bottom: Status filter pills (icon + count)

import * as React from 'react'
import { Building2, Users } from 'lucide-react'
import { BRAND_COLORS, type POStatus } from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import {
  usePurchasesStore,
  type ViewMode,
  type StatusFilter,
  type BrandFilter,
} from '@/lib/usePurchasesStore'
import { BrandLogo } from './BrandLogo'

// ─── Brand tile ───────────────────────────────────────────────────────────────

function BrandTile({
  brand, poCount, active, onClick,
}: {
  brand: string; poCount: number; active: boolean; onClick: () => void
}) {
  const brandColor = BRAND_COLORS[brand.toUpperCase()] ?? '#6B7280'

  return (
    <button
      onClick={onClick}
      title={brand}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
        border: active ? `2px solid ${brandColor}` : '2px solid transparent',
        background: active ? `${brandColor}10` : 'var(--surface)',
        boxShadow: active ? `0 0 0 3px ${brandColor}18` : 'none',
        transition: 'all 0.15s', width: '100%',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--border-subtle)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)' }}
    >
      <BrandLogo brand={brand} sizePx={36} />
      <span style={{
        fontSize: 8, fontWeight: 700, color: active ? brandColor : 'var(--text-muted)',
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        {poCount} PO{poCount !== 1 ? 's' : ''}
      </span>
    </button>
  )
}

// ─── "All Brands" tile ────────────────────────────────────────────────────────

function AllBrandsTile({
  brands, poCount, active, onClick,
}: {
  brands: string[]; poCount: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title="All brands"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
        border: active ? '2px solid var(--text-primary)' : '2px solid transparent',
        background: active ? 'var(--surface)' : 'var(--surface)',
        transition: 'all 0.15s', width: '100%',
        gridColumn: '1 / -1',
      }}
    >
      {/* Mini logo cluster */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 80 }}>
        {brands.slice(0, 4).map((b) => (
          <BrandLogo key={b} brand={b} sizePx={16} style={{ opacity: active ? 1 : 0.45 }} />
        ))}
      </div>
      <span style={{
        fontSize: 8, fontWeight: 700, color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
      }}>
        All · {poCount} POs
      </span>
    </button>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Array<{
  key: StatusFilter
  label: string
  dot: string
}> = [
  { key: 'ALL',               label: 'All',       dot: '#9CA3AF' },
  { key: 'DRAFT',             label: 'Draft',     dot: '#6B7280' },
  { key: 'SUBMITTED',         label: 'Ordered',   dot: '#2563EB' },
  { key: 'PARTIALLY_RECEIVED',label: 'Partial',   dot: '#D97706' },
  { key: 'FULLY_RECEIVED',    label: 'Received',  dot: '#16A34A' },
  { key: 'CANCELLED',         label: 'Cancelled', dot: '#DC2626' },
]

function StatusPill({
  config, count, active, onClick,
}: {
  config: (typeof STATUS_CONFIG)[number]; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        background: active ? 'var(--text-primary)' : 'transparent',
        border: active ? 'none' : '1px solid transparent',
        width: '100%', textAlign: 'left', transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? 'var(--background)' : config.dot,
      }} />
      <span style={{
        flex: 1, fontSize: 11, fontWeight: 600,
        color: active ? 'var(--background)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
      }}>
        {config.label}
      </span>
      {count > 0 && (
        <span style={{
          fontSize: 9, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
          color: active ? 'var(--background)' : 'var(--text-muted)',
          fontFamily: 'var(--font-ui)',
          background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
          padding: '1px 5px', borderRadius: 8,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

function ViewToggle({
  viewMode, onChange,
}: {
  viewMode: ViewMode; onChange: (m: ViewMode) => void
}) {
  const buttons: Array<{ mode: ViewMode; Icon: React.ElementType; title: string }> = [
    { mode: 'company',  Icon: Building2, title: 'Company view — group by brand' },
    { mode: 'customer', Icon: Users,     title: 'Customer view — group by client' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '10px 10px 0',
    }}>
      {buttons.map(({ mode, Icon, title }) => {
        const active = viewMode === mode
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            title={title}
            style={{
              flex: 1, height: 32, borderRadius: 7, cursor: 'pointer',
              border: active ? 'none' : '1px solid var(--border)',
              background: active ? 'var(--text-primary)' : 'transparent',
              color: active ? 'var(--background)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompanyFilterPanel() {
  const orders       = useProcurementStore((s) => s.orders)
  const viewMode     = usePurchasesStore((s) => s.viewMode)
  const activeBrand  = usePurchasesStore((s) => s.activeBrand)
  const activeStatuses  = usePurchasesStore((s) => s.activeStatuses)
  const activeStatus    = activeStatuses[0] ?? 'ALL'
  const setViewMode     = usePurchasesStore((s) => s.setViewMode)
  const setActiveBrand  = usePurchasesStore((s) => s.setActiveBrand)
  const toggleStatus    = usePurchasesStore((s) => s.toggleStatus)
  const setActiveStatus = (status: typeof activeStatus) => toggleStatus(status)

  // Brand → PO count map
  const brandCounts = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const o of orders) {
      const key = (o.vendorName ?? 'UNKNOWN').toUpperCase()
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [orders])

  const allBrands = Object.keys(brandCounts).sort()

  // Status → PO count map
  const statusCounts = React.useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length }
    for (const o of orders) {
      map[o.status] = (map[o.status] ?? 0) + 1
    }
    return map
  }, [orders])

  return (
    <div style={{
      width: 160, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--background)',
      overflowY: 'auto',
    }}>
      {/* View toggle */}
      <ViewToggle viewMode={viewMode} onChange={setViewMode} />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 10px 6px' }} />

      {/* Brand tiles grid (Company View) */}
      {viewMode === 'company' && (
        <div style={{ padding: '0 8px', flex: 1 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 6, marginBottom: 6,
          }}>
            {/* All brands tile */}
            <AllBrandsTile
              brands={allBrands}
              poCount={orders.length}
              active={activeBrand === 'ALL'}
              onClick={() => setActiveBrand('ALL')}
            />

            {/* Per-brand tiles */}
            {allBrands.map((brand) => (
              <BrandTile
                key={brand}
                brand={brand}
                poCount={brandCounts[brand] ?? 0}
                active={activeBrand === brand}
                onClick={() => setActiveBrand(brand === activeBrand ? 'ALL' : brand)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Customer view — placeholder for step 13 POListColumn */}
      {viewMode === 'customer' && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
            <Users size={20} style={{ opacity: 0.3, marginBottom: 6 }} />
            <div>Customer view shows in Column B</div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 10px 6px' }} />

      {/* Status filter pills */}
      <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '2px 4px 4px', marginBottom: 2,
        }}>
          Status
        </div>
        {STATUS_CONFIG.map((cfg) => (
          <StatusPill
            key={cfg.key}
            config={cfg}
            count={statusCounts[cfg.key] ?? 0}
            active={activeStatus === cfg.key}
            onClick={() => setActiveStatus(cfg.key === activeStatus ? 'ALL' : cfg.key)}
          />
        ))}
      </div>
    </div>
  )
}
