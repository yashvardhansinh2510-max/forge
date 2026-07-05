'use client'

import * as React from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { EditorItemRow, type EditorItem, type LiveProduct } from './editor-item-row'

export interface BuilderRoom {
  id:    string
  name:  string
  items: EditorItem[]
}

interface RoomSectionProps {
  room:     BuilderRoom
  products: LiveProduct[]
  onChange: (updated: BuilderRoom) => void
  onDelete: () => void
}

const TH: React.CSSProperties = {
  padding: '6px 6px', textAlign: 'center', fontSize: 10, fontWeight: 600,
  color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
}

export function RoomSection({ room, products, onChange, onDelete }: RoomSectionProps) {
  const [editingName, setEditingName] = React.useState(false)
  const [nameValue, setNameValue] = React.useState(room.name)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const mrpTotal   = room.items.reduce((s, i) => s + i.mrp * i.qty, 0)
  const offerTotal = room.items.reduce((s, i) => s + i.offerRate * i.qty, 0)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIdx = room.items.findIndex((i) => i.id === active.id)
    const newIdx = room.items.findIndex((i) => i.id === over.id)
    onChange({ ...room, items: arrayMove(room.items, oldIdx, newIdx) })
  }

  function addItem() {
    onChange({ ...room, items: [...room.items, {
      id: `item-${Date.now()}`, productId: '', sku: '', productName: '', mrp: 0, qty: 1, offerRate: 0,
    }] })
  }

  function updateItem(id: string, updates: Partial<EditorItem>) {
    onChange({ ...room, items: room.items.map((i) => i.id === id ? { ...i, ...updates } : i) })
  }

  function deleteItem(id: string) {
    onChange({ ...room, items: room.items.filter((i) => i.id !== id) })
  }

  function handleDeleteRoom() {
    if (room.items.length > 0) {
      if (!window.confirm(`Delete "${room.name}" and its ${room.items.length} item(s)?`)) return
    }
    onDelete()
  }

  function commitName() {
    setEditingName(false)
    if (nameValue.trim()) onChange({ ...room, name: nameValue.trim() })
    else setNameValue(room.name)
  }

  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, marginBottom: 16, background: 'white', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(room.name) } }}
            style={{ fontSize: 14, fontWeight: 700, border: '1.5px solid rgba(0,113,227,0.5)', borderRadius: 6, padding: '2px 8px', outline: 'none', background: 'white' }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', padding: '2px 4px', borderRadius: 5 }}
            title="Click to rename"
          >
            {room.name}
          </div>
        )}
        <button
          onClick={handleDeleteRoom}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, border: '1px solid var(--border-default)', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#BE123C' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ width: 20 }} />
                <th style={TH}>Sr.No</th>
                <th style={TH}>Article No</th>
                <th style={{ ...TH, textAlign: 'left' }}>Product Description</th>
                <th style={{ ...TH, textAlign: 'right' }}>MRP</th>
                <th style={TH}>Qty</th>
                <th style={TH}>Offer Rate</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                <th style={{ width: 28 }} />
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <SortableContext items={room.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {room.items.map((item, idx) => (
                  <EditorItemRow
                    key={item.id}
                    item={item}
                    srNo={idx + 1}
                    products={products}
                    onUpdate={(u) => updateItem(item.id, u)}
                    onDelete={() => deleteItem(item.id)}
                    isLast={idx === room.items.length - 1}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={addItem}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 7, border: '1.5px dashed var(--border-default)', background: 'transparent', fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
        >
          <Plus size={12} /> Add item
        </button>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>MRP: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatINR(mrpTotal)}</span></span>
          <span style={{ color: 'var(--text-tertiary)' }}>Offer: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatINR(offerTotal)}</span></span>
        </div>
      </div>
    </div>
  )
}
