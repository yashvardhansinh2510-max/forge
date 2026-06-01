'use client'

import * as React from 'react'
import { Search, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { SalesNav } from '../shared/sales-nav'
import { OrderTable } from './order-table'
import { OrderSlideOver } from './order-slide-over'
import { salesOrders, calcDocumentTotals, type SalesOrder } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

const STATUS_FILTERS = ['all', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'] as const

export function OrdersClient() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [selectedOrder, setSelectedOrder] = React.useState<SalesOrder | null>(null)

  const totalValue = salesOrders.reduce((sum, o) => sum + calcDocumentTotals(o.lineItems).grandTotal, 0)

  const filtered = salesOrders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchSearch = !search ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const actions = (
    <Button size="sm" onClick={() => toast.success('New order coming soon')}>
      <Plus size={14} className="mr-1.5" />
      New Order
    </Button>
  )

  return (
    <PageContainer
      title="Sales"
      subtitle={`${salesOrders.length} active orders · ${formatINR(totalValue, true)}`}
      actions={actions}
    >
      <SalesNav />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', height: 32, padding: '0 10px 0 30px', fontSize: 13,
              background: 'var(--surface-tint)', border: '1.5px solid transparent', borderRadius: 8,
              outline: 'none', boxSizing: 'border-box', transition: 'all 150ms',
            }}
            onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = 'rgba(0,113,227,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
            onBlur={(e) => { e.target.style.background = 'var(--surface-tint)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border-default)'}`,
                background: statusFilter === s ? 'var(--accent-light)' : 'white',
                color: statusFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: statusFilter === s ? 600 : 500, cursor: 'pointer',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <OrderTable data={filtered} globalFilter={search} onRowClick={setSelectedOrder} />

      <OrderSlideOver order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </PageContainer>
  )
}
