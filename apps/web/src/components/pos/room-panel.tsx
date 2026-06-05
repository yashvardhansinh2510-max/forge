'use client'

import * as React from 'react'
import {
  Plus, X, MoreHorizontal, GripVertical, Trash2, Percent,
  ChevronLeft, ChevronRight, Copy, ArrowRightLeft, Palette,
  Pencil, AlertTriangle, Eraser,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePOSStore, useActiveRoom, effectiveDiscountSource } from '@/lib/pos-store'
import type { Room, RoomItem } from '@/lib/pos-store'
import type { Finish } from '@/lib/mock/pos-data'
import { ProductVisual } from './product-visual'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

// ─── Inline Confirm ───────────────────────────────────────────────────────────

function InlineConfirm({
  message, confirmLabel, onConfirm, onCancel,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, zIndex: 60,
        background: 'var(--background)', border: '1px solid #fca5a5',
        borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        padding: '10px 12px', minWidth: 200,
      }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-start' }}>
          <AlertTriangle size={13} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{message}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'transparent', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '4px 10px', borderRadius: 5, border: 'none',
              background: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Room Tab ─────────────────────────────────────────────────────────────────

function RoomTab({
  room, isActive, onClick, onRename, onDelete, onDuplicate, onClear,
}: {
  room: Room
  isActive: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onDuplicate: () => void
  onClear: () => void
}) {
  const [editing, setEditing]     = React.useState(false)
  const [draft, setDraft]         = React.useState(room.name)
  const [menuOpen, setMenuOpen]   = React.useState(false)
  const [confirmDelete, setConfirmDelete]   = React.useState(false)
  const [confirmClear, setConfirmClear]     = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const menuRef  = React.useRef<HTMLDivElement>(null)

  const startEdit = () => {
    setDraft(room.name)
    setEditing(true)
    setMenuOpen(false)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const confirmEdit = () => {
    setEditing(false)
    const name = draft.trim()
    if (name && name !== room.name) onRename(name)
    else setDraft(room.name)
  }

  const itemCount = room.items.filter((i) => !i.isAutoAdded).length

  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
      <button
        onClick={onClick}
        onDoubleClick={startEdit}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '0 6px 0 10px', height: '100%',
          background: 'transparent', border: 'none',
          borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
          cursor: 'pointer', whiteSpace: 'nowrap', minWidth: 0,
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setEditing(false); setDraft(room.name) }
            }}
            style={{
              width: Math.max(60, draft.length * 7),
              fontSize: 12, fontWeight: 600,
              color: 'var(--text-primary)',
              border: 'none', background: 'transparent', outline: 'none',
            }}
          />
        ) : (
          <span style={{
            fontSize: 12,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {room.name}
          </span>
        )}
        {itemCount > 0 && (
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 999,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            background: isActive ? 'rgba(0,0,0,0.07)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            {itemCount}
          </span>
        )}
      </button>

      {/* ⋯ menu — visible on active tab */}
      {isActive && (
        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            title="Room actions"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4,
              border: 'none', background: menuOpen ? 'var(--surface)' : 'transparent',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = menuOpen ? 'var(--surface)' : 'transparent' }}
          >
            <MoreHorizontal size={12} />
          </button>

          {menuOpen && !confirmDelete && !confirmClear && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 30,
                background: 'var(--background)', border: '1px solid var(--border)',
                borderRadius: 9, boxShadow: '0 6px 20px rgba(0,0,0,0.13)',
                minWidth: 150, overflow: 'hidden', padding: '4px 0',
              }}>
                {/* Rename */}
                <button
                  onClick={() => { setMenuOpen(false); startEdit() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                  Rename room
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => { setMenuOpen(false); onDuplicate() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Copy size={12} style={{ color: 'var(--text-muted)' }} />
                  Duplicate room
                </button>

                {/* Clear room */}
                {room.items.length > 0 && (
                  <button
                    onClick={() => { setConfirmClear(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#f59e0b', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.07)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Eraser size={12} />
                    Clear all items
                  </button>
                )}

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                {/* Delete */}
                <button
                  onClick={() => { setConfirmDelete(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#ef4444', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={12} />
                  Delete room
                </button>
              </div>
            </>
          )}

          {/* Confirm: clear room */}
          {confirmClear && (
            <InlineConfirm
              message={`Clear all ${itemCount} items from "${room.name}"? This cannot be undone.`}
              confirmLabel="Clear items"
              onConfirm={() => { setConfirmClear(false); setMenuOpen(false); onClear() }}
              onCancel={() => { setConfirmClear(false); setMenuOpen(false) }}
            />
          )}

          {/* Confirm: delete room */}
          {confirmDelete && (
            <InlineConfirm
              message={`Delete "${room.name}" and its ${itemCount} item${itemCount !== 1 ? 's' : ''}? This cannot be undone.`}
              confirmLabel="Delete room"
              onConfirm={() => { setConfirmDelete(false); setMenuOpen(false); onDelete() }}
              onCancel={() => { setConfirmDelete(false); setMenuOpen(false) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Room Button ──────────────────────────────────────────────────────────

function AddRoomButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [active, setActive] = React.useState(false)
  const [value, setValue]   = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    setValue('')
    setActive(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleConfirm = () => {
    const name = value.trim()
    if (name) onAdd(name)
    setActive(false)
  }

  if (active) {
    return (
      <input
        ref={inputRef}
        value={value}
        placeholder="Room name…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm()
          if (e.key === 'Escape') setActive(false)
        }}
        style={{
          width: 110, fontSize: 11, padding: '3px 8px',
          border: '1px solid var(--border)', borderRadius: 5,
          background: 'var(--background)', color: 'var(--text-primary)', outline: 'none',
        }}
      />
    )
  }

  return (
    <button
      onClick={handleOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '3px 8px', border: '1px dashed var(--border)',
        borderRadius: 5, background: 'transparent', cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: 11, flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <Plus size={11} />
      Add room
    </button>
  )
}

// ─── Finish Picker ────────────────────────────────────────────────────────────

function FinishPicker({
  finishes, currentFinish, onSelect, onClose,
}: {
  finishes: Finish[]
  currentFinish: Finish
  onSelect: (f: Finish) => void
  onClose: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, zIndex: 40,
        background: 'var(--background)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        padding: 8, minWidth: 160, maxHeight: 200, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 4px 6px' }}>
          Select Finish
        </div>
        {finishes.map((f) => (
          <button
            key={f.code}
            onClick={() => { onSelect(f); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '6px 8px', borderRadius: 5,
              border: 'none',
              background: f.code === currentFinish.code ? 'var(--surface-tint)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = f.code === currentFinish.code ? 'var(--surface-tint)' : 'transparent' }}
          >
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              background: f.color || '#B0B7BC',
              border: '1px solid rgba(0,0,0,0.12)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-primary)', flex: 1 }}>{f.name || 'Chrome'}</span>
            {f.priceAdj !== 0 && (
              <span style={{ fontSize: 9, color: f.priceAdj > 0 ? '#ef4444' : '#22c55e' }}>
                {f.priceAdj > 0 ? '+' : ''}{formatINR(f.priceAdj)}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Move To Room Picker ──────────────────────────────────────────────────────

function MoveRoomPicker({
  rooms, currentRoomId, onMove, onClose,
}: {
  rooms: Room[]
  currentRoomId: string
  onMove: (targetRoomId: string) => void
  onClose: () => void
}) {
  const otherRooms = rooms.filter((r) => r.id !== currentRoomId)
  if (otherRooms.length === 0) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, zIndex: 40,
        background: 'var(--background)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        padding: 8, minWidth: 150,
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 4px 6px' }}>
          Move To
        </div>
        {otherRooms.map((r) => (
          <button
            key={r.id}
            onClick={() => { onMove(r.id); onClose() }}
            style={{
              display: 'block', width: '100%', padding: '6px 8px', borderRadius: 5,
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-primary)', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {r.name}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Discount Source Badge ────────────────────────────────────────────────────

function DiscountBadge({
  globalDiscount, roomDiscount, itemDiscount,
}: {
  globalDiscount: number
  roomDiscount: number
  itemDiscount: number
}) {
  const { pct, source } = effectiveDiscountSource(globalDiscount, roomDiscount, itemDiscount)
  if (pct === 0) return null

  const LABELS: Record<string, { label: string; bg: string; color: string; title: string }> = {
    global: { label: 'G', bg: 'rgba(99,102,241,0.12)', color: '#4338ca', title: `Global discount: ${pct}% wins` },
    room:   { label: 'R', bg: 'rgba(249,115,22,0.12)', color: '#c2410c', title: `Room discount: ${pct}% wins over global (${globalDiscount}%)` },
    item:   { label: 'I', bg: 'rgba(16,185,129,0.12)', color: '#047857', title: `Item discount: ${pct}% wins over global (${globalDiscount}%) and room (${roomDiscount}%)` },
  }

  const badge = LABELS[source]
  if (!badge) return null

  return (
    <span
      title={badge.title}
      style={{
        fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3,
        background: badge.bg, color: badge.color,
        letterSpacing: '0.04em', flexShrink: 0, cursor: 'default',
      }}
    >
      {badge.label}
    </span>
  )
}

// ─── Sortable Cart Item ───────────────────────────────────────────────────────

function SortableCartItem({
  item, roomId, rooms, globalDiscount, roomDiscount,
}: {
  item: RoomItem
  roomId: string
  rooms: Room[]
  globalDiscount: number
  roomDiscount: number
}) {
  const removeItem         = usePOSStore((s) => s.removeItem)
  const updateItemQty      = usePOSStore((s) => s.updateItemQty)
  const updateItemDiscount = usePOSStore((s) => s.updateItemDiscount)
  const updateItemFinish   = usePOSStore((s) => s.updateItemFinish)
  const moveItem           = usePOSStore((s) => s.moveItem)
  const duplicateItem      = usePOSStore((s) => s.duplicateItem)

  const [showFinishPicker, setShowFinishPicker] = React.useState(false)
  const [showMoveRoom, setShowMoveRoom]         = React.useState(false)
  const [qtyText, setQtyText]                   = React.useState(String(item.quantity))

  React.useEffect(() => { setQtyText(String(item.quantity)) }, [item.quantity])

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const unitMRP        = item.product.mrp + item.finish.priceAdj
  const lineMRP        = unitMRP * item.quantity
  const { pct: effectiveDisc } = effectiveDiscountSource(globalDiscount, roomDiscount, item.itemDiscount ?? 0)
  const lineOffer      = lineMRP * (1 - effectiveDisc / 100)
  const hasMultiFinish = item.product.finishes.length > 1

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex', alignItems: 'flex-start', gap: 7,
        padding: '9px 10px 7px 4px',
        borderBottom: '1px solid var(--border)',
        background: isDragging ? 'var(--surface)' : 'transparent',
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes} {...listeners}
        title="Drag to reorder"
        style={{
          flexShrink: 0, width: 18, height: 18, marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 3, border: 'none', background: 'transparent',
          cursor: 'grab', color: 'var(--text-muted)', touchAction: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <GripVertical size={11} />
      </button>

      {/* Product image */}
      <div style={{ flexShrink: 0, marginTop: -1 }}>
        <ProductVisual product={item.product} finish={item.finish} size={28} muted={item.isAutoAdded} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Product name */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          marginBottom: 2, minWidth: 0,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.product.name}
          </span>
          {item.product.isCustom && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(249,115,22,0.12)', color: '#c2410c',
              letterSpacing: '0.04em', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              CUSTOM
            </span>
          )}
        </div>

        {/* Finish + MRP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: effectiveDisc > 0 ? 3 : 5 }}>
          {item.finish.color && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: item.finish.color, border: '1px solid rgba(0,0,0,0.10)', flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.finish.name || '—'}
          </span>
          <span style={{
            fontSize: 10, flexShrink: 0,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: effectiveDisc > 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
            textDecoration: effectiveDisc > 0 ? 'line-through' : 'none',
          }}>
            {formatINR(lineMRP)}
          </span>
        </div>

        {/* Offer price + source badge */}
        {effectiveDisc > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)', letterSpacing: '-0.01em',
            }}>
              {formatINR(lineOffer)}
            </span>
            <span style={{ fontSize: 9, color: '#22c55e' }}>
              -{Math.round(effectiveDisc * 100) / 100}%
            </span>
            {/* Which discount level is winning */}
            <DiscountBadge
              globalDiscount={globalDiscount}
              roomDiscount={roomDiscount}
              itemDiscount={item.itemDiscount ?? 0}
            />
          </div>
        )}

        {/* Controls row: qty + item-level discount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {/* Qty stepper */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(['−', '+'] as const).map((lbl, idx) => (
              <button
                key={lbl}
                onClick={() => updateItemQty(roomId, item.id, idx === 0 ? -1 : 1)}
                style={{
                  width: 20, height: 20, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: idx === 0 ? '4px 0 0 4px' : '0 4px 4px 0',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--background)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              >
                {lbl}
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => {
                const parsed  = parseInt(qtyText, 10)
                const clamped = isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, 999)
                updateItemQty(roomId, item.id, clamped - item.quantity)
                setQtyText(String(clamped))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  e.currentTarget.blur()
                if (e.key === 'Escape') { setQtyText(String(item.quantity)); e.currentTarget.blur() }
              }}
              style={{
                width: 32, height: 20, textAlign: 'center',
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                borderLeft: 'none', borderRight: 'none',
                fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)', background: 'transparent', outline: 'none',
              }}
            />
          </div>

          {/* Per-item discount with label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginRight: 2 }}>Item%</span>
            <input
              type="number" min={0} max={60} step={1}
              value={Math.round((item.itemDiscount ?? 0) * 100) / 100}
              onChange={(e) => updateItemDiscount(roomId, item.id, Number(e.target.value))}
              title="Per-item discount % (overrides global/room if higher)"
              style={{
                width: 32, textAlign: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '4px 0 0 4px', padding: '2px 3px',
                fontSize: 10, fontWeight: 600,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <div style={{
              height: 20, padding: '0 4px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: 'none', borderRadius: '0 4px 4px 0',
              fontSize: 10, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}>%</div>
          </div>
        </div>

        {/* Action row: Change Finish · Move · Duplicate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {hasMultiFinish && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowFinishPicker((v) => !v); setShowMoveRoom(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 6px', borderRadius: 4,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', fontSize: 9, color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              >
                <Palette size={9} />
                Finish
              </button>
              {showFinishPicker && (
                <FinishPicker
                  finishes={item.product.finishes}
                  currentFinish={item.finish}
                  onSelect={(f) => updateItemFinish(roomId, item.id, f)}
                  onClose={() => setShowFinishPicker(false)}
                />
              )}
            </div>
          )}

          {rooms.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowMoveRoom((v) => !v); setShowFinishPicker(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 6px', borderRadius: 4,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', fontSize: 9, color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              >
                <ArrowRightLeft size={9} />
                Move
              </button>
              {showMoveRoom && (
                <MoveRoomPicker
                  rooms={rooms}
                  currentRoomId={roomId}
                  onMove={(targetId) => moveItem(roomId, targetId, item.id)}
                  onClose={() => setShowMoveRoom(false)}
                />
              )}
            </div>
          )}

          <button
            onClick={() => duplicateItem(roomId, item.id)}
            title="Duplicate item"
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '2px 6px', borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', fontSize: 9, color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
          >
            <Copy size={9} />
            Duplicate
          </button>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeItem(roomId, item.id)}
        title="Remove item"
        style={{
          flexShrink: 0, width: 18, height: 18, marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ─── Rooms Footer ─────────────────────────────────────────────────────────────

function roomOfferTotal(room: Room, globalDiscount: number): { items: number; offer: number; mrp: number } {
  let mrp = 0, offer = 0, items = 0
  for (const item of room.items) {
    if (item.isAutoAdded) continue
    const lineMRP = (item.product.mrp + item.finish.priceAdj) * item.quantity
    const { pct } = effectiveDiscountSource(globalDiscount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
    mrp   += lineMRP
    offer += lineMRP * (1 - pct / 100)
    items += item.quantity
  }
  return { items, offer, mrp }
}

function RoomsFooter({
  rooms, activeRoomId, globalDiscount, onSelectRoom,
}: {
  rooms: Room[]
  activeRoomId: string | null
  globalDiscount: number
  onSelectRoom: (id: string) => void
}) {
  const roomData    = rooms.map((r) => ({ ...r, ...roomOfferTotal(r, globalDiscount) }))
  const grandMRP    = roomData.reduce((s, r) => s + r.mrp, 0)
  const grandOffer  = roomData.reduce((s, r) => s + r.offer, 0)
  const grandItems  = roomData.reduce((s, r) => s + r.items, 0)
  const populated   = roomData.filter((r) => r.items > 0)
  const cgst        = grandOffer * 0.14
  const sgst        = grandOffer * 0.14
  const grandTotal  = grandOffer + cgst + sgst

  return (
    <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
      {populated.map((room) => {
        const isActive = room.id === activeRoomId
        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', padding: '5px 14px', gap: 6,
              border: 'none', background: isActive ? 'var(--surface-tint)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
              borderLeft: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 11, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
              {room.name}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {room.items} items
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              letterSpacing: '-0.01em', flexShrink: 0,
            }}>
              {formatINR(room.offer)}
            </span>
          </button>
        )
      })}

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Subtotal ({grandItems} items)</span>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: grandMRP > grandOffer ? 'var(--text-muted)' : 'var(--text-secondary)',
            textDecoration: grandMRP > grandOffer ? 'line-through' : 'none',
          }}>
            {formatINR(grandMRP)}
          </span>
        </div>
        {grandMRP > grandOffer && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>After discount</span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
              {formatINR(grandOffer)}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>CGST @ 14%</span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
            +{formatINR(cgst)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>SGST @ 14%</span>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
            +{formatINR(sgst)}
          </span>
        </div>
        {/* Discount legend */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'G', desc: 'Global', bg: 'rgba(99,102,241,0.12)', color: '#4338ca' },
            { label: 'R', desc: 'Room',   bg: 'rgba(249,115,22,0.12)', color: '#c2410c' },
            { label: 'I', desc: 'Item',   bg: 'rgba(16,185,129,0.12)', color: '#047857' },
          ].map(({ label, desc, bg, color }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: bg, color }}>{label}</span>
              {desc} disc.
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Total incl. GST</span>
          <span style={{
            fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
          }}>
            {formatINR(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Room Summary Bar ─────────────────────────────────────────────────────────

function RoomSummaryBar({ room, globalDiscount }: { room: Room; globalDiscount: number }) {
  const mainItems = room.items.filter((i) => !i.isAutoAdded)
  let mrp = 0, offer = 0
  for (const item of mainItems) {
    const lineMRP = (item.product.mrp + item.finish.priceAdj) * item.quantity
    const { pct } = effectiveDiscountSource(globalDiscount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
    mrp   += lineMRP
    offer += lineMRP * (1 - pct / 100)
  }
  const cgst  = offer * 0.14
  const sgst  = offer * 0.14
  const total = offer + cgst + sgst

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '2px 0', padding: '5px 10px 4px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(0,0,0,0.015)', fontSize: 9,
      fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{mainItems.length} item{mainItems.length !== 1 ? 's' : ''}</span>
      <span style={{ textAlign: 'right', color: 'var(--text-muted)', textDecoration: mrp > offer ? 'line-through' : 'none' }}>
        MRP {formatINR(mrp)}
      </span>
      {mrp > offer && (
        <>
          <span style={{ color: 'var(--text-muted)' }}>After discount</span>
          <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {formatINR(offer)}
          </span>
        </>
      )}
      <span style={{ color: 'var(--text-muted)' }}>GST (CGST+SGST 28%)</span>
      <span style={{ textAlign: 'right', color: 'var(--text-muted)' }}>+{formatINR(cgst + sgst)}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 10, paddingTop: 1 }}>Room total</span>
      <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, fontSize: 10, paddingTop: 1 }}>
        {formatINR(total)}
      </span>
    </div>
  )
}

// ─── Room Panel ───────────────────────────────────────────────────────────────

interface RoomPanelProps {
  collapsed: boolean
  onToggle: () => void
}

export function RoomPanel({ collapsed, onToggle }: RoomPanelProps) {
  const rooms           = usePOSStore((s) => s.rooms)
  const activeRoomId    = usePOSStore((s) => s.activeRoomId)
  const project         = usePOSStore((s) => s.project)
  const setActiveRoom   = usePOSStore((s) => s.setActiveRoom)
  const addRoom         = usePOSStore((s) => s.addRoom)
  const removeRoom      = usePOSStore((s) => s.removeRoom)
  const renameRoom      = usePOSStore((s) => s.renameRoom)
  const duplicateRoom   = usePOSStore((s) => s.duplicateRoom)
  const clearRoom       = usePOSStore((s) => s.clearRoom)
  const setRoomDiscount    = usePOSStore((s) => s.setRoomDiscount)
  const removeItem         = usePOSStore((s) => s.removeItem)
  const updateItemDiscount = usePOSStore((s) => s.updateItemDiscount)
  const reorderItems       = usePOSStore((s) => s.reorderItems)
  const activeRoom      = useActiveRoom()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const mainItems = activeRoom?.items.filter((i) => !i.isAutoAdded) ?? []
  const autoItems = activeRoom?.items.filter((i) => i.isAutoAdded) ?? []

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !activeRoomId) return
    const fromIndex = mainItems.findIndex((i) => i.id === active.id)
    const toIndex   = mainItems.findIndex((i) => i.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) reorderItems(activeRoomId, fromIndex, toIndex)
  }

  if (collapsed) {
    return (
      <div style={{
        width: 36, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderLeft: '1px solid var(--border)', background: 'var(--background)',
        overflow: 'hidden', paddingTop: 8, gap: 6,
      }}>
        <button
          onClick={onToggle}
          title="Expand room panel"
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
        >
          <ChevronLeft size={13} />
        </button>
        {rooms.map((room) => {
          const itemCount = room.items.filter((i) => !i.isAutoAdded).length
          return (
            <button
              key={room.id}
              title={`${room.name} (${itemCount} items)`}
              onClick={() => setActiveRoom(room.id)}
              style={{
                width: 24, height: 24, borderRadius: 5,
                background: room.id === activeRoomId ? 'var(--surface-tint)' : 'transparent',
                border: `1px solid ${room.id === activeRoomId ? 'var(--border)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                position: 'relative',
              }}
            >
              {room.name.charAt(0).toUpperCase()}
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#1d4ed8', color: '#fff',
                  fontSize: 7, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border)', background: 'var(--background)',
      overflow: 'hidden',
    }}>
      {/* Room tab strip */}
      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          height: 38, display: 'flex', alignItems: 'stretch',
          overflowX: 'auto', scrollbarWidth: 'thin',
          paddingLeft: 2, paddingRight: 4, gap: 2,
        }}>
          <button
            onClick={onToggle}
            title="Collapse room panel"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4, alignSelf: 'center', flexShrink: 0,
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <ChevronRight size={11} />
          </button>

          {rooms.map((room) => (
            <RoomTab
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              onClick={() => setActiveRoom(room.id)}
              onRename={(name) => renameRoom(room.id, name)}
              onDelete={() => removeRoom(room.id)}
              onDuplicate={() => duplicateRoom(room.id)}
              onClear={() => clearRoom(room.id)}
            />
          ))}

          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 6, flexShrink: 0 }}>
            <AddRoomButton onAdd={(name) => addRoom(name)} />
          </div>
        </div>

        {/* Room discount row */}
        {activeRoom && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderTop: '1px solid var(--border-subtle)',
            background: 'var(--surface)',
          }}>
            <Percent size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
              {activeRoom.name} room discount
            </span>
            <input
              type="number" min={0} max={60} step={1}
              value={activeRoom.roomDiscount ?? 0}
              onChange={(e) => setRoomDiscount(activeRoom.id, Number(e.target.value))}
              title="Room discount % — overrides global if higher"
              style={{
                width: 36, textAlign: 'center',
                background: 'var(--background)', border: '1px solid var(--border)',
                borderRadius: '4px 0 0 4px', padding: '2px 3px',
                fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <div style={{
              height: 22, padding: '0 5px',
              background: 'var(--background)', border: '1px solid var(--border)',
              borderLeft: 'none', borderRadius: '0 4px 4px 0',
              fontSize: 10, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}>%</div>
          </div>
        )}

        {/* Room summary */}
        {activeRoom && activeRoom.items.filter((i) => !i.isAutoAdded).length > 0 && (
          <RoomSummaryBar room={activeRoom} globalDiscount={project.globalDiscount} />
        )}
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {mainItems.length === 0 && autoItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', gap: 8,
            color: 'var(--text-muted)', textAlign: 'center',
          }}>
            <span style={{ fontSize: 28 }}>🛁</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>No items yet</span>
            <span style={{ fontSize: 11, maxWidth: 180, lineHeight: 1.5 }}>
              Click any product card in the catalog to add it here
            </span>
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={mainItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {mainItems.map((item) => (
                  <SortableCartItem
                    key={item.id}
                    item={item}
                    roomId={activeRoomId ?? ''}
                    rooms={rooms}
                    globalDiscount={project.globalDiscount}
                    roomDiscount={activeRoom?.roomDiscount ?? 0}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {autoItems.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px 3px', fontSize: 9, fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.07em', background: 'var(--surface)',
                }}>
                  Auto-bundled concealed parts
                </div>
                {autoItems.map((item) => {
                  const unitPrice = item.product.mrp + item.finish.priceAdj
                  const disc      = Math.max(project.globalDiscount, activeRoom?.roomDiscount ?? 0, item.itemDiscount ?? 0)
                  const lineMRP   = unitPrice * item.quantity
                  const lineOffer = lineMRP * (1 - disc / 100)
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 12px', borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)', opacity: 0.85,
                      }}
                    >
                      <ProductVisual product={item.product} finish={item.finish} size={26} muted />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </div>
                      </div>
                      {/* Concealed-part item discount */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <input
                          type="number" min={0} max={60} step={1}
                          value={item.itemDiscount ?? 0}
                          onChange={(e) => activeRoomId && updateItemDiscount(activeRoomId, item.id, Number(e.target.value))}
                          title="Item discount % for this concealed part"
                          style={{
                            width: 30, textAlign: 'center',
                            background: 'var(--background)', border: '1px solid var(--border)',
                            borderRadius: '4px 0 0 4px', padding: '1px 2px',
                            fontSize: 9, fontWeight: 600,
                            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                            color: 'var(--text-primary)', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
                          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                        />
                        <div style={{
                          height: 18, padding: '0 3px',
                          background: 'var(--background)', border: '1px solid var(--border)',
                          borderLeft: 'none', borderRadius: '0 4px 4px 0',
                          fontSize: 9, color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                        }}>%</div>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: disc > 0 ? '#16a34a' : 'var(--text-muted)', flexShrink: 0 }}>
                        {formatINR(lineOffer)}
                      </span>
                      <button
                        onClick={() => activeRoomId && removeItem(activeRoomId, item.id)}
                        style={{
                          flexShrink: 0, width: 18, height: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 3, border: 'none', background: 'transparent',
                          cursor: 'pointer', color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {rooms.some((r) => r.items.length > 0) && (
        <RoomsFooter
          rooms={rooms}
          activeRoomId={activeRoomId}
          globalDiscount={project.globalDiscount}
          onSelectRoom={setActiveRoom}
        />
      )}
    </div>
  )
}
