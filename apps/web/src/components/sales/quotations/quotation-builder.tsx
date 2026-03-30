'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  X, GripVertical, Plus, Send, Check, ChevronRight, Search, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { StatusBadge } from '../shared/status-badge'
import { DocumentTotals } from '../shared/document-totals'
import {
  calcDocumentTotals, customers, type Quotation, type LineItem, type QuotationStatus,
} from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'
import { products } from '@/lib/mock/inventory-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const STATUS_STEPS: QuotationStatus[] = ['draft', 'sent', 'viewed', 'accepted']

function StatusWorkflowBar({ status }: { status: QuotationStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(status === 'declined' ? 'sent' : status)
  const declined = status === 'declined'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '10px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)' }}>
      {STATUS_STEPS.map((s, i) => {
        const active = i <= currentIdx && !declined
        const isCurrent = i === currentIdx && !declined
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: declined ? '#BE123C' : active ? 'var(--accent)' : 'var(--border-default)',
                transition: 'background 300ms',
              }} />
              <span style={{ fontSize: 12, color: isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isCurrent ? 600 : 400 }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: 'var(--border-default)', margin: '0 8px', minWidth: 20 }} />
            )}
          </React.Fragment>
        )
      })}
      {declined && (
        <span style={{ marginLeft: 12, fontSize: 12, color: '#BE123C', fontWeight: 600 }}>· Declined</span>
      )}
    </div>
  )
}

function InlineNumberInput({
  value, onChange, min = 0, prefix,
}: { value: number; onChange: (v: number) => void; min?: number; prefix?: string }) {
  const [editing, setEditing] = React.useState(false)
  const [raw, setRaw] = React.useState(String(value))
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!editing) setRaw(String(value))
  }, [value, editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={raw}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = parseFloat(raw)
          if (!isNaN(n) && n >= min) onChange(n)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false); setRaw(String(value)) }
        }}
        style={{
          width: '100%', height: 28, padding: '0 6px',
          fontSize: 13, fontFamily: 'var(--font-ui)',
          fontVariantNumeric: 'tabular-nums',
          background: 'white',
          border: '1.5px solid rgba(0,113,227,0.5)',
          borderRadius: 6,
          boxShadow: '0 0 0 3px rgba(0,113,227,0.12)',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', cursor: 'text',
        padding: '3px 6px', borderRadius: 6, transition: 'background 80ms',
        background: 'transparent',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {prefix}{value}
    </div>
  )
}

function ProductSearchCell({ item, onUpdate }: { item: LineItem; onUpdate: (updates: Partial<LineItem>) => void }) {
  const [editing, setEditing] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ cursor: 'text' }}
      >
        {item.productName ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
              {item.productName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.sku}</div>
            {item.description && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.description}</div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Search product…</span>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => setTimeout(() => setEditing(false), 150)}
          placeholder="Search by name or SKU…"
          style={{
            width: '100%', height: 28, paddingLeft: 26, paddingRight: 8,
            fontSize: 12, background: 'white',
            border: '1.5px solid rgba(0,113,227,0.5)',
            borderRadius: 6, boxShadow: '0 0 0 3px rgba(0,113,227,0.12)',
            outline: 'none',
          }}
        />
      </div>
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
        background: 'white', border: '1px solid var(--border-default)',
        borderRadius: 8, boxShadow: 'var(--shadow-lg)', marginTop: 4, overflow: 'hidden',
      }}>
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseDown={() => {
              onUpdate({ productId: p.id, productName: p.name, sku: p.sku, unit: p.unit, unitPrice: p.unitPrice })
              setEditing(false)
              setSearch('')
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 12px', fontSize: 12, background: 'white', border: 'none',
              borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'white' }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{p.name}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{p.sku} · {p.brand} · {formatINR(p.unitPrice)}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>No products found</div>
        )}
      </div>
    </div>
  )
}

