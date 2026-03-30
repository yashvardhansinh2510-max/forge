'use client'

import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { BRAND_COLORS }        from '@/lib/mock/procurement-data'
import { getLineAggregates, getInitials, getAvatarColor } from '@/lib/tracker-utils'
import { CustomerBoxGrid }     from './CustomerBoxGrid'
import type { MockPurchaseOrder, MockPOLineItem } from '@/lib/mock/procurement-data'

const NUM: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }

const TD: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
}

interface Props {
  order: MockPurchaseOrder
  line:  MockPOLineItem
}

export function CodeTableRow({ order, line }: Props) {
  const selectedLineId   = usePurchasesStore((s) => s.selectedLineId)
  const expandedLineId   = usePurchasesStore((s) => s.expandedLineId)
  const setSelectedLine  = usePurchasesStore((s) => s.setSelectedLine)
  const toggleExpandedLine = usePurchasesStore((s) => s.toggleExpandedLine)

  const isSelected = selectedLineId === line.id
  const isExpanded = expandedLineId === line.id
  const agg        = getLineAggregates(line)
  const brandColor = BRAND_COLORS[line.productBrand] ?? '#374151'
  const pending    = agg.pendingQty

  function handleRowClick() {
    setSelectedLine(isSelected ? null : line.id)
  }

  function handleExpandClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggleExpandedLine(line.id)
  }

  const rowBg = isSelected ? '#f0f9ff' : 'transparent'

  return (
    <>
      <tr
        onClick={handleRowClick}
        style={{
          background: rowBg,
          cursor: 'pointer',
          borderLeft: '3px solid transparent',
          transition: 'background 0.12s',
        }}
      >
        {/* Expand arrow */}
        <td style={{ ...TD, width: 36, paddingRight: 4, paddingLeft: 12 }}>
          <button
            onClick={handleExpandClick}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#9ca3af', padding: '2px 4px',
              borderRadius: 4,
              transform: isExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          >
            ▶
          </button>
        </td>

        {/* Product / Code */}
        <td style={{ ...TD, minWidth: 200, maxWidth: 260 }}>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>
            {line.productName}
          </div>
          <div style={{
            ...NUM, fontSize: 10, marginTop: 2,
            color: brandColor, fontWeight: 600, letterSpacing: '0.04em',
          }}>
            {line.productSku}
          </div>
        </td>

        {/* Company badge */}
        <td style={TD}>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
            background: `${brandColor}14`,
            color: brandColor,
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
            letterSpacing: '0.04em',
          }}>
            {order.vendorName}
          </span>
        </td>

        {/* Qty ordered */}
        <td style={{ ...TD, ...NUM, textAlign: 'right' }}>
          {line.qtyOrdered}
        </td>

        {/* Ordered (has active PO) */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyOrdered > 0 ? '#2563eb' : '#d1d5db', fontWeight: 600 }}>
          {line.qtyOrdered > 0 ? line.qtyOrdered : '—'}
        </td>

        {/* Pending (in transit) */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: pending > 0 ? '#d97706' : '#d1d5db', fontWeight: pending > 0 ? 600 : 400 }}>
          {pending > 0 ? pending : '—'}
        </td>

        {/* In Box */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: agg.inBoxQty > 0 ? '#059669' : '#d1d5db', fontWeight: agg.inBoxQty > 0 ? 600 : 400 }}>
          {agg.inBoxQty > 0 ? agg.inBoxQty : '—'}
        </td>

        {/* Dispatched */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: agg.dispatchedQty > 0 ? '#16a34a' : '#d1d5db', fontWeight: agg.dispatchedQty > 0 ? 600 : 400 }}>
          {agg.dispatchedQty > 0 ? agg.dispatchedQty : '—'}
        </td>

        {/* Customer avatars */}
        <td style={{ ...TD, paddingRight: 16 }}>
          <div style={{ display: 'flex', gap: -4, alignItems: 'center' }}>
            {agg.customers.slice(0, 5).map((name, i) => (
              <div
                key={name}
                title={name}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: getAvatarColor(name), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-ui)',
                  border: '1.5px solid #fff',
                  marginLeft: i === 0 ? 0 : -6,
                  zIndex: 10 - i,
                  position: 'relative',
                }}
              >
                {getInitials(name)}
              </div>
            ))}
            {agg.customers.length > 5 && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#e5e7eb', color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-ui)',
                border: '1.5px solid #fff', marginLeft: -6,
              }}>
                +{agg.customers.length - 5}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded customer box grid */}
      {isExpanded && (
        <tr>
          <td colSpan={10} style={{ padding: 0, border: 'none' }}>
            <CustomerBoxGrid poId={order.id} line={line} />
          </td>
        </tr>
      )}
    </>
  )
}
