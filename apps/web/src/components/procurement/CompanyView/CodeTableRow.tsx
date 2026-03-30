'use client'

import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { BRAND_COLORS, STAGE_COLORS } from '@/lib/mock/procurement-data'
import type { POStage, MockPurchaseOrder, MockPOLineItem } from '@/lib/mock/procurement-data'
import { getLineAggregates, getInitials, getAvatarColor } from '@/lib/tracker-utils'
import { CustomerBoxGrid }     from './CustomerBoxGrid'

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

// Stage pipeline definition — order matters for display
const PIPELINE: Array<{
  field: keyof MockPOLineItem
  stage: POStage
  label: string
}> = [
  { field: 'qtyPendingCo',    stage: 'PENDING_CO',    label: 'Pend. Co.'  },
  { field: 'qtyPendingDist',  stage: 'PENDING_DIST',  label: 'Pend. Dist.'},
  { field: 'qtyAtGodown',     stage: 'AT_GODOWN',     label: 'At Godown'  },
  { field: 'qtyInBox',        stage: 'IN_BOX',        label: 'In Box'     },
  { field: 'qtyDispatched',   stage: 'DISPATCHED',    label: 'Dispatched' },
  { field: 'qtyNotDisplayed', stage: 'NOT_DISPLAYED', label: 'Not Disp.'  },
]

interface Props {
  order: MockPurchaseOrder
  line:  MockPOLineItem
}

export function CodeTableRow({ order, line }: Props) {
  const selectedLineId     = usePurchasesStore((s) => s.selectedLineId)
  const expandedLineId     = usePurchasesStore((s) => s.expandedLineId)
  const setSelectedLine    = usePurchasesStore((s) => s.setSelectedLine)
  const toggleExpandedLine = usePurchasesStore((s) => s.toggleExpandedLine)
  const openMoveStageModal = usePurchasesStore((s) => s.openMoveStageModal)

  const isSelected = selectedLineId === line.id
  const isExpanded = expandedLineId === line.id
  const agg        = getLineAggregates(line)
  const brandColor = BRAND_COLORS[line.productBrand] ?? '#374151'

  // "Unallocated" = ordered but not in any pipeline stage yet
  const staged = PIPELINE.reduce((sum, s) => sum + (line[s.field] as number), 0)
  const unallocated = Math.max(0, line.qtyOrdered - staged)

  // Active pipeline stages (qty > 0) — for dot strip
  const activeDots = PIPELINE.filter((s) => (line[s.field] as number) > 0)

  function handleRowClick() { setSelectedLine(isSelected ? null : line.id) }
  function handleExpandClick(e: React.MouseEvent) {
    e.stopPropagation()
    toggleExpandedLine(line.id)
  }
  function handleMoveClick(e: React.MouseEvent) {
    e.stopPropagation()
    openMoveStageModal(order.id, line.id)
  }

  return (
    <>
      <tr
        onClick={handleRowClick}
        data-testid={`code-row-${line.id}`}
        style={{
          background: isSelected ? '#f0f9ff' : 'transparent',
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f9fafb'
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
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

        {/* Product / Code + pipeline dots + Move button */}
        <td style={{ ...TD, minWidth: 200, maxWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line.productName}
              </div>
              <div style={{ ...NUM, fontSize: 10, marginTop: 2, color: brandColor, fontWeight: 600, letterSpacing: '0.04em' }}>
                {line.productSku}
              </div>

              {/* Pipeline dot strip */}
              {(activeDots.length > 0 || unallocated > 0) && (
                <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                  {unallocated > 0 && (
                    <span
                      title={`${unallocated} ordered — not yet in pipeline`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        fontSize: 8, fontWeight: 700,
                        color: '#6b7280', background: '#f3f4f6',
                        padding: '1px 5px', borderRadius: 8,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9ca3af', display: 'inline-block' }} />
                      {unallocated}
                    </span>
                  )}
                  {activeDots.map((s) => {
                    const qty   = line[s.field] as number
                    const color = STAGE_COLORS[s.stage]
                    return (
                      <span
                        key={s.field}
                        title={`${qty} at ${s.label}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                          fontSize: 8, fontWeight: 700,
                          color, background: `${color}14`,
                          padding: '1px 5px', borderRadius: 8,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        {qty}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Move Stage button (appears on hover via parent row hover) */}
            <button
              onClick={handleMoveClick}
              title="Move stage qty"
              data-testid={`move-stage-btn-${line.id}`}
              style={{
                flexShrink: 0,
                fontSize: 9, fontWeight: 700,
                color: '#6b7280', background: '#f3f4f6',
                border: '1px solid #e5e7eb', borderRadius: 5,
                padding: '2px 6px',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                opacity: 0.6,
                transition: 'opacity 0.1s, background 0.1s',
                marginTop: 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = '#e5e7eb' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; (e.currentTarget as HTMLElement).style.background = '#f3f4f6' }}
            >
              Move
            </button>
          </div>
        </td>

        {/* Company badge */}
        <td style={TD}>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
            background: `${brandColor}14`, color: brandColor,
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
            letterSpacing: '0.04em',
          }}>
            {order.vendorName}
          </span>
        </td>

        {/* Qty ordered */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: '#374151', fontWeight: 600 }}>
          {line.qtyOrdered}
        </td>

        {/* Pend. Co */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyPendingCo > 0 ? '#F5A623' : '#d1d5db', fontWeight: line.qtyPendingCo > 0 ? 700 : 400 }}>
          {line.qtyPendingCo > 0 ? line.qtyPendingCo : '—'}
        </td>

        {/* Pend. Dist */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyPendingDist > 0 ? '#E8762C' : '#d1d5db', fontWeight: line.qtyPendingDist > 0 ? 700 : 400 }}>
          {line.qtyPendingDist > 0 ? line.qtyPendingDist : '—'}
        </td>

        {/* At Godown */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyAtGodown > 0 ? '#4A90D9' : '#d1d5db', fontWeight: line.qtyAtGodown > 0 ? 700 : 400 }}>
          {line.qtyAtGodown > 0 ? line.qtyAtGodown : '—'}
        </td>

        {/* In Box */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyInBox > 0 ? '#7B68EE' : '#d1d5db', fontWeight: line.qtyInBox > 0 ? 700 : 400 }}>
          {line.qtyInBox > 0 ? line.qtyInBox : '—'}
        </td>

        {/* Dispatched */}
        <td style={{ ...TD, ...NUM, textAlign: 'right', color: line.qtyDispatched > 0 ? '#27AE60' : '#d1d5db', fontWeight: line.qtyDispatched > 0 ? 700 : 400 }}>
          {line.qtyDispatched > 0 ? line.qtyDispatched : '—'}
        </td>

        {/* Customer avatars */}
        <td style={{ ...TD, paddingRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