function SortableRow({
  item, onUpdate, onDelete, isLast,
}: { item: LineItem; onUpdate: (updates: Partial<LineItem>) => void; onDelete: () => void; isLast: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const [hovered, setHovered] = React.useState(false)

  const { total } = React.useMemo(() => {
    const subtotal = item.qty * item.unitPrice
    const discountAmt = subtotal * (item.discount / 100)
    const taxableAmt = subtotal - discountAmt
    const gstAmt = taxableAmt * (item.gstRate / 100)
    return { subtotal, discountAmt, taxableAmt, gstAmt, total: taxableAmt + gstAmt }
  }, [item])

  return (
    <motion.tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: hovered ? 'rgba(0,0,0,0.015)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes}
    >
      {/* Drag handle */}
      <td style={{ width: 24, padding: '8px 4px 8px 12px', verticalAlign: 'top' }}>
        <div
          {...listeners}
          style={{ cursor: 'grab', color: hovered ? 'var(--text-tertiary)' : 'transparent', paddingTop: 2, transition: 'color 100ms' }}
        >
          <GripVertical size={14} />
        </div>
      </td>
      {/* Product */}
      <td style={{ padding: '8px 8px', verticalAlign: 'top', minWidth: 200 }}>
        <ProductSearchCell item={item} onUpdate={onUpdate} />
      </td>
      {/* Qty */}
      <td style={{ padding: '8px 4px', verticalAlign: 'top', width: 60 }}>
        <InlineNumberInput value={item.qty} onChange={(v) => onUpdate({ qty: v })} min={1} />
      </td>
      {/* Price */}
      <td style={{ padding: '8px 4px', verticalAlign: 'top', width: 100 }}>
        <InlineNumberInput value={item.unitPrice} onChange={(v) => onUpdate({ unitPrice: v })} prefix="₹" />
      </td>
      {/* Disc % */}
      <td style={{ padding: '8px 4px', verticalAlign: 'top', width: 60 }}>
        <InlineNumberInput value={item.discount} onChange={(v) => onUpdate({ discount: Math.min(100, v) })} />
      </td>
      {/* GST */}
      <td style={{ padding: '8px 4px', verticalAlign: 'top', width: 60 }}>
        <select
          value={item.gstRate}
          onChange={(e) => onUpdate({ gstRate: Number(e.target.value) })}
          style={{ fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', outline: 'none' }}
        >
          {[5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      {/* Total */}
      <td style={{ padding: '8px 8px', verticalAlign: 'top', width: 100, textAlign: 'right' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={total.toFixed(0)}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
            style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {formatINR(total, true)}
          </motion.span>
        </AnimatePresence>
      </td>
      {/* Delete */}
      <td style={{ padding: '8px 8px', verticalAlign: 'top', width: 32 }}>
        <button
          onClick={onDelete}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 5, border: 'none', background: 'none',
            color: hovered ? '#BE123C' : 'transparent', cursor: 'pointer', transition: 'color 100ms',
          }}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </motion.tr>
  )
}

interface QuotationBuilderProps {
  quotation: Quotation | null
  onClose: () => void
  onConvertToOrder: (q: Quotation) => void
}

export function QuotationBuilder({ quotation, onClose, onConvertToOrder }: QuotationBuilderProps) {
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])
  const [status, setStatus] = React.useState<QuotationStatus>('draft')
  const [showConvertModal, setShowConvertModal] = React.useState(false)
  const [deliveryAddress, setDeliveryAddress] = React.useState('')

  React.useEffect(() => {
    if (quotation) {
      setLineItems(quotation.lineItems)
      setStatus(quotation.status)
      setDeliveryAddress(quotation.siteAddress)
    }
  }, [quotation?.id])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setLineItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  function addLineItem() {
    const newId = `li-${Date.now()}`
    setLineItems(prev => [...prev, {
      id: newId, productId: '', productName: '', sku: '', description: '',
      unit: 'pcs', qty: 1, unitPrice: 0, discount: 0, gstRate: 18,
    }])
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function deleteLineItem(id: string) {
    setLineItems(prev => prev.filter(i => i.id !== id))
  }

  function handleSend() {
    setStatus('sent')
    toast.success(`Quotation ${quotation?.number} sent to ${quotation?.customerName}`)
  }

  function handleSave() {
    toast.success('Quotation saved')
    onClose()
  }

  if (!quotation) return null

  const totals = calcDocumentTotals(lineItems)
  const canConvert = status === 'accepted'

  return (
    <DialogPrimitive.Root open={!!quotation} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {quotation && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ duration: 0.35, ease: APPLE_EASE }}
                style={{
                  position: 'fixed', right: 0, top: 0, bottom: 0, width: 720, zIndex: 51,
                  background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px)',
                  boxShadow: '-1px 0 0 rgba(0,0,0,0.06), var(--shadow-xl)',
                  display: 'flex', flexDirection: 'column', overflowY: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--accent)' }}>
                      {quotation.number}
                    </span>
                    <StatusBadge status={status} size="md" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={handleSave} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Save Draft
                    </button>
                    {canConvert ? (
                      <button
                        onClick={() => setShowConvertModal(true)}
                        style={{ height: 30, padding: '0 12px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        Convert to Order <ChevronRight size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSend}
                        style={{ height: 30, padding: '0 12px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Send size={12} />
                        Send to Customer
                      </button>
                    )}
                    <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'white', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Project subtitle */}
                <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.006em' }}>
                    {quotation.projectName}
                  </p>
                </div>

                {/* Status workflow */}
                <StatusWorkflowBar status={status} />

                {/* Body — two column */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                  {/* Left panel */}
                  <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', padding: 20 }}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Customer</label>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{quotation.customerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{quotation.customerGST}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Billing Address</label>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '18px' }}>{quotation.billingAddress}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Site Address</label>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '18px' }}>{quotation.siteAddress}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Quote Date</label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{format(quotation.createdAt, 'dd MMM yyyy')}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Valid Until</label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{format(quotation.validUntil, 'dd MMM yyyy')}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Created By</label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{quotation.createdBy}</div>
                    </div>
                    {quotation.notes && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Notes</label>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '18px' }}>{quotation.notes}</div>
                      </div>
                    )}
                    {quotation.termsAndConditions && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Terms & Conditions</label>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '18px' }}>{quotation.termsAndConditions}</div>
                      </div>
                    )}
                  </div>

                  {/* Right panel — line items */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.02)', position: 'sticky', top: 0 }}>
                            <th style={{ width: 24 }} />
                            <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Qty</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 100 }}>Price</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Disc%</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>GST</th>
                            <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: 100 }}>Total</th>
                            <th style={{ width: 32 }} />
                          </tr>
                        </thead>
                        <SortableContext items={lineItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          <tbody>
                            {lineItems.map((item, idx) => (
                              <SortableRow
                                key={item.id}
                                item={item}
                                onUpdate={(u) => updateLineItem(item.id, u)}
                                onDelete={() => deleteLineItem(item.id)}
                                isLast={idx === lineItems.length - 1}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>

                    {/* Add line item */}
                    <button
                      onClick={addLineItem}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        height: 40, margin: '8px 16px', borderRadius: 8,
                        border: '1.5px dashed var(--border-default)', background: 'transparent',
                        fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer',
                        transition: 'all 100ms',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
                    >
                      <Plus size={14} /> Add line item
                    </button>

                    {/* Totals */}
                    <div style={{ marginTop: 'auto', padding: '16px 24px 24px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <DocumentTotals lineItems={lineItems} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>

      {/* Convert to Order Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <DialogPrimitive.Root open={showConvertModal} onOpenChange={(v) => !v && setShowConvertModal(false)}>
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: APPLE_EASE }}
                  style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 400, zIndex: 61, background: 'white', borderRadius: 14,
                    boxShadow: 'var(--shadow-modal)', padding: 24,
                  }}
                >
                  <DialogPrimitive.Title style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                    Convert {quotation.number} to Sales Order?
                  </DialogPrimitive.Title>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    A new Sales Order will be created with the same line items.
                  </p>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Delivery Address</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border-default)', borderRadius: 8, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowConvertModal(false)}
                      style={{ height: 34, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowConvertModal(false)
                        onConvertToOrder(quotation)
                        toast.success(`SO-2025-0457 created from ${quotation.number}`)
                        onClose()
                      }}
                      style={{ height: 34, padding: '0 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      Create Sales Order <ChevronRight size={13} />
                    </button>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
