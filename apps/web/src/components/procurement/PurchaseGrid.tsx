'use client'

import * as React from 'react'
import { Search, ChevronDown, ChevronRight, ShoppingCart, Package2 } from 'lucide-react'
import { POS_PRODUCTS } from '@/lib/mock/pos-data'
import type { POSProduct } from '@/lib/mock/pos-data'
import { BRAND_COLORS } from '@/lib/mock/procurement-data'
import { ProductPurchaseCard } from './ProductPurchaseCard'
import { PODraftSidebar } from './PODraftSidebar'
import { useProcurementStore, useDraftLineCount } from '@/lib/procurement-store'
import type { POMode } from '@/lib/mock/procurement-data'

// ─── Mock projects (real data comes from DB) ──────────────────────────────────

const MOCK_PROJECTS = [
  { id: 'proj-001', name: 'Smith Residence — Bandra',    revisionId: 'rev-001' },
  { id: 'proj-002', name: 'Mehta Penthouse — Worli',     revisionId: 'rev-002' },
  { id: 'proj-003', name: 'Lodha Altamount — 14th Floor',revisionId: 'rev-003' },
  { id: 'proj-004', name: 'Kapoor Villa — Juhu',         revisionId: 'rev-004' },
  { id: 'proj-005', name: 'Oberoi Sky City — Unit 3B',   revisionId: 'rev-005' },
]

// ─── Mock stock per product ──────────────────────────────────────────────────

function getMockStock(productId: string) {
  // Deterministic mock based on ID hash
  const h = productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const physical   = 2 + (h % 15)
  const committed  = h % (physical + 1)
  const onOrder    = h % 5
  return { physical, committed, onOrder, available: physical - committed }
}

// ─── Derive brands + categories from catalog ─────────────────────────────────

const ALL_BRANDS = Array.from(
  new Set(POS_PRODUCTS.filter((p) => !p.isConcealed).map((p) => p.brand.toUpperCase())),
).sort()

type CategoryMap = Record<string, string[]>
const CATEGORY_MAP: CategoryMap = POS_PRODUCTS
  .filter((p) => !p.isConcealed)
  .reduce<CategoryMap>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    if (!acc[p.category]!.includes(p.subCategory)) acc[p.category]!.push(p.subCategory)
    return acc
  }, {})

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: POMode; onChange: (m: POMode) => void }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border)', background: 'var(--surface)',
      marginBottom: 16,
    }}>
      {(['PROJECT_LINKED', 'BULK_COMPANY'] as POMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            flex: 1, height: 30, border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-ui)',
            background: mode === m ? 'var(--text-primary)' : 'transparent',
            color: mode === m ? 'var(--background)' : 'var(--text-muted)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {m === 'PROJECT_LINKED' ? 'Project' : 'Bulk'}
        </button>
      ))}
    </div>
  )
}

