'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, RefreshCw, Search } from 'lucide-react'
import { formatINR } from '@/lib/format'

export interface EditorItem {
  id:          string
  productId:   string
  sku:         string
  productName: string
  mrp:         number
  qty:         number
  offerRate:   number
}

export interface LiveProduct {
  id:   string
  sku:  string
  name: string
  mrp:  number
}

interface EditorItemRowProps {
  item:     EditorItem
  srNo:     number
  products: LiveProduct[]
  onUpdate: (updates: Partial<EditorItem>) => void
  onDelete: () => void
  isLast:   boolean
}

function InlineNum({
  value, onChange, prefix,
}: { value: number; onChange: (v: number) => void; prefix?: string }) {
  const [editing, setEditing] = React.useState(false)
  const [raw, setRaw] = React.useState(String(value))

  React.useEffect(() => { if (!editing) setRaw(String(value)) }, [value, editing])

  if (editing) {
    return (
      <input
        autoFocus
        value={raw}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = parseFloat(raw)
          if (!isNaN(n) && n >= 0) onChange(n)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false); setRaw(String(value)) }
        }}
        style={{
          width: '100%', height: 26, padding: '0 4px',
          fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          border: '1.5px solid rgba(0,113,227,0.5)', borderRadius: 5,
          boxShadow: '0 0 0 3px rgba(0,113,227,0.12)', outline: 'none',
        }}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
        cursor: 'text', padding: '2px 4px', borderRadius: 5, transition: 'background 80ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {prefix}{value}
    </div>
  )
}

function ProductSearch({
  item, products, onUpdate, autoOpen,
}: {
  item: EditorItem
  products: LiveProduct[]
  onUpdate: (updates: Partial<EditorItem>) => void
  autoOpen?: boolean
}) {
  const [open, setOpen] = React.useState(autoOpen ?? false)
  const [query, setQuery] = React.useState('')

  const filtered = products
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  function selectProduct(p: LiveProduct) {
    onUpdate({ productId: p.id, sku: p.sku, productName: p.name, mrp: p.mrp, offerRate: p.mrp })
    setOpen(false)
    setQuery('')
  }

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} style={{ cursor: 'text' }}>
        {item.productName ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.sku}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontSize: 12 }}>
            <Search size={11} /> Search product…
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by name or SKU…"
        style={{
          width: '100%', height: 26, padding: '0 6px', fontSize: 12,
          border: '1.5px solid rgba(0,113,227,0.5)', borderRadius: 5, outline: 'none',
          boxShadow: '0 0 0 3px rgba(0,113,227,0.12)',
        }}
      />
      {filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 30, left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid var(--border-default)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => selectProduct(p)}
              style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'white' }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.sku} · {formatINR(p.mrp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EditorItemRow({ item, srNo, products, onUpdate, onDelete, isLast }: EditorItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const [replacing, setReplacing] = React.useState(false)

  function handleReplace() {
    onUpdate({ productId: '', sku: '', productName: '', mrp: 0, offerRate: 0, qty: 1 })
    setReplacing(true)
  }

  const TD: React.CSSProperties = {
    padding: '6px 6px',
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
    verticalAlign: 'middle',
    transition: 'background 80ms',
  }

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'var(--surface-tint)' : 'transparent',
      }}
    >
      <td style={{ ...TD, width: 20, cursor: 'grab', color: 'var(--text-tertiary)', paddingLeft: 4 }}
        {...attributes} {...listeners}>
        <GripVertical size={12} />
      </td>
      <td style={{ ...TD, width: 28, textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
        {srNo}
      </td>
      <td style={{ ...TD, width: 90, fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
        {item.sku || '—'}
      </td>
      <td style={{ ...TD, minWidth: 180 }}>
        <ProductSearch
          item={item}
          products={products}
          onUpdate={(u) => { onUpdate(u); setReplacing(false) }}
          autoOpen={replacing && !item.productName}
        />
      </td>
      <td style={{ ...TD, width: 80, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
        {item.mrp ? formatINR(item.mrp) : '—'}
      </td>
      <td style={{ ...TD, width: 50 }}>
        <InlineNum value={item.qty} onChange={(v) => onUpdate({ qty: Math.max(1, Math.round(v)) })} />
      </td>
      <td style={{ ...TD, width: 90 }}>
        <InlineNum value={item.offerRate} onChange={(v) => onUpdate({ offerRate: v })} prefix="₹" />
      </td>
      <td style={{ ...TD, width: 90, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {formatINR(item.offerRate * item.qty)}
      </td>
      <td style={{ ...TD, width: 28 }}>
        <button
          onClick={handleReplace}
          title="Replace item"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--border-default)', borderRadius: 5, background: 'white', cursor: 'pointer', color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={11} />
        </button>
      </td>
      <td style={{ ...TD, width: 28 }}>
        <button
          onClick={onDelete}
          title="Delete item"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--border-default)', borderRadius: 5, background: 'white', cursor: 'pointer', color: '#BE123C' }}
        >
          <Trash2 size={11} />
        </button>
      </td>
    </tr>
  )
}
