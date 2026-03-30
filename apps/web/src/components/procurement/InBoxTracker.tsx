'use client'

import * as React from 'react'
import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight, Boxes } from 'lucide-react'
import { useProcurementStore } from '@/lib/procurement-store'
import { BRAND_COLORS } from '@/lib/mock/procurement-data'
import type { MockInventoryBox, BoxItemStatus } from '@/lib/mock/procurement-data'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<BoxItemStatus, React.ReactNode> = {
  STAGED:               <Clock size={11} />,
  PARTIALLY_DISPATCHED: <Truck size={11} />,
  FULLY_DISPATCHED:     <CheckCircle2 size={11} />,
}

const STATUS_COLOR: Record<BoxItemStatus, { bg: string; text: string }> = {
  STAGED:               { bg: 'rgba(107,114,128,0.12)', text: '#6B7280' },
  PARTIALLY_DISPATCHED: { bg: 'rgba(245,158,11,0.12)',  text: '#D97706' },
  FULLY_DISPATCHED:     { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
}

const STATUS_LABEL: Record<BoxItemStatus, string> = {
  STAGED:               'Staged',
  PARTIALLY_DISPATCHED: 'Partial',
  FULLY_DISPATCHED:     'Dispatched',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function BoxProgress({ box }: { box: MockInventoryBox }) {
  const total      = box.items.reduce((s, i) => s + i.qtyTotal, 0)
  const dispatched = box.items.reduce((s, i) => s + i.qtyDispatched, 0)
  const pct        = total > 0 ? Math.round((dispatched / total) * 100) : 0
  const color      = pct === 100 ? '#16A34A' : pct > 0 ? '#D97706' : '#6B7280'

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 5,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
          Dispatch progress
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color,
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        }}>
          {dispatched}/{total} pcs — {pct}%
        </span>
      </div>
      <div style={{
        height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

// ─── Single box card ──────────────────────────────────────────────────────────

function BoxCard({ box }: { box: MockInventoryBox }) {
  const [expanded, setExpanded] = React.useState(false)
  const { dispatchBoxItem }     = useProcurementStore()

  const allDone = box.items.every((i) => i.status === 'FULLY_DISPATCHED')

  return (
    <div style={{
      background: 'var(--background)',
      border: `1px solid ${allDone ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Card header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
            }}>
              <Package size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              }}>
                {box.boxCode}
              </span>
              {allDone && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                  background: 'rgba(34,197,94,0.12)', color: '#16A34A',
                  fontFamily: 'var(--font-ui)',
                }}>
                  COMPLETE
                </span>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', marginBottom: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {box.projectName}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
            }}>
              <MapPin size={9} />
              <span style={{
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {box.siteAddress}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-ui)',
              marginLeft: 8, flexShrink: 0,
            }}
          >
            <span>{box.items.length} item{box.items.length !== 1 ? 's' : ''}</span>
            <ChevronRight
              size={12}
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>

        <BoxProgress box={box} />

        <div style={{
          fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
        }}>
          Created {formatDate(box.createdAt)}
        </div>
      </div>

      {/* Item rows */}
      {expanded && (
        <div>
          {box.items.map((item) => {
            const sc   = STATUS_COLOR[item.status]
            const remaining = item.qtyTotal - item.qtyDispatched
            const brandColor = BRAND_COLORS[item.productBrand.toUpperCase()] ?? '#888'
            return (
              <div
                key={item.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                {/* Brand stripe */}
                <div style={{
                  width: 3, height: 32, borderRadius: 2,
                  background: brandColor, flexShrink: 0,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.productName}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
                  }}>
                    <span style={{
                      fontSize: 10, color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {item.productSku}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                    <span style={{
                      fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                    }}>
                      {item.finishName}
                    </span>
                  </div>
                </div>

                {/* Qty */}
                <div style={{
                  textAlign: 'right', fontSize: 11, fontFamily: 'var(--font-ui)',
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.qtyDispatched}/{item.qtyTotal}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>pcs</div>
                </div>

                {/* Status badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 20,
                  background: sc.bg, color: sc.text,
                  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-ui)',
                  flexShrink: 0,
                }}>
                  {STATUS_ICON[item.status]}
                  {STATUS_LABEL[item.status]}
                </div>

                {/* Dispatch button */}
                {item.status !== 'FULLY_DISPATCHED' && (
                  <button
                    onClick={() => dispatchBoxItem(box.id, item.id, remaining)}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)', color: 'var(--text-primary)',
                      fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--text-primary)'
                      e.currentTarget.style.color = 'var(--background)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                  >
                    <Truck size={9} />
                    Dispatch {remaining}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InBoxTracker() {
  const boxes = useProcurementStore((s) => s.boxes)
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return boxes
    return boxes.filter(
      (b) => b.projectName.toLowerCase().includes(q)
           || b.boxCode.toLowerCase().includes(q)
           || b.siteAddress.toLowerCase().includes(q),
    )
  }, [boxes, search])

  const totalItems      = boxes.reduce((s, b) => s + b.items.length, 0)
  const dispatchedItems = boxes.reduce(
    (s, b) => s + b.items.filter((i) => i.status === 'FULLY_DISPATCHED').length, 0,
  )
  const stagedItems = boxes.reduce(
    (s, b) => s + b.items.filter((i) => i.status === 'STAGED').length, 0,
  )

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Active Boxes',  value: boxes.length,      icon: <Boxes size={14} />,        color: '#2563EB' },
          { label: 'Items Staged',  value: stagedItems,        icon: <Clock size={14} />,         color: '#D97706' },
          { label: 'Dispatched',    value: dispatchedItems,    icon: <CheckCircle2 size={14} />,  color: '#16A34A' },
          { label: 'Total SKUs',    value: totalItems,         icon: <Package size={14} />,       color: '#6B7280' },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            style={{
              flex: 1, padding: '12px 14px',
              background: 'var(--background)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 6, color,
            }}>
              {icon}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: '1px solid var(--border)', borderRadius: 8,
        padding: '0 10px', height: 36, background: 'var(--surface)',
        marginBottom: 16, maxWidth: 360,
      }}>
        <Truck size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by project or box code…"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
            fontSize: 12, outline: 'none',
          }}
        />
      </div>

      {/* Box cards grid */}
      {filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', paddingTop: 80, gap: 10,
          color: 'var(--text-muted)',
        }}>
          <Boxes size={36} style={{ opacity: 0.25 }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>
            No inventory boxes found
          </span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 14,
        }}>
          {filtered.map((box) => (
            <BoxCard key={box.id} box={box} />
          ))}
        </div>
      )}
    </div>
  )
}
