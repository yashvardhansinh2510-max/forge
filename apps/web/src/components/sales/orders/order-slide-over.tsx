'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { MapPin, Check } from 'lucide-react'
import { toast } from 'sonner'
import { SlideOver, DetailField } from '@/components/crm/shared/slide-over'
import { StatusBadge } from '../shared/status-badge'
import { DocumentTotals } from '../shared/document-totals'
import { calcDocumentTotals, type SalesOrder, type OrderStatus } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

interface OrderSlideOverProps {
  order: SalesOrder | null
  onClose: () => void
}

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Order Placed' },
  { status: 'processing', label: 'Processing' },
  { status: 'dispatched', label: 'Dispatched' },
  { status: 'delivered', label: 'Delivered' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  confirmed: 0, processing: 1, dispatched: 2, delivered: 3, cancelled: -1,
}

function Timeline({ status }: { status: OrderStatus }) {
  const currentIdx = STATUS_ORDER[status] ?? -1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 20 }}>
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const isLast = i === ORDER_STEPS.length - 1
        return (
          <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: done || active ? 'var(--accent)' : 'var(--border-default)', transition: 'background 300ms' }} />}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--accent)' : active ? 'white' : 'var(--border-default)',
                border: active ? '2px solid var(--accent)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 300ms',
              }}>
                {done && <Check size={12} color="white" strokeWidth={2.5} />}
                {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
              </div>
              {!isLast && <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--border-default)', transition: 'background 300ms' }} />}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-tertiary)', textAlign: 'center' }}>
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function OrderSlideOver({ order, onClose }: OrderSlideOverProps) {
  if (!order) return null

  const totals = calcDocumentTotals(order.lineItems)

  function handleMarkDispatched() {
    toast.success(`${order!.number} marked as dispatched`)
    onClose()
  }

  function handleMarkDelivered() {
    toast.success(`${order!.number} marked as delivered`)
    onClose()
  }

  function handleCreateInvoice() {
    toast.success(`INV-2025-0157 created from ${order!.number}`)
    onClose()
  }

  return (
    <SlideOver open={!!order} onClose={onClose} title={order.number} subtitle={order.projectName} width={520}>
      {/* Status badge + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <StatusBadge status={order.status} size="md" />
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Created {format(order.createdAt, 'dd MMM yyyy')}
        </span>
      </div>

      {/* Timeline */}
      {order.status !== 'cancelled' && <Timeline status={order.status} />}

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />

      {/* Customer */}
      <DetailField label="Customer" value={order.customerName} />
      <DetailField
        label="Delivery Address"
        value={
          <div style={{ display: 'flex', gap: 5 }}>
            <MapPin size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
            {order.deliveryAddress}
          </div>
        }
      />
      <DetailField label="Expected Delivery" value={format(order.deliveryDate, 'dd MMM yyyy')} />
      {order.dispatchedAt && <DetailField label="Dispatched At" value={format(order.dispatchedAt, 'dd MMM yyyy, h:mm a')} />}
      {order.deliveredAt && <DetailField label="Delivered At" value={format(order.deliveredAt, 'dd MMM yyyy, h:mm a')} />}
      {order.notes && <DetailField label="Notes" value={order.notes} />}

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />

      {/* Line items (read-only) */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Line Items
        </div>
        {order.lineItems.map((item) => {
          const subtotal = item.qty * item.unitPrice
          const discountAmt = subtotal * (item.discount / 100)
          const taxableAmt = subtotal - discountAmt
          const gstAmt = taxableAmt * (item.gstRate / 100)
          const total = taxableAmt + gstAmt
          return (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{item.productName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{item.qty} {item.unit} × {formatINR(item.unitPrice)}{item.discount > 0 && ` (−${item.discount}%)`}</div>
              </div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)', marginLeft: 12 }}>
                {formatINR(total, true)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DocumentTotals lineItems={order.lineItems} compact />
      </div>

      {/* Footer actions */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {order.status === 'confirmed' && (
          <>
            <button onClick={() => toast.success('Order marked as processing')} style={{ height: 34, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Mark Processing
            </button>
            <button onClick={() => toast.info('Order cancelled')} style={{ height: 34, padding: '0 14px', borderRadius: 7, border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--danger)' }}>
              Cancel Order
            </button>
          </>
        )}
        {order.status === 'processing' && (
          <button onClick={handleMarkDispatched} style={{ height: 34, padding: '0 14px', borderRadius: 7, border: 'none', background: '#7C3AED', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Mark Dispatched
          </button>
        )}
        {order.status === 'dispatched' && (
          <button onClick={handleMarkDelivered} style={{ height: 34, padding: '0 14px', borderRadius: 7, border: 'none', background: '#15803D', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Mark Delivered
          </button>
        )}
        {order.status === 'delivered' && (
          <button onClick={handleCreateInvoice} style={{ height: 34, padding: '0 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            Create Invoice →
          </button>
        )}
      </div>
    </SlideOver>
  )
}
