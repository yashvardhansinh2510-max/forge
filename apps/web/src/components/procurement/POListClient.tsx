'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@forge/ui'
import {
  Search, Package, ChevronRight, Circle,
  Plus, FileText, AlertCircle,
} from 'lucide-react'
import { useProcurementStore } from '@/lib/procurement-store'
import {
  PO_STATUS_LABEL, PO_STATUS_COLOR,
  BRAND_COLORS,
  type MockPurchaseOrder, type POStatus,
} from '@/lib/mock/procurement-data'
import Link from 'next/link'
import { POLineItemsTable } from './POLineItemsTable'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Status filter pill ───────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ key: POStatus | 'ALL'; label: string }> = [
  { key: 'ALL',               label: 'All'       },
  { key: 'DRAFT',             label: 'Draft'     },
  { key: 'SUBMITTED',         label: 'Submitted' },
  { key: 'PARTIALLY_RECEIVED',label: 'Partial'   },
  { key: 'FULLY_RECEIVED',    label: 'Received'  },
  { key: 'CANCELLED',         label: 'Cancelled' },
]

// ─── PO row card ──────────────────────────────────────────────────────────────

function POCard({
  order, isActive, onClick, onStatusChange,
}: {
  order: MockPurchaseOrder
  isActive: boolean
  onClick: () => void
  onStatusChange: (status: POStatus) => void
}) {
  const sc = PO_STATUS_COLOR[order.status]
  const totalLanding = order.lineItems.reduce((s, l) => s + (l.landingCost ?? 0) * l.qtyOrdered, 0)
  const brandColor   = BRAND_COLORS[order.vendorName?.toUpperCase() ?? ''] ?? '#888'

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px', cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
        background: isActive ? 'var(--surface)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--text-primary)' : '3px solid transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
        }}>
          {order.poNumber}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '2px 7px', borderRadius: 20,
          background: sc.bg, color: sc.text,
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
        }}>
          {PO_STATUS_LABEL[order.status]}
        </div>
      </div>

      {order.projectName && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', marginBottom: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {order.projectName}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 10, fontWeight: 600,
          color: brandColor,
          fontFamily: 'var(--font-ui)',
        }}>
          {order.vendorName ?? (order.mode === 'BULK_COMPANY' ? 'Bulk' : 'Project')}
        </div>
        {totalLanding > 0 && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatINR(totalLanding)}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
        {formatDate(order.createdAt)} · {order.lineItems.length} line{order.lineItems.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ─── PO detail panel ──────────────────────────────────────────────────────────

function PODetail({ order, onStatusChange }: {
  order: MockPurchaseOrder
  onStatusChange: (status: POStatus) => void
}) {
  const sc = PO_STATUS_COLOR[order.status]
  const brandColor = BRAND_COLORS[order.vendorName?.toUpperCase() ?? ''] ?? '#888'
  const totalLanding = order.lineItems.reduce((s, l) => s + (l.landingCost ?? 0) * l.qtyOrdered, 0)
  const totalClient  = order.lineItems.reduce((s, l) => s + (l.clientOfferRate ?? 0) * l.qtyOrdered, 0)
  const margin       = totalClient > 0
    ? Math.round(((totalClient - totalLanding) / totalClient) * 100)
    : null

  const NEXT_STATUS: Partial<Record<POStatus, POStatus>> = {
    DRAFT:              'SUBMITTED',
    SUBMITTED:          'PARTIALLY_RECEIVED',
    PARTIALLY_RECEIVED: 'FULLY_RECEIVED',
  }
  const nextStatus = NEXT_STATUS[order.status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Detail header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', marginBottom: 3,
            }}>
              {order.poNumber}
            </div>
            {order.projectName && (
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
              }}>
                {order.projectName}
              </div>
            )}
            {order.vendorName && (
              <div style={{
                fontSize: 11, fontWeight: 700, color: brandColor,
                fontFamily: 'var(--font-ui)', marginTop: 2,
              }}>
                {order.vendorName}
              </div>
            )}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: sc.bg, color: sc.text,
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
          }}>
            {PO_STATUS_LABEL[order.status]}
          </div>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {totalLanding > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Landing cost</div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              }}>
                {formatINR(totalLanding)}
              </div>
            </div>
          )}
          {totalClient > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Client value</div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              }}>
                {formatINR(totalClient)}
              </div>
            </div>
          )}
          {margin !== null && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Margin</div>
              <div style={{
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: margin >= 20 ? '#16A34A' : margin >= 10 ? '#D97706' : '#DC2626',
              }}>
                {margin}%
              </div>
            </div>
          )}
        </div>

        {nextStatus && (
          <button
            onClick={() => onStatusChange(nextStatus)}
            style={{
              marginTop: 10, height: 32, padding: '0 14px', borderRadius: 7,
              border: 'none', background: 'var(--text-primary)',
              color: 'var(--background)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <ChevronRight size={12} />
            Mark as {PO_STATUS_LABEL[nextStatus]}
          </button>
        )}
      </div>

      {/* Line items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <POLineItemsTable
          poId={order.id}
          lineItems={order.lineItems}
          readonly={order.status === 'FULLY_RECEIVED' || order.status === 'CANCELLED'}
        />
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 4,
          }}>
            Notes
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)',
            lineHeight: 1.5,
          }}>
            {order.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function POListClient() {
  const { orders, activeOrderId, setActiveOrder, updatePOStatus } = useProcurementStore()
  const [statusFilter, setStatusFilter] = React.useState<POStatus | 'ALL'>('ALL')
  const [search, setSearch]             = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      if (q && !o.poNumber.toLowerCase().includes(q) &&
               !o.projectName?.toLowerCase().includes(q) &&
               !o.vendorName?.toLowerCase().includes(q))       return false
      return true
    })
  }, [orders, statusFilter, search])

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? filtered[0] ?? null

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', height: '100%', overflow: 'hidden' }}
    >
      {/* Left list */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--background)',
      }}>
        {/* List header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--border)', borderRadius: 7,
            padding: '0 8px', height: 30, background: 'var(--surface)',
            marginBottom: 8,
          }}>
            <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                fontSize: 11, outline: 'none',
              }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(({ key, label }) => {
              const active = statusFilter === key
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    height: 20, padding: '0 7px', borderRadius: 20,
                    border: active ? 'none' : '1px solid var(--border)',
                    background: active ? 'var(--text-primary)' : 'transparent',
                    color: active ? 'var(--background)' : 'var(--text-muted)',
                    fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* PO list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', paddingTop: 60, gap: 8,
              color: 'var(--text-muted)',
            }}>
              <FileText size={28} style={{ opacity: 0.25 }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)' }}>
                No purchase orders
              </span>
              <Link
                href="/purchases/new"
                style={{
                  fontSize: 11, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', fontWeight: 600,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                  marginTop: 4,
                }}
              >
                <Plus size={11} />
                Create new order
              </Link>
            </div>
          ) : (
            filtered.map((order) => (
              <POCard
                key={order.id}
                order={order}
                isActive={order.id === activeOrder?.id}
                onClick={() => setActiveOrder(order.id)}
                onStatusChange={(s) => updatePOStatus(order.id, s)}
              />
            ))
          )}
        </div>

        {/* New order button */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Link
            href="/purchases/new"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              height: 34, borderRadius: 7,
              background: 'var(--text-primary)', color: 'var(--background)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
              textDecoration: 'none',
            }}
          >
            <Plus size={13} />
            New Purchase Order
          </Link>
        </div>
      </div>

      {/* Right detail */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeOrder ? (
          <PODetail
            order={activeOrder}
            onStatusChange={(s) => updatePOStatus(activeOrder.id, s)}
          />
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10,
            color: 'var(--text-muted)',
          }}>
            <Package size={40} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              Select a purchase order to view details
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
