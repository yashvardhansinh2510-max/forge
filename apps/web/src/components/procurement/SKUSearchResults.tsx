'use client'

// ─── SKUSearchResults ──────────────────────────────────────────────────────────
//
// Shown in Column B when the search query looks like a SKU code (≥ 3 chars).
// Fetches GET /api/purchase-orders/search?sku= and renders an aggregated card:
//
//   [product img]  HAN-MET-OH-260
//   [HANSGROHE logo]
//
//   TOTAL ACROSS ALL ORDERS
//   Ordered: 5  |  Received: 3  |  Pending: 2
//
//   PO-2026-0005  Unnamed Project    1 ordered  ● Pending
//   PO-2025-0001  Smith Residence    2 ordered  ● Received
//
// Clicking any row → opens that PO in Column C with the SKU row highlighted.

import * as React from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { PO_STATUS_COLOR, PO_STATUS_LABEL, BRAND_COLORS } from '@/lib/mock/procurement-data'
import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { BrandLogo } from './BrandLogo'
import type { SKUSearchResult, SKUSearchMatch } from '@/app/api/purchase-orders/search/route'

// ─── Totals bar ───────────────────────────────────────────────────────────────

function TotalsBar({ totals }: { totals: SKUSearchResult['totals'] }) {
  const cells = [
    { label: 'Ordered',  value: totals.qtyOrdered,  color: 'var(--text-primary)' },
    { label: 'Received', value: totals.qtyReceived, color: '#16A34A' },
    { label: 'Pending',  value: totals.qtyPending,  color: totals.qtyPending > 0 ? '#D97706' : 'var(--text-muted)' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 0,
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      margin: '10px 0',
    }}>
      {cells.map(({ label, value, color }, i) => (
        <div key={label} style={{
          flex: 1, padding: '8px 0', textAlign: 'center',
          borderRight: i < cells.length - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchRow({ match, onClick }: { match: SKUSearchMatch; onClick: () => void }) {
  const sc = PO_STATUS_COLOR[match.status as keyof typeof PO_STATUS_COLOR]

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
        textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      {/* PO number */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          marginBottom: 1,
        }}>
          {match.poNumber}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {match.projectName ?? match.vendorName ?? 'Bulk order'}
        </div>
      </div>

      {/* Qty ordered */}
      <div style={{
        fontSize: 10, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        color: 'var(--text-muted)', whiteSpace: 'nowrap',
      }}>
        {match.qtyOrdered} ordered
      </div>

      {/* Status badge */}
      {sc && (
        <div style={{
          padding: '2px 7px', borderRadius: 20,
          background: sc.bg, color: sc.text,
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap',
        }}>
          {PO_STATUS_LABEL[match.status as keyof typeof PO_STATUS_LABEL] ?? match.status}
        </div>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SKUSearchResultsProps {
  query: string
}

export function SKUSearchResults({ query }: SKUSearchResultsProps) {
  const [result, setResult]   = React.useState<SKUSearchResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)
  const openPOAtLine = usePurchasesStore((s) => s.openPOAtLine)
  const clearSearch  = usePurchasesStore((s) => s.clearSearch)

  // Debounce + fetch
  React.useEffect(() => {
    if (!query.trim()) { setResult(null); return }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/purchase-orders/search?sku=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error('Search failed')
        setResult(await res.json() as SKUSearchResult)
      } catch {
        setError('Search failed — try again')
      } finally {
        setLoading(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  // ── Loading ──
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '32px 14px', color: 'var(--text-muted)',
      }}>
        <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)' }}>Searching…</span>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '16px 14px', color: '#DC2626',
      }}>
        <AlertCircle size={13} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)' }}>{error}</span>
      </div>
    )
  }

  // ── No result ──
  if (!result) return null

  // ── No matches ──
  if (result.matches.length === 0) {
    return (
      <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Search size={24} style={{ opacity: 0.25, marginBottom: 8 }} />
        <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)' }}>
          No orders found for <strong>{query}</strong>
        </div>
      </div>
    )
  }

  const brandColor = BRAND_COLORS[result.productBrand.toUpperCase()] ?? '#6B7280'

  return (
    <div>
      {/* Product header card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {/* Product image / brand initials */}
          <div style={{
            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            background: `${brandColor}14`, border: `1.5px solid ${brandColor}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {result.productImage
              ? <img src={result.productImage} alt={result.sku} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              : <span style={{ fontSize: 11, fontWeight: 900, color: brandColor, fontFamily: 'var(--font-ui)' }}>
                  {result.sku.slice(0, 3)}
                </span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* SKU code */}
            <div style={{
              fontSize: 12, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em', marginBottom: 2,
            }}>
              {result.sku.toUpperCase()}
            </div>
            {result.productName && (
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {result.productName}
              </div>
            )}
          </div>

          {/* Brand logo */}
          {result.productBrand && (
            <BrandLogo brand={result.productBrand} size="sm" />
          )}
        </div>

        {/* Section label */}
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Total across all orders
        </div>

        {/* Totals bar */}
        <TotalsBar totals={result.totals} />
      </div>

      {/* Match rows */}
      {result.matches.map((match) => (
        <MatchRow
          key={match.lineItemId}
          match={match}
          onClick={() => {
            openPOAtLine(match.poId, match.lineItemId)
            clearSearch()
          }}
        />
      ))}
    </div>
  )
}
