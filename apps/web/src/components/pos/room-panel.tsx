'use client'

import * as React from 'react'
import { Plus, X, MoreHorizontal, GripVertical, Trash2, Percent, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { usePOSStore, useActiveRoom } from '@/lib/pos-store'
import type { Room, RoomItem } from '@/lib/pos-store'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

// ─── Room Tab ──────────────────────────────────────────────────────────────────

function RoomTab({
  room,
  isActive,
  onClick,
  onRename,
  onDelete,
}: {
  room: Room
  isActive: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing]   = React.useState(false)
  const [draft, setDraft]       = React.useState(room.name)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setDraft(room.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const confirmEdit = () => {
    setEditing(false)
    const name = draft.trim()
    if (name && name !== room.name) onRename(name)
    else setDraft(room.name)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
      <button
        onClick={onClick}
        onDoubleClick={startEdit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 8px 0 10px',
          height: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.currentTarget.blur() }
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
          <span
            style={{
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {room.name}
          </span>
        )}
        {room.items.filter((i) => !i.isAutoAdded).length > 0 && (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              padding: '1px 5px',
              borderRadius: 999,
              background: isActive ? 'rgba(0,0,0,0.07)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {room.items.filter((i) => !i.isAutoAdded).length}
          </span>
        )}
      </button>

      {isActive && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 4,
              border: 'none', background: menuOpen ? 'var(--surface)' : 'transparent',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <MoreHorizontal size={11} />
          </button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 20,
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  minWidth: 130, overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => { setMenuOpen(false); startEdit() }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 12, color: 'var(--text-primary)', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Rename room
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 12, color: '#EF4444', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Delete room
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Room Button ───────────────────────────────────────────────────────────

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
          width: 110, fontSize: 11,
          padding: '3px 8px',
          border: '1px solid var(--border)',
          borderRadius: 5,
          background: 'var(--background)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <button
      onClick={handleOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '3px 8px',
        border: '1px dashed var(--border)',
        borderRadius: 5,
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: 11,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <Plus size={11} />
      Add
    </button>
  )
}

// ─── Sortable Cart Item ────────────────────────────────────────────────────────

function SortableCartItem({
  item,
  roomId,
  globalDiscount,
  roomDiscount,
}: {
  item: RoomItem
  roomId: string
  globalDiscount: number
  roomDiscount: number
}) {
  const removeItem         = usePOSStore((s) => s.removeItem)
  const updateItemQty      = usePOSStore((s) => s.updateItemQty)
  const updateItemDiscount = usePOSStore((s) => s.updateItemDiscount)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const unitMRP        = item.product.mrp + item.finish.priceAdj
  const lineMRP        = unitMRP * item.quantity
  // Highest of global, room-level, item-level discount wins
  const effectiveDisc  = Math.max(globalDiscount, roomDiscount, item.itemDiscount ?? 0)
  const lineOffer      = lineMRP * (1 - effectiveDisc / 100)
  const hasItemDisc    = (item.itemDiscount ?? 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        padding: '9px 10px 9px 4px',
        borderBottom: '1px solid var(--border)',
        background: isDragging ? 'var(--surface)' : 'transparent',
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        style={{
          flexShrink: 0, width: 18, height: 18, marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 3, border: 'none', background: 'transparent',
          cursor: 'grab', color: 'var(--text-muted)',
          touchAction: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <GripVertical size={11} />
      </button>

      {/* Emoji */}
      <div style={{ fontSize: 16, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>
        {item.product.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Product name */}
        <div
          style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {item.product.name}
        </div>

        {/* Finish + MRP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          {item.finish.color && (
            <div
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: item.finish.color,
                border: '1px solid rgba(0,0,0,0.10)',
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.finish.name || '—'}
          </span>
          <span
            style={{
              fontSize: 10, flexShrink: 0,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              color: effectiveDisc > 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              textDecoration: effectiveDisc > 0 ? 'line-through' : 'none',
            }}
          >
            {formatINR(lineMRP)}
          </span>
        </div>

        {/* Offer price (if any discount) */}
        {effectiveDisc > 0 && (
          <div style={{ marginBottom: 5 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {formatINR(lineOffer)}
            </span>
            <span style={{ fontSize: 9, color: '#22c55e', marginLeft: 4 }}>
              -{effectiveDisc}%
              {hasItemDisc && (item.itemDiscount ?? 0) > globalDiscount && ' (item)'}
            </span>
          </div>
        )}

        {/* Bottom row: qty + item discount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Qty stepper */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => updateItemQty(roomId, item.id, -1)}
              style={{
                width: 20, height: 20, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px 0 0 4px',
                border: '1px solid var(--border)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--background)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            >−</button>
            <div
              style={{
                width: 24, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
              }}
            >
              {item.quantity}
            </div>
            <button
              onClick={() => updateItemQty(roomId, item.id, 1)}
              style={{
                width: 20, height: 20, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0 4px 4px 0',
                border: '1px solid var(--border)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--background)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            >+</button>
          </div>

          {/* Per-item discount input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={item.itemDiscount ?? 0}
              onChange={(e) => updateItemDiscount(roomId, item.id, Number(e.target.value))}
              title="Item discount %"
              style={{
                width: 32,
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px 0 0 4px',
                padding: '2px 3px',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <div
              style={{
                height: 20,
                padding: '0 4px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0',
                fontSize: 10,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >%</div>
          </div>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeItem(roomId, item.id)}
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

// ─── Room Panel ────────────────────────────────────────────────────────────────

interface RoomPanelProps {
  collapsed: boolean
  onToggle: () => void
}

export function RoomPanel({ collapsed, onToggle }: RoomPanelProps) {
  const rooms            = usePOSStore((s) => s.rooms)
  const activeRoomId     = usePOSStore((s) => s.activeRoomId)
  const project          = usePOSStore((s) => s.project)
  const setActiveRoom    = usePOSStore((s) => s.setActiveRoom)
  const addRoom          = usePOSStore((s) => s.addRoom)
  const removeRoom       = usePOSStore((s) => s.removeRoom)
  const renameRoom       = usePOSStore((s) => s.renameRoom)
  const setRoomDiscount  = usePOSStore((s) => s.setRoomDiscount)
  const removeItem       = usePOSStore((s) => s.removeItem)
  const reorderItems     = usePOSStore((s) => s.reorderItems)
  const activeRoom       = useActiveRoom()

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
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderItems(activeRoomId, fromIndex, toIndex)
    }
  }

  const roomTotals = React.useMemo(() => {
    if (!activeRoom) return { mrp: 0, offer: 0, savings: 0 }
    const gDisc = project.globalDiscount
    const rDisc = activeRoom.roomDiscount ?? 0
    let mrp = 0, offer = 0
    for (const item of activeRoom.items) {
      const lineMRP = (item.product.mrp + item.finish.priceAdj) * item.quantity
      const effectiveDisc = Math.max(gDisc, rDisc, item.itemDiscount ?? 0)
      mrp   += lineMRP
      offer += lineMRP * (1 - effectiveDisc / 100)
    }
    return { mrp, offer, savings: mrp - offer }
  }, [activeRoom, project.globalDiscount])

  if (collapsed) {
    return (
      <div
        style={{
          width: 36, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          borderLeft: '1px solid var(--border)',
          background: 'var(--background)',
          overflow: 'hidden',
          paddingTop: 8,
          gap: 6,
        }}
      >
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
        {rooms.map((room) => (
          <div
            key={room.id}
            title={room.name}
            onClick={() => setActiveRoom(room.id)}
            style={{
              width: 24, height: 24, borderRadius: 5,
              background: room.id === activeRoomId ? 'var(--surface-tint)' : 'transparent',
              border: `1px solid ${room.id === activeRoomId ? 'var(--border)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            }}
          >
            {room.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        background: 'var(--background)',
        overflow: 'hidden',
      }}
    >
      {/* Room tab strip */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {/* Tab row */}
        <div
          style={{
            height: 38,
            display: 'flex',
            alignItems: 'stretch',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingLeft: 2,
            paddingRight: 4,
            gap: 2,
          }}
        >
          {/* Collapse button */}
          <button
            onClick={onToggle}
            title="Collapse room panel"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4, alignSelf: 'center', flexShrink: 0,
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <ChevronRight size={11} />
          </button>
          {rooms.map((room) => (
            <div key={room.id} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
              <RoomTab
                room={room}
                isActive={room.id === activeRoomId}
                onClick={() => setActiveRoom(room.id)}
                onRename={(name) => renameRoom(room.id, name)}
                onDelete={() => removeRoom(room.id)}
              />
              {/* Always-visible delete X (only when there are multiple rooms) */}
              {rooms.length > 1 && room.id === activeRoomId && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeRoom(room.id) }}
                  title={`Delete ${room.name}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16, borderRadius: 4,
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', color: 'var(--text-muted)',
                    position: 'absolute', top: 2, right: -2,
                    zIndex: 5,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 6, flexShrink: 0 }}>
            <AddRoomButton onAdd={(name) => addRoom(name)} />
          </div>
        </div>

        {/* Room discount row (only for active room) */}
        {activeRoom && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
            }}
          >
            <Percent size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
              {activeRoom.name} discount
            </span>
            <input
              type="number"
              min={0} max={60} step={1}
              value={activeRoom.roomDiscount ?? 0}
              onChange={(e) => setRoomDiscount(activeRoom.id, Number(e.target.value))}
              title="Room-level discount %"
              style={{
                width: 36, textAlign: 'center',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '4px 0 0 4px',
                padding: '2px 3px', fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <div
              style={{
                height: 22, padding: '0 5px',
                background: 'var(--background)', border: '1px solid var(--border)',
                borderLeft: 'none', borderRadius: '0 4px 4px 0',
                fontSize: 10, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
              }}
            >%</div>
          </div>
        )}
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {(mainItems.length === 0 && autoItems.length === 0) ? (
          <div
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', gap: 8,
              color: 'var(--text-muted)', textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 28 }}>🛁</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>No items yet</span>
            <span style={{ fontSize: 11, maxWidth: 180, lineHeight: 1.5 }}>
              Click any product to configure &amp; add it here
            </span>
          </div>
        ) : (
          <>
            {/* DnD sortable main items */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={mainItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {mainItems.map((item) => (
                  <SortableCartItem
                    key={item.id}
                    item={item}
                    roomId={activeRoomId ?? ''}
                    globalDiscount={project.globalDiscount}
                    roomDiscount={activeRoom?.roomDiscount ?? 0}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Auto-bundled concealed parts */}
            {autoItems.length > 0 && (
              <>
                <div
                  style={{
                    padding: '6px 12px 3px',
                    fontSize: 9, fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    background: 'var(--surface)',
                  }}
                >
                  Auto-bundled concealed parts
                </div>
                {autoItems.map((item) => {
                  const lineMRP = (item.product.mrp + item.finish.priceAdj) * item.quantity
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 12px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)',
                        opacity: 0.8,
                      }}
                    >
                      <div style={{ fontSize: 14, flexShrink: 0 }}>{item.product.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 10, fontWeight: 500,
                            color: 'var(--text-secondary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {item.product.name}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-ui)',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        {formatINR(lineMRP)}
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

      {/* Footer totals */}
      {(mainItems.length > 0 || autoItems.length > 0) && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 14px',
            flexShrink: 0,
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {mainItems.length} {mainItems.length === 1 ? 'item' : 'items'} · MRP
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatINR(roomTotals.mrp)}
            </span>
          </div>
          {roomTotals.savings > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: '#16a34a' }}>Savings</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: '#16a34a', fontWeight: 600 }}>
                −{formatINR(roomTotals.savings)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Offer total
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {formatINR(roomTotals.offer)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
