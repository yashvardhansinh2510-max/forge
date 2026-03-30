'use client'

import * as React from 'react'
import { X, Trash2, ChevronRight, Package, Layers } from 'lucide-react'
import { useProcurementStore } from '@/lib/procurement-store'
import { BRAND_COLORS, PO_STATUS_COLOR } from '@/lib/mock/procurement-data'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function PODraftSidebar() {
  const { draftPO, sidebarOpen, closeDraft, clearDraft, removeLine, updateLine, submitDraft } =
    useProcurementStore()

  const totalLanding = draftPO.lines.reduce(
    (s, l) => s + (l.landingCost ?? 0) * l.qty, 0,
  )
  const totalClient = draftPO.lines.reduce(
    (s, l) => s + (l.clientOfferRate ?? 0) * l.qty, 0,
  )
  const margin = totalClient > 0
    ? Math.round(((totalClient - totalLanding) / totalClient) * 100)
    : null

  // Group lines by brand
  const byBrand = React.useMemo(() => {
    const map = new Map<string, typeof draftPO.lines>()
    for (const line of draftPO.lines) {
      const b = line.product.brand.toUpperCase()
      if (!map.has(b)) map.set(b, [])
      map.get(b)!.push(line)
    }
    return map
  }, [draftPO.lines])

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          onClick={closeDraft}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
            zIndex: 49, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Slide-over panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, zIndex: 50,
        background: 'var(--background)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: sidebarOpen ? '-8px 0 40px rgba(0,0,0,0.12)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Package size={15} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                Purchase Order Draft
              </span>
              {draftPO.mode && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: draftPO.mode === 'PROJECT_LINKED'
                    ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)',
                  color: draftPO.mode === 'PROJECT_LINKED' ? '#2563EB' : '#6B7280',
                  fontFamily: 'var(--font-ui)',
                }}>
                  {draftPO.mode === 'PROJECT_LINKED' ? 'Project' : 'Bulk'}
                </span>
              )}
            </div>
            {draftPO.projectName && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                {draftPO.projectName}
              </div>
            )}
            {draftPO.vendorName && (
              <div style={{
                fontSize: 11, fontWeight: 600, marginTop: 2,
                color: BRAND_COLORS[draftPO.vendorName.toUpperCase()] ?? 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
              }}>
                {draftPO.vendorName}
              </div>
            )}
          </div>
          <button
            onClick={closeDraft}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Line items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {draftPO.lines.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 8,
              color: 'var(--text-muted)',
            }}>
              <Layers size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                No items yet — add products from the grid
              </span>
            </div>
          ) : (
            Array.from(byBrand.entries()).map(([brand, lines]) => (
              <div key={brand} style={{ marginBottom: 8 }}>
                {/* Brand header */}
                <div style={{
                  padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 3, height: 12, borderRadius: 2,
                    background: BRAND_COLORS[brand] ?? '#888', flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    color: BRAND_COLORS[brand] ?? 'var(--text-muted)',
                    fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                  }}>
                    {brand}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                  }}>
                    {lines.reduce((s, l) => s + l.qty, 0)} units
                  </span>
                </div>

                {/* Line rows */}
                {lines.map((line) => (
                  <div key={line.productId} style={{
                    padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    {/* Emoji thumb */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      background: 'var(--surface)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>
                      {line.product.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)', lineHeight: 1.3,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {line.product.name}
                      </div>
                      <div style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)', marginBottom: 4,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {line.product.sku}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* Landing cost input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>₹</span>
                          <input
                            type="number"
                            value={line.landingCost ?? ''}
                            onChange={(e) =>
                              updateLine(line.productId, {
                                landingCost: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="cost"
                            style={{
                              width: 72, height: 22, padding: '0 5px',
                              border: '1px solid var(--border)', borderRadius: 4,
                              background: 'var(--surface)', color: 'var(--text-primary)',
                              fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                        </div>
                        {/* Qty */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0,
                          border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
                        }}>
                          {(['−', '+'] as const).map((op) => (
                            <button
                              key={op}
                              onClick={() =>
                                updateLine(line.productId, {
                                  qty: Math.max(1, line.qty + (op === '+' ? 1 : -1)),
                                })
                              }
                              style={{
                                width: 20, height: 22, border: 'none',
                                background: 'var(--surface)', cursor: 'pointer',
                                fontSize: 12, color: 'var(--text-muted)',
                                borderRight: op === '−' ? '1px solid var(--border)' : 'none',
                                borderLeft:  op === '+' ? '1px solid var(--border)' : 'none',
                              }}
                            >
                              {op}
                            </button>
                          ))}
                          <div style={{
                            width: 24, textAlign: 'center', fontSize: 11, fontWeight: 600,
                            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {line.qty}
                          </div>
                        </div>
                        {/* Remove */}
                        <button
                          onClick={() => removeLine(line.productId)}
                          style={{
                            width: 22, height: 22, borderRadius: 4, border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    {line.landingCost && (
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap', marginTop: 2,
                      }}>
                        {formatINR(line.landingCost * line.qty)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {draftPO.lines.length > 0 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0,
          }}>
            {/* Totals */}
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  Total units
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {draftPO.lines.reduce((s, l) => s + l.qty, 0)} pcs
                </span>
              </div>
              {totalLanding > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                    Landing cost
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatINR(totalLanding)}
                  </span>
                </div>
              )}
              {margin !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                    Blended margin
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                    color: margin >= 20 ? '#16A34A' : margin >= 10 ? '#D97706' : '#DC2626',
                  }}>
                    {margin}%
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearDraft}
                style={{
                  flex: 1, height: 36, borderRadius: 7, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-tint)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
              >
                Clear
              </button>
              <button
                onClick={submitDraft}
                style={{
                  flex: 2, height: 36, borderRadius: 7, border: 'none',
                  background: 'var(--text-primary)', color: 'var(--background)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Submit PO
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
