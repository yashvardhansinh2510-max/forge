'use client'

// ─── POListColumn — Column B ───────────────────────────────────────────────────
//
// Middle column of the 3-column purchases layout.
//
// Top:    Search bar (SKU / PO number / project query)
// Middle: SKUSearchResults overlay  OR  grouped PO list
//           Company View → grouped by vendor brand
//           Customer View → grouped by project / client
// Middle: SKUSearchResults overlay  OR  grouped PO list

import * as React from 'react'
import { Search, X } from 'lucide-react'
import {
  BRAND_COLORS,
  PO_STATUS_COLOR,
  PO_STATUS_LABEL,
  type MockPurchaseOrder,
} from '@/lib/mock/procurement-data'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { BrandLogo } from './BrandLogo'
import { SKUSearchResults } from './SKUSearchResults'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toLocaleString('en-IN')}`
}

function poValue(order: MockPurchaseOrder): number {
  return order.lineItems.reduce((s, l) => {
    const rate = l.landingCost ?? l.clientOfferRate ?? 0
    return s + rate * l.qtyOrdered
  }, 0)
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: MockPurchaseOrder['status'] }) {
  const color = PO_STATUS_COLOR[status].text
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: color,
    }} />
  )
}

// ─── Product SKU chips (up to 3) ──────────────────────────────────────────────

function ProductChips({ lineItems }: { lineItems: MockPurchaseOrder['lineItems'] }) {
  const shown = lineItems.slice(0, 3)
  const extra = lineItems.length - 3
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {shown.map((l) => (
        <span key={l.id} style={{
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
          color: 'var(--text-muted)',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          padding: '1px 5px', borderRadius: 4,
        }}>
          {l.productSku}
        </span>
      ))}
      {extra > 0 && (
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)',
          padding: '1px 4px',
        }}>
          +{extra}
        </span>
      )}
    </div>
  )
}

// ─── PO card ──────────────────────────────────────────────────────────────────

function POCard({
  order, active, onClick,
}: {
  order: MockPurchaseOrder; active: boolean; onClick: () => void
}) {
  const sc    = PO_STATUS_COLOR[order.status]
  const value = poValue(order)

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '9px 12px',
        display: 'flex', flexDirection: 'column', gap: 5,
        background: active ? 'var(--surface)' : 'none',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      {/* Row 1: PO number + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusDot status={order.status} />
        <span style={{
          flex: 1, fontSize: 12, fontWeight: 800, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}>
          {order.poNumber}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
          color: sc.text, background: sc.bg, padding: '1px 6px', borderRadius: 8,
        }}>
          {PO_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Row 2: Project or vendor name */}
      <div style={{
        fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {order.projectName ?? (order.vendorName ? `${order.vendorName} — Bulk Order` : 'Bulk Order')}
      </div>

      {/* Row 3: SKU chips + value */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProductChips lineItems={order.lineItems} />
        </div>
        {value > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            {formatINR(value)}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Brand group (Company View) ────────────────────────────────────────────────

function BrandGroup({
  brand, orders, selectedPOId, onSelect,
}: {
  brand: string
  orders: MockPurchaseOrder[]
  selectedPOId: string | null
  onSelect: (id: string) => void
}) {
  const brandColor = BRAND_COLORS[brand.toUpperCase()] ?? '#6B7280'

  return (
    <div>
      {/* Sticky brand header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px 5px',
        position: 'sticky', top: 48,   // 48 = SearchBar height
        background: 'var(--background)', zIndex: 1,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <BrandLogo brand={brand} sizePx={18} />
        <span style={{
          flex: 1, fontSize: 10, fontWeight: 800, color: brandColor,
          fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {brand}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          background: 'var(--surface)', padding: '1px 6px', borderRadius: 8,
        }}>
          {orders.length} PO{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* PO cards */}
      <div style={{ padding: '4px 8px 8px' }}>
        {orders.map((order) => (
          <POCard
            key={order.id}
            order={order}
            active={order.id === selectedPOId}
            onClick={() => onSelect(order.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Project group (Customer View) ────────────────────────────────────────────

function ProjectGroup({
  projectName, orders, selectedPOId, onSelect,
}: {
  projectName: string
  orders: MockPurchaseOrder[]
  selectedPOId: string | null
  onSelect: (id: string) => void
}) {
  // Unique brands across all POs in this project group
  const brands = [...new Set(
    orders.flatMap((o) => (o.vendorName ? [o.vendorName.toUpperCase()] : [])),
  )].slice(0, 3)

  return (
    <div>
      {/* Sticky project header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px 5px',
        position: 'sticky', top: 48,
        background: 'var(--background)', zIndex: 1,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {brands.map((b) => (
            <BrandLogo key={b} brand={b} sizePx={18} />
          ))}
        </div>
        <span style={{
          flex: 1, fontSize: 10, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {projectName}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          background: 'var(--surface)', padding: '1px 6px', borderRadius: 8,
        }}>
          {orders.length}
        </span>
      </div>

      {/* PO cards */}
      <div style={{ padding: '4px 8px 8px' }}>
        {orders.map((order) => (
          <POCard
            key={order.id}
            order={order}
            active={order.id === selectedPOId}
            onClick={() => onSelect(order.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar() {
  const searchQuery = usePurchasesStore((s) => s.searchQuery)
  const setSearch   = usePurchasesStore((s) => s.setSearch)
  const clearSearch = usePurchasesStore((s) => s.clearSearch)

  return (
    <div style={{
      padding: '10px 10px 8px',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky', top: 0,
      background: 'var(--background)', zIndex: 2,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '0 10px', height: 30,
      }}>
        <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU, PO, project…"
          style={{
            flex: 1, border: 'none', background: 'none', outline: 'none',
            fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)',
          }}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyList() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 20px', color: 'var(--text-muted)',
    }}>
      <div style={{
        fontSize: 11, fontFamily: 'var(--font-ui)', textAlign: 'center', lineHeight: 1.5,
      }}>
        No purchase orders match the current filters
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function POListColumn() {
  const orders          = useProcurementStore((s) => s.orders)
  const viewMode        = usePurchasesStore((s) => s.viewMode)
  const activeBrand     = usePurchasesStore((s) => s.activeBrand)
  const activeStatuses  = usePurchasesStore((s) => s.activeStatuses)
  const activeStatus    = activeStatuses[0] ?? 'ALL'
  const searchQuery     = usePurchasesStore((s) => s.searchQuery)
  const skuSearchActive = usePurchasesStore((s) => s.skuSearchActive)
  const selectedPOId    = usePurchasesStore((s) => s.selectedPOId)
  const selectPO        = usePurchasesStore((s) => s.selectPO)

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filteredOrders = React.useMemo(() => {
    let result = orders

    if (activeBrand !== 'ALL') {
      result = result.filter(
        (o) => (o.vendorName ?? '').toUpperCase() === activeBrand,
      )
    }

    if (activeStatus !== 'ALL') {
      result = result.filter((o) => o.status === activeStatus)
    }

    return result
  }, [orders, activeBrand, activeStatus])

  // ── Company view: group by vendorName ──────────────────────────────────────
  const brandGroups = React.useMemo(() => {
    if (viewMode !== 'company') return []
    const map = new Map<string, MockPurchaseOrder[]>()
    for (const o of filteredOrders) {
      const key = (o.vendorName ?? 'OTHER').toUpperCase()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [viewMode, filteredOrders])

  // ── Customer view: group by projectName ───────────────────────────────────
  const projectGroups = React.useMemo(() => {
    if (viewMode !== 'customer') return []
    const map = new Map<string, MockPurchaseOrder[]>()
    for (const o of filteredOrders) {
      const key = o.projectName ?? 'Bulk Orders'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [viewMode, filteredOrders])

  return (
    <div style={{
      width: 340, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--background)',
      overflowY: 'auto',
    }}>
      {/* Search bar — sticky */}
      <SearchBar />

      {/* ── SKU search results overlay ── */}
      {skuSearchActive ? (
        <SKUSearchResults query={searchQuery} />
      ) : (
        <>
          {/* Grouped PO list */}
          {(
            filteredOrders.length === 0 ? (
              <EmptyList />
            ) : viewMode === 'company' ? (
              brandGroups.map(([brand, brandOrders]) => (
                <BrandGroup
                  key={brand}
                  brand={brand}
                  orders={brandOrders}
                  selectedPOId={selectedPOId}
                  onSelect={selectPO}
                />
              ))
            ) : (
              projectGroups.map(([project, projectOrders]) => (
                <ProjectGroup
                  key={project}
                  projectName={project}
                  orders={projectOrders}
                  selectedPOId={selectedPOId}
                  onSelect={selectPO}
                />
              ))
            )
          )}
        </>
      )}
    </div>
  )
}
