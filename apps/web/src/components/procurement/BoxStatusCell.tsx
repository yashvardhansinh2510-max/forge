'use client'

// ─── BoxStatusCell ─────────────────────────────────────────────────────────────
//
// Per-line-item dispatch tracker shown in the BOX STATUS column of POCodeTable.
//
// Shows for a given productId across all boxes linked to this PO's project:
//   • Total units in box
//   • Progress bar (filled = dispatched, empty = still in box)
//   • Per-unit status rows (simulated from qtyTotal / qtyDispatched)
//   • "Mark Given" inline action → calls dispatchBoxItem optimistically
//
// If no box items exist for this product, renders "—" quietly.

import * as React from 'react'
import { ChevronDown, Check, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useProcurementStore } from '@/lib/procurement-store'
import type { MockInventoryBoxItem, MockInventoryBox } from '@/lib/mock/procurement-data'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoxStatusCellProps {
  productId:   string
  projectName: string | null
  /** All boxes for the PO's project — passed down from POCodePanel */
  boxes: MockInventoryBox[]
  readonly?: boolean
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? (filled / total) * 100 : 0
  return (
    <div style={{
      width: '100%', height: 5, borderRadius: 3,
      background: 'rgba(107,114,128,0.15)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: pct >= 100 ? '#16A34A' : '#2563EB',
        borderRadius: 3, transition: 'width 0.3s',
      }} />
    </div>
  )
}

// ─── Unit row (simulated — one row per unit) ──────────────────────────────────

function UnitRows({ dispatched, total }: { dispatched: number; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < dispatched
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {done ? (
              <Check size={9} style={{ color: '#16A34A', flexShrink: 0 }} />
            ) : (
              <Clock size={9} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-ui)',
              color: done ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {done ? 'Dispatched' : 'In box — awaiting pickup'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mark given inline control ────────────────────────────────────────────────

function MarkGivenControl({
  boxId, itemId, maxQty, onDone,
}: {
  boxId: string; itemId: string; maxQty: number; onDone: () => void
}) {
  const dispatchBoxItem = useProcurementStore((s) => s.dispatchBoxItem)
  const [qty, setQty]   = React.useState(1)
  const [open, setOpen] = React.useState(false)

  if (maxQty <= 0) return null

  function handleDispatch() {
    dispatchBoxItem(boxId, itemId, qty)
    toast.success(`Marked ${qty} unit${qty > 1 ? 's' : ''} as dispatched`)
    setOpen(false)
    onDone()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 5, height: 22, padding: '0 8px', borderRadius: 5,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)',
          fontSize: 9, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
          whiteSpace: 'nowrap',
        }}
      >
        Mark given
        <ChevronDown size={8} />
      </button>
    )
  }

  return (
    <div style={{
      marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <input
        type="number"
        value={qty}
        min={1}
        max={maxQty}
        onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value))))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleDispatch()
          if (e.key === 'Escape') setOpen(false)
        }}
        autoFocus
        style={{
          width: 36, height: 22, padding: '0 4px', textAlign: 'center',
          border: '1.5px solid var(--text-primary)', borderRadius: 4,
          background: 'var(--background)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          fontSize: 11, outline: 'none',
        }}
      />
      <button
        onClick={handleDispatch}
        style={{
          height: 22, padding: '0 7px', borderRadius: 4,
          border: 'none', background: 'var(--text-primary)',
          color: 'var(--background)', fontFamily: 'var(--font-ui)',
          fontSize: 9, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ✓
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{
          height: 22, width: 22, borderRadius: 4,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          fontSize: 11, cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BoxStatusCell({ productId, projectName, boxes, readonly = false }: BoxStatusCellProps) {
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Find all box items for this product across all relevant boxes
  const matches: Array<{ box: MockInventoryBox; item: MockInventoryBoxItem }> = []
  for (const box of boxes) {
    for (const item of box.items) {
      if (item.productId === productId) {
        matches.push({ box, item })
      }
    }
  }

  if (matches.length === 0) {
    return (
      <span style={{
        fontSize: 11, color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
      }}>
        —
      </span>
    )
  }

  // Aggregate across all box items for this product
  const totalInBox    = matches.reduce((s, m) => s + m.item.qtyTotal,      0)
  const totalGiven    = matches.reduce((s, m) => s + m.item.qtyDispatched,  0)
  const totalPending  = totalInBox - totalGiven

  // For the "Mark Given" control, use the first box item that still has pending qty
  const dispatchable  = matches.find((m) => m.item.qtyDispatched < m.item.qtyTotal)

  return (
    <div style={{ minWidth: 120, maxWidth: 180 }}>
      {/* Progress bar + counters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar filled={totalGiven} total={totalInBox} />
        </div>
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {totalGiven}/{totalInBox}
        </span>
      </div>

      {/* Client / project label */}
      {projectName && (
        <div style={{
          fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {projectName}
        </div>
      )}

      {/* Per-unit rows */}
      <UnitRows dispatched={totalGiven} total={Math.min(totalInBox, 4)} />
      {totalInBox > 4 && (
        <div style={{
          fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          marginTop: 2,
        }}>
          +{totalInBox - 4} more units
        </div>
      )}

      {/* Mark given control */}
      {!readonly && dispatchable && totalPending > 0 && (
        <MarkGivenControl
          key={refreshKey}
          boxId={dispatchable.box.id}
          itemId={dispatchable.item.id}
          maxQty={dispatchable.item.qtyTotal - dispatchable.item.qtyDispatched}
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {/* All dispatched */}
      {totalPending === 0 && totalInBox > 0 && (
        <div style={{
          marginTop: 4, fontSize: 9, fontWeight: 700,
          color: '#16A34A', fontFamily: 'var(--font-ui)',
        }}>
          ✓ All delivered
        </div>
      )}
    </div>
  )
}