function BrandCheck({ brand, checked, onChange }: {
  brand: string; checked: boolean; onChange: (v: boolean) => void
}) {
  const color = BRAND_COLORS[brand] ?? '#888'
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      padding: '4px 0',
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${checked ? color : 'var(--border)'}`,
          background: checked ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: checked ? 600 : 400,
        color: checked ? color : 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
        textTransform: 'uppercase', transition: 'color 0.12s',
      }}>
        {brand}
      </span>
    </label>
  )
}

function CategoryAccordion({ categories, selectedSubs, onToggleSub }: {
  categories: CategoryMap
  selectedSubs: Set<string>
  onToggleSub: (sub: string) => void
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(Object.keys(categories)),
  )

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        Category
      </div>
      {Object.entries(categories).map(([cat, subs]) => {
        const isOpen = expanded.has(cat)
        return (
          <div key={cat} style={{ marginBottom: 2 }}>
            <button
              onClick={() => setExpanded((prev) => {
                const next = new Set(prev)
                isOpen ? next.delete(cat) : next.add(cat)
                return next
              })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '5px 0', border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                {cat}
              </span>
              {isOpen
                ? <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
                : <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
              }
            </button>
            {isOpen && (
              <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
                {subs.map((sub) => {
                  const active = selectedSubs.has(sub)
                  return (
                    <button
                      key={sub}
                      onClick={() => onToggleSub(sub)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '3px 6px', borderRadius: 4, border: 'none',
                        cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-ui)',
                        background: active ? 'var(--surface-tint)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: active ? 600 : 400,
                        marginBottom: 1,
                      }}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PurchaseGrid() {
  const { openDraft, addLine, sidebarOpen } = useProcurementStore()
  const draftCount = useDraftLineCount()

  const [mode, setMode]                 = React.useState<POMode>('BULK_COMPANY')
  const [projectId, setProjectId]       = React.useState<string>('')
  const [search, setSearch]             = React.useState('')
  const [brandFilters, setBrandFilters] = React.useState<Set<string>>(new Set())
  const [subFilters, setSubFilters]     = React.useState<Set<string>>(new Set())

  // Filtered products (exclude concealed parts)
  const products = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return POS_PRODUCTS.filter((p) => {
      if (p.isConcealed) return false
      if (brandFilters.size > 0 && !brandFilters.has(p.brand.toUpperCase())) return false
      if (subFilters.size   > 0 && !subFilters.has(p.subCategory))           return false
      if (q && !p.name.toLowerCase().includes(q) &&
               !p.sku.toLowerCase().includes(q)  &&
               !p.brand.toLowerCase().includes(q))                           return false
      return true
    })
  }, [search, brandFilters, subFilters])

  function handleBrandToggle(brand: string, on: boolean) {
    setBrandFilters((prev) => {
      const next = new Set(prev)
      on ? next.add(brand) : next.delete(brand)
      return next
    })
  }

  function handleSubToggle(sub: string) {
    setSubFilters((prev) => {
      const next = new Set(prev)
      next.has(sub) ? next.delete(sub) : next.add(sub)
      return next
    })
  }

  function handleAdd(product: POSProduct, qty: number, _landingCost: number | null) {
    const proj = MOCK_PROJECTS.find((p) => p.id === projectId)
    // Always set draft context on first add (openDraft preserves existing lines)
    openDraft(mode, {
      projectId:   proj?.id,
      projectName: proj?.name,
      revisionId:  proj?.revisionId,
    })
    // In project mode, derive a mock client offer rate (builder rate = MRP * 0.82)
    const clientOfferRate = mode === 'PROJECT_LINKED'
      ? Math.round(product.mrp * 0.82)
      : undefined
    addLine(product, qty, clientOfferRate)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        padding: '16px 16px',
        background: 'var(--background)',
      }}>
        <ModeToggle mode={mode} onChange={setMode} />

        {mode === 'PROJECT_LINKED' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              Project
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: '100%', height: 30, padding: '0 8px',
                border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--surface)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select project…</option>
              {MOCK_PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 12px' }} />

        {/* Brand filters */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          Brand
        </div>
        {ALL_BRANDS.map((brand) => (
          <BrandCheck
            key={brand}
            brand={brand}
            checked={brandFilters.has(brand)}
            onChange={(on) => handleBrandToggle(brand, on)}
          />
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0 8px' }} />

        {/* Category accordion */}
        <CategoryAccordion
          categories={CATEGORY_MAP}
          selectedSubs={subFilters}
          onToggleSub={handleSubToggle}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--background)',
        }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '0 10px', height: 34, background: 'var(--surface)',
          }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKUs, brands…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                fontSize: 12, outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 14, lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{
            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
            whiteSpace: 'nowrap',
          }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </div>

          {draftCount > 0 && (
            <button
              onClick={() => openDraft(mode, {})}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 8,
                border: 'none', background: 'var(--text-primary)',
                color: 'var(--background)', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
              }}
            >
              <ShoppingCart size={13} />
              View Draft ({draftCount})
            </button>
          )}
        </div>

        {/* Product grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
        }}>
          {products.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 320, gap: 10,
              color: 'var(--text-muted)',
            }}>
              <Package2 size={36} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                No products match your filters
              </span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 14,
            }}>
              {products.map((product) => {
                const proj = mode === 'PROJECT_LINKED'
                  ? MOCK_PROJECTS.find((p) => p.id === projectId)
                  : undefined
                return (
                  <ProductPurchaseCard
                    key={product.id}
                    product={product}
                    stock={getMockStock(product.id)}
                    clientOfferRate={
                      proj ? Math.round(product.mrp * 0.82) : undefined
                    }
                    mode={mode}
                    onAdd={handleAdd}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Draft sidebar (fixed panel) */}
      <PODraftSidebar />
    </div>
  )
}
