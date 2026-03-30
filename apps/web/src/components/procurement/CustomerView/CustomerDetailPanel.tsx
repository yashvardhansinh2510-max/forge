'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { MOCK_CUSTOMERS, BRAND_COLORS, BRANDS_ORDERED } from '@/lib/mock/procurement-data'
import type { BoxAllocationStatus } from '@/lib/mock/procurement-data'
import { getLinesForCustomer, getInitials, getAvatarColor } from '@/lib/tracker-utils'
import { OrderRow } from './OrderRow'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }

// ─── Status filter key → which BoxAllocationStatus values it matches ──────────

type CustomerStatKey = 'products' | 'pending' | 'inBox' | 'delivered'

const CUST_STAT_ALLOCS: Record<Exclude<CustomerStatKey, 'products'>, BoxAllocationStatus[]> = {
  pending:   ['ORDERED'],
  inBox:     ['IN_BOX', 'DEL_PENDING'],
  delivered: ['DELIVERED', 'GIVEN_OTHER'],
}

export function CustomerDetailPanel() {
  const activeCustomerId = usePurchasesStore((s) => s.activeCustomerId)
  const toggleKPICard    = usePurchasesStore((s) => s.toggleKPICard)
  const orders           = useProcurementStore((s) => s.orders)
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<CustomerStatKey>('products')
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')

  if (!activeCustomerId) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
        color: '#9ca3af', fontFamily: 'var(--font-ui)',
      }}>
        <span style={{ fontSize: 32 }}>👥</span>
        <span style={{ fontSize: 13 }}>Select a customer to view their orders</span>
      </div>
    )
  }

  const customer = MOCK_CUSTOMERS.find((c) => c.id === activeCustomerId)
  if (!customer) return null

  const initials    = getInitials(customer.clientName)
  const avatarColor = getAvatarColor(customer.clientName)

  // All lines for this customer (brand-filtered)
  const allLines = getLinesForCustomer(orders, activeCustomerId, brandFilter)

  // Compute live KPIs from all lines (no status filter applied yet)
  let pendingCount   = 0
  let inBoxCount     = 0
  let deliveredCount = 0

  for (const { alloc } of allLines) {
    if (alloc.boxStatus === 'ORDERED')                                         pendingCount  += alloc.qty
    if (alloc.boxStatus === 'IN_BOX' || alloc.boxStatus === 'DEL_PENDING')     inBoxCount    += alloc.qty
    if (alloc.boxStatus === 'DELIVERED' || alloc.boxStatus === 'GIVEN_OTHER')  deliveredCount += alloc.qty
  }

  // Apply status filter on top of brand filter
  const filteredLines = statusFilter === 'products'
    ? allLines
    : allLines.filter(({ alloc }) =>
        CUST_STAT_ALLOCS[statusFilter].includes(alloc.boxStatus)
      )

  const customerBrands = Array.from(new Set(allLines.map((l) => l.line.productBrand)))

  function handleStatClick(key: CustomerStatKey) {
    setStatusFilter((prev) => prev === key ? 'products' : key)
  }

  const statsConfig: Array<{
    key:   CustomerStatKey
    label: string
    value: number
    color: string
    bg:    string
  }> = [
    { key: 'products',  label: 'Products',  value: allLines.length, color: '#374151', bg: '#f3f4f6'               },
    { key: 'pending',   label: 'Pending',   value: pendingCount,    color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
    { key: 'inBox',     label: 'In Box',    value: inBoxCount,      color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
    { key: 'delivered', label: 'Delivered', value: deliveredCount,  color: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  ]

  const pendingTotal = pendingCount + inBoxCount
  const nextDelivery = deliveryDate || customer.expectedDelivery

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: avatarColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-ui)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)' }}>
              {customer.clientName}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
              {customer.projectName}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
              {customer.siteAddress}
            </div>
          </div>
        </div>

        {/* KPI stat boxes — now clickable toggle buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {statsConfig.map(({ key, label, value, color, bg }) => {
            const active = statusFilter === key
            return (
              <button
                key={key}
                onClick={() => handleStatClick(key)}
                title={active ? `Show all products` : `Filter to ${label} only`}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8,
                  background: active ? bg : '#f9fafb',
                  border: active
                    ? `1.5px solid ${color}55`
                    : '1.5px solid transparent',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: 'none',
                  boxShadow: active ? `0 0 0 2px ${color}18` : 'none',
                }}
              >
                <div style={{ ...NUM, fontSize: 18, fontWeight: 700, color: active ? color : '#6b7280' }}>
                  {value}
                </div>
                <div style={{
                  fontSize: 9, color: active ? color : '#9ca3af',
                  fontFamily: 'var(--font-ui)', marginTop: 2,
                  fontWeight: active ? 700 : 400,
                  transition: 'color 0.15s',
                }}>
                  {label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Active filter indicator */}
        {statusFilter !== 'products' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 10,
            padding: '5px 10px', borderRadius: 6,
            background: '#fef3c7',
            border: '1px solid #fde68a',
          }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: '#92400e', fontWeight: 500 }}>
              Showing: <strong>{statsConfig.find((s) => s.key === statusFilter)?.label}</strong> items only
            </span>
            <button
              onClick={() => setStatusFilter('products')}
              style={{
                fontSize: 10, fontFamily: 'var(--font-ui)', color: '#92400e',
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Brand filter bar */}
      {customerBrands.length > 1 && (
        <div style={{
          padding: '10px 20px',
          background: '#fafafa',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', gap: 6, alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, color: '#9ca3af', fontFamily: 'var(--font-ui)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4,
          }}>
            Brand:
          </span>
          {['ALL', ...customerBrands].map((b) => {
            const active = brandFilter === b
            const color  = BRAND_COLORS[b] ?? '#374151'
            return (
              <button
                key={b}
                onClick={() => setBrandFilter(b)}
                style={{
                  padding: '3px 10px', borderRadius: 12,
                  border: active ? `1.5px solid ${b === 'ALL' ? '#374151' : color}` : '1px solid #e5e7eb',
                  background: active ? (b === 'ALL' ? '#111827' : `${color}14`) : '#fff',
                  color: active ? (b === 'ALL' ? '#fff' : color) : '#6b7280',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                {b}
              </button>
            )
          })}
        </div>
      )}

      {/* Order rows */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {filteredLines.length === 0 ? (
          <div style={{
            padding: '32px 20px', textAlign: 'center',
            fontSize: 13, color: '#9ca3af', fontFamily: 'var(--font-ui)',
          }}>
            {statusFilter !== 'products'
              ? `No ${statsConfig.find((s) => s.key === statusFilter)?.label.toLowerCase()} items${brandFilter !== 'ALL' ? ` for ${brandFilter}` : ''}.`
              : `No orders for this customer${brandFilter !== 'ALL' ? ` under ${brandFilter}` : ''}.`
            }
          </div>
        ) : (
          filteredLines.map(({ order, line, alloc }) => (
            <OrderRow key={line.id} order={order} line={line} alloc={alloc} />
          ))
        )}
      </div>

      {/* Footer — interactive */}
      {pendingTotal > 0 && (
        <div style={{
          padding: '10px 20px',
          background: '#fef9ec',
          borderTop: '1px solid #fde68a',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* "X units pending" — click to open Pending KPI drill-down */}
          <button
            onClick={() => toggleKPICard('pendingFromCo')}
            title="View all pending items in drill-down panel"
            style={{
              fontSize: 12, fontFamily: 'var(--font-ui)', color: '#92400e', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              textDecoration: 'underline dotted', textUnderlineOffset: 2,
            }}
          >
            {pendingTotal} units pending delivery ↗
          </button>

          {/* "Next: date" — click to reschedule */}
          {!editingDelivery ? (
            <button
              onClick={() => {
                setDeliveryDate(
                  nextDelivery
                    ? new Date(nextDelivery).toISOString().slice(0, 10)
                    : ''
                )
                setEditingDelivery(true)
              }}
              title="Reschedule next delivery"
              style={{
                fontSize: 11, fontFamily: 'var(--font-ui)', color: '#b45309',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                textDecoration: 'underline dotted', textUnderlineOffset: 2,
              }}
            >
              {nextDelivery
                ? `Next: ${new Date(nextDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ✎`
                : 'Set delivery date ✎'
              }
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                autoFocus
                style={{
                  fontSize: 11, fontFamily: 'var(--font-ui)', color: '#111827',
                  border: '1px solid #d1d5db', borderRadius: 5,
                  padding: '3px 6px', background: '#fff', outline: 'none',
                }}
              />
              <button
                onClick={() => setEditingDelivery(false)}
                style={{
                  fontSize: 10, padding: '3px 8px',
                  background: '#111827', color: '#fff',
                  border: 'none', borderRadius: 5,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                }}
              >
                Done
              </button>
              <button
                onClick={() => { setDeliveryDate(''); setEditingDelivery(false) }}
                style={{
                  fontSize: 10, padding: '3px 6px',
                  background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 5,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
