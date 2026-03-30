'use client'

import * as React from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { Badge } from '@/components/shared/badge'
import { deliveries, DELIVERY_STATUS_CONFIG } from '@/lib/mock/deliveries-data'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

interface KPITileProps {
  label: string
  value: number | string
}

function KPITile({ label, value }: KPITileProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 'var(--r-md)',
        padding: '16px 20px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 6px', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeliveriesClient() {
  const today = new Date()
  const todayStr = today.toDateString()

  const scheduled = deliveries.filter(d => d.status === 'scheduled').length
  const dispatched = deliveries.filter(d => d.status === 'dispatched' || d.status === 'out_for_delivery').length
  const deliveredToday = deliveries.filter(d =>
    d.status === 'delivered' && d.scheduledDate.toDateString() === todayStr
  ).length
  const failed = deliveries.filter(d => d.status === 'failed').length

  return (
    <PageContainer
      title="Deliveries"
      subtitle={`${deliveries.length} deliveries`}
    >
      {/* KPI Tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPITile label="Scheduled" value={scheduled} />
        <KPITile label="Dispatched" value={dispatched} />
        <KPITile label="Delivered Today" value={deliveredToday} />
        <KPITile label="Failed" value={failed} />
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-base)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Delivery #', 'Customer', 'Items', 'Scheduled Date', 'Address', 'Status', 'Actions'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery, idx) => {
              const cfg = DELIVERY_STATUS_CONFIG[delivery.status]
              const firstItem = delivery.items[0]
              const itemLabel = firstItem
                ? delivery.items.length > 1
                  ? `${firstItem.productName} +${delivery.items.length - 1} more`
                  : firstItem.productName
                : '—'

              return (
                <tr
                  key={delivery.id}
                  style={{
                    borderBottom: idx < deliveries.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Delivery # */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {delivery.deliveryNumber}
                    </span>
                    <p style={{ fontSize: 11, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                      {delivery.orderNumber}
                    </p>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {delivery.customerName}
                    </p>
                    {delivery.customerCompany && (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                        {delivery.customerCompany}
                      </p>
                    )}
                  </td>

                  {/* Items */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 220 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {itemLabel}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                      {delivery.items.length} item{delivery.items.length !== 1 ? 's' : ''}
                    </p>
                  </td>

                  {/* Scheduled Date */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                      {formatDate(delivery.scheduledDate)}
                    </span>
                  </td>

                  {/* Address */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 200 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {delivery.address}
                    </p>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <Badge label={cfg.label} dot={cfg.dot} />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <button
                      onClick={() => {}}
                      style={{
                        height: 28,
                        padding: '0 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
