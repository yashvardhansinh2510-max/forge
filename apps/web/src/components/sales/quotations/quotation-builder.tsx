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
  X, GripVertical, Plus, Send, Check, ChevronRight, Search, Trash2, Lock, Printer, Sparkles, SlidersHorizontal,
} from 'lucide-react'
import {
  FILTER_TAG_LABELS, BRAND_FILTER_COLORS, HANSGROHE_CATEGORIES,
  type FilterTag,
} from '@/lib/constants/product-categories'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '../shared/status-badge'
import { DocumentTotals } from '../shared/document-totals'
import { QuotationHistoryModal } from './QuotationHistoryModal'
import { CustomLineItemModal } from './CustomLineItemModal'
import useSWR from 'swr'
import {
  calcDocumentTotals, type Quotation, type LineItem, type QuotationStatus,
} from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/format'
import { generateQuotationPrintHTML } from '@/lib/quotation-print'
import type { ProductApiItem } from '@/lib/pos-catalog'

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

type LiveProduct = {
  id: string
  sku: string
  name: string
  brand: string
  mrp: number
  unit: string
  imageUrl?: string
  articleNumber?: string
  seriesName?: string
  finishName?: string
  subcategory?: string
  filterTags: string[]
  sortOrder?: number
}

function ProductSearchCell({
  item, onUpdate, products, brandFilter, activeFilterTags,
}: {
  item: LineItem
  onUpdate: (updates: Partial<LineItem>) => void
  products: LiveProduct[]
  brandFilter: string | null
  activeFilterTags: Set<string>
}) {
  const [editing, setEditing] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const preFiltered = React.useMemo(() => {
    let list = products
    if (brandFilter) list = list.filter(p => p.brand === brandFilter)
    if (activeFilterTags.size > 0)
      list = list.filter(p => [...activeFilterTags].every(t => p.filterTags.includes(t)))
    return list
  }, [products, brandFilter, activeFilterTags])

  const filtered = React.useMemo(() => {
    if (!search) return preFiltered.slice(0, 20)
    const q = search.toLowerCase()
    return preFiltered
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.articleNumber ?? '').toLowerCase().includes(q) ||
        (p.seriesName ?? '').toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [preFiltered, search])

  const totalCount   = preFiltered.length
  const showingCount = filtered.length

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
        maxHeight: 340, display: 'flex', flexDirection: 'column',
      }}>
        {totalCount > 0 && (
          <div style={{
            padding: '5px 12px', fontSize: 10, color: 'var(--text-tertiary)',
            borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.02)',
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
          }}>
            Showing {showingCount} of {totalCount} products
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((p) => {
            const brandColor = BRAND_FILTER_COLORS[p.brand] ?? '#00529A'
            const brandAbbr  = p.brand === 'AXOR' ? 'AX' : p.brand === 'GROHE' ? 'GR' : p.brand === 'VITRA' ? 'VT' : 'HG'
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => {
                  onUpdate({
                    productId:   p.id,
                    productName: p.name,
                    sku:         p.sku,
                    unit:        p.unit,
                    unitPrice:   p.mrp,
                    imageUrl:    p.imageUrl,
                    description: p.seriesName
                      ? `${p.seriesName}${p.finishName ? ' · ' + p.finishName : ''}`
                      : (p.subcategory ?? undefined),
                  })
                  setEditing(false)
                  setSearch('')
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px', fontSize: 12, background: 'white', border: 'none',
                  borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-tint)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'white' }}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{
                    width: 32, height: 32, objectFit: 'contain',
                    borderRadius: 4, border: '1px solid var(--border)',
                    background: '#fafafa', flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: 4,
                    background: `${brandColor}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    color: brandColor,
                    flexShrink: 0,
                  }}>
                    {brandAbbr}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  {p.subcategory && (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 1, fontStyle: 'italic' }}>{p.subcategory}</div>
                  )}
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
                    {p.articleNumber ?? p.sku}
                    {p.seriesName && ` · ${p.seriesName}`}
                    {p.finishName && ` · ${p.finishName}`}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{p.brand} · {formatINR(p.mrp)}</div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>No products found</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableRow({
  item, onUpdate, onDelete, isLast, products, brandFilter, activeFilterTags,
}: { item: LineItem; onUpdate: (updates: Partial<LineItem>) => void; onDelete: () => void; isLast: boolean; products: LiveProduct[]; brandFilter: string | null; activeFilterTags: Set<string> }) {
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
      <td style={{ width: 24, padding: '8px 4px 8px 4px', verticalAlign: 'top' }}>
        <div
          {...listeners}
          style={{ cursor: 'grab', color: hovered ? 'var(--text-tertiary)' : 'transparent', paddingTop: 2, transition: 'color 100ms' }}
        >
          <GripVertical size={14} />
        </div>
      </td>
      {/* Product + Image */}
      <td style={{ padding: '10px 10px', verticalAlign: 'middle', minWidth: 260 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productName}
              style={{ width: 52, height: 52, objectFit: 'contain',
                border: '1px solid var(--border-default)', borderRadius: 6,
                background: '#fafafa', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 6,
              border: '1px solid var(--border-default)',
              background: item.isCustom ? '#F9FAFB' : 'var(--surface)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
            }}>
              {item.isCustom ? (item.brand ? item.brand.slice(0, 3) : 'CST') : 'IMG'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.isCustom ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.productName}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                    color: '#6B7280', background: '#F3F4F6',
                    border: '1px solid #E5E7EB', borderRadius: 3,
                    padding: '1px 5px', flexShrink: 0,
                  }}>
                    CUSTOM
                  </span>
                </div>
                {/* Compute subtitle from canonical fields — brand and hsnCode — not from item.description */}
                {(item.brand || item.hsnCode) && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {[item.brand, item.hsnCode ? `HSN: ${item.hsnCode}` : null].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ) : (
              <ProductSearchCell item={item} onUpdate={onUpdate} products={products} brandFilter={brandFilter} activeFilterTags={activeFilterTags} />
            )}
          </div>
        </div>
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
      {/* Room */}
      <td style={{ padding: '10px 6px', verticalAlign: 'middle', width: 110 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
            Room
          </div>
          <input
            value={item.section ?? ''}
            onChange={(e) => onUpdate({ section: e.target.value || undefined })}
            placeholder="e.g. BATHROOM 1,2"
            style={{ width: '100%', fontSize: 11, padding: '4px 6px',
              border: '1px solid var(--border-default)', borderRadius: 4,
              outline: 'none', boxSizing: 'border-box',
              color: 'var(--text-primary)', background: 'var(--background)' }}
          />
        </div>
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

const BRAND_FILTER_BRANDS = ['HANSGROHE', 'AXOR'] as const

function ProductFilterBar({
  products, brandFilter, activeFilterTags, onBrandChange, onTagToggle, onClear,
}: {
  products: LiveProduct[]
  brandFilter: string | null
  activeFilterTags: Set<string>
  onBrandChange: (brand: string | null) => void
  onTagToggle: (tag: string) => void
  onClear: () => void
}) {
  const brandCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) counts[p.brand] = (counts[p.brand] ?? 0) + 1
    return counts
  }, [products])

  const showFilterTags = brandFilter === 'HANSGROHE' || brandFilter === 'AXOR'
  const accentColor    = brandFilter ? (BRAND_FILTER_COLORS[brandFilter] ?? '#374151') : '#374151'

  const tagEntries = Object.values(HANSGROHE_CATEGORIES) as Array<{ label: string; tag: FilterTag }>

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.015)', flexShrink: 0 }}>
      {/* Brand selector row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px 6px' }}>
        <SlidersHorizontal size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <button
          onClick={() => onBrandChange(null)}
          style={{
            height: 26, padding: '0 10px', borderRadius: 13, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: !brandFilter ? '#111827' : 'transparent',
            color: !brandFilter ? 'white' : 'var(--text-secondary)',
            transition: 'all 150ms',
          }}
        >
          All brands
        </button>
        {BRAND_FILTER_BRANDS.map(brand => {
          const active = brandFilter === brand
          const color  = BRAND_FILTER_COLORS[brand]
          const count  = brandCounts[brand] ?? 0
          return (
            <motion.button
              key={brand}
              onClick={() => onBrandChange(active ? null : brand)}
              whileTap={{ scale: 0.95 }}
              style={{
                height: 26, padding: '0 10px', borderRadius: 13, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${active ? color : '#e5e7eb'}`,
                background: active ? color : 'white',
                color: active ? 'white' : '#374151',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 150ms, border-color 150ms, color 150ms',
              }}
            >
              {brand}
              <span style={{ fontSize: 10, opacity: 0.75, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Filter tag pills row — only for HG/AXOR */}
      <AnimatePresence>
        {showFilterTags && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 16px 8px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
                {tagEntries.map(({ label, tag }) => {
                  const active = activeFilterTags.has(tag)
                  return (
                    <motion.button
                      key={tag}
                      onClick={() => onTagToggle(tag)}
                      whileTap={{ scale: 0.93 }}
                      animate={{ scale: active ? 1.03 : 1 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        height: 24, padding: '0 9px', borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${active ? accentColor : '#e5e7eb'}`,
                        background: active ? accentColor : 'white',
                        color: active ? 'white' : '#374151',
                        whiteSpace: 'nowrap',
                        transition: 'background 120ms, border-color 120ms, color 120ms',
                      }}
                    >
                      {label}
                    </motion.button>
                  )
                })}
              </div>
              {activeFilterTags.size > 0 && (
                <button
                  onClick={onClear}
                  style={{
                    marginLeft: 8, fontSize: 10, color: 'var(--text-tertiary)', background: 'none',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface QuotationBuilderProps {
  quotation: Quotation | null
  onClose: () => void
  onSave?: () => void
  onConvertToOrder: (q: Quotation) => void
}

export function QuotationBuilder({ quotation, onClose, onSave, onConvertToOrder }: QuotationBuilderProps) {
  const router = useRouter()
  const [lineItems, setLineItems] = React.useState<LineItem[]>([])
  const [status, setStatus] = React.useState<QuotationStatus>('draft')
  const [showConvertModal, setShowConvertModal] = React.useState(false)
  const [showHistoryModal, setShowHistoryModal] = React.useState(false)
  const [customerName, setCustomerName] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [brandLabel, setBrandLabel] = React.useState('GROHE')
  const [siteAddress, setSiteAddress] = React.useState('')
  const [projectName, setProjectName] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [revisionStatus, setRevisionStatus] = React.useState<'DRAFT' | 'LOCKED'>('DRAFT')
  const [revisionId, setRevisionId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [showCustomModal, setShowCustomModal] = React.useState(false)
  const [brandFilter, setBrandFilter] = React.useState<string | null>(null)
  const [activeFilterTags, setActiveFilterTags] = React.useState<Set<string>>(new Set())

  const { data: productsResponse } = useSWR<{ products: ProductApiItem[] }>(
    '/api/products?limit=2000',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false },
  )
  const liveProducts = React.useMemo<LiveProduct[]>(
    () => (productsResponse?.products ?? []).map(p => ({
      id:            p.id,
      sku:           p.sku,
      name:          p.name,
      brand:         p.brand,
      mrp:           p.mrp,
      unit:          p.unit,
      imageUrl:      p.imageUrl      ?? undefined,
      articleNumber: p.articleNumber ?? p.sku,
      seriesName:    p.seriesName    ?? undefined,
      finishName:    p.finishName    ?? undefined,
      subcategory:   p.subcategory   ?? undefined,
      filterTags:    p.filterTags    ?? [],
      sortOrder:     p.sortOrder     ?? undefined,
    })),
    [productsResponse],
  )

  React.useEffect(() => {
    if (quotation) {
      setLineItems(quotation.lineItems)
      setStatus(quotation.status)
      setCustomerName(quotation.customerName)
      setCustomerPhone(quotation.customerPhone ?? '')
      setSiteAddress(quotation.siteAddress)
      setProjectName(quotation.projectName)
      setNotes(quotation.notes)
      setRevisionStatus(quotation.revisionStatus ?? 'DRAFT')
      setRevisionId(quotation.revisionId ?? null)
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
      imageUrl: undefined,
    }])
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function deleteLineItem(id: string) {
    setLineItems(prev => prev.filter(i => i.id !== id))
  }

  async function createQuotationFollowUp() {
    if (!quotation) return
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 3)
    try {
      await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'QUOTATION_FOLLOWUP',
          customerName: customerName.trim() || quotation.customerName,
          customerPhone: customerPhone.trim() || quotation.customerPhone || '',
          quotationId: quotation.id,
          quotationNumber: quotation.number,
          status: 'PENDING',
          nextFollowUpDate: followUpDate.toISOString(),
          notes: `Follow up on Quotation ${quotation.number}`,
        }),
      })
    } catch {
      // Fire-and-forget — follow-up failure must not block the primary action
    }
  }

  function handleSend() {
    setStatus('sent')
    toast.success(`Quotation ${quotation?.number} sent to ${quotation?.customerName}`)
    void createQuotationFollowUp()
  }

  function handlePrint() {
    if (!quotation) return
    void createQuotationFollowUp()
    const html = generateQuotationPrintHTML({
      number: quotation.number,
      customerName,
      customerPhone: customerPhone || undefined,
      createdBy: quotation.createdBy,
      createdAt: quotation.createdAt,
      brandLabel: brandLabel || 'GROHE',
      lineItems,
    })
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Pop-ups blocked — allow pop-ups for this site and try again')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  async function handleSave(): Promise<string | null> {
    if (!quotation) return null
    const hasCustomer = customerName.trim()
    if (!hasCustomer) {
      toast.error('Customer name is required')
      return null
    }
    try {
      const payload = {
        customerName: customerName.trim(),
        siteAddress: siteAddress.trim() || undefined,
        projectName: projectName.trim() || undefined,
        notes: notes.trim() || undefined,
        lineItems: lineItems
          .filter(li => li.sku || li.isCustom)
          .map(li => {
            if (li.isCustom) {
              return {
                isCustom: true as const,
                customDescription: li.productName,
                customBrand:       li.brand,
                customUnit:        li.unit,
                customHsnCode:     li.hsnCode,
                customNotes:       li.notes,
                qty:               li.qty,
                unitPrice:         li.unitPrice,
                discount:          li.discount,
                gstRate:           li.gstRate,
                section:           li.section,
              }
            }
            return {
              sku:         li.sku,
              productName: li.productName,
              qty:         li.qty,
              unitPrice:   li.unitPrice,
              discount:    li.discount,
              gstRate:     li.gstRate,
              section:     li.section,
              imageUrl:    li.imageUrl,
              finishName:  li.description?.includes('·') ? li.description.split('·')[1]?.trim() : undefined,
              seriesName:  li.description?.includes('·') ? li.description.split('·')[0]?.trim() : li.description,
            }
          }),
      }

      let savedRevisionId = revisionId

      if (!revisionId) {
        const res = await fetch('/api/quotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json() as { message?: string }
          throw new Error(err.message ?? 'Failed to save quotation')
        }
        const data = await res.json() as { id: string; quotationNumber: string; revisionId: string }
        savedRevisionId = data.revisionId
        setRevisionId(savedRevisionId)
      } else {
        const res = await fetch(`/api/quotations/${revisionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json() as { message?: string }
          throw new Error(err.message ?? 'Failed to save quotation')
        }
      }

      toast.success('Quotation saved')
      onSave?.()
      return savedRevisionId
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save quotation')
      return null
    }
  }

  async function handleCreatePO() {
    if (!quotation || creating) return
    setCreating(true)
    try {
      // Ensure quotation is saved to DB first
      let activeRevisionId = revisionId
      if (!activeRevisionId) {
        activeRevisionId = await handleSave()
        if (!activeRevisionId) throw new Error('Could not save quotation before creating PO')
      }

      // Step A — lock the revision
      const lockRes = await fetch(`/api/quotations/${activeRevisionId}/lock`, { method: 'PATCH' })
      if (!lockRes.ok) {
        const err = await lockRes.json() as { message?: string }
        throw new Error(err.message ?? 'Could not lock quotation')
      }

      // Step B — create the PO from the locked revision
      const res = await fetch(`/api/purchase-orders/from-revision/${activeRevisionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: lineItems
            .filter(li => li.sku)
            .map(li => ({
              sku: li.sku,
              productName: li.productName,
              qty: li.qty,
              clientOfferRate: li.unitPrice,
            })),
          customerName: customerName.trim(),
          projectName: projectName.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Failed to create PO')
      }
      const data = await res.json() as { poNumber: string; lineItems?: unknown[] }
      const lineCount = Array.isArray(data.lineItems) ? data.lineItems.length : lineItems.length
      setRevisionStatus('LOCKED')
      toast.success(`${data.poNumber} created (${lineCount} lines) — view in Purchases`)
      setTimeout(() => {
        onClose()
        router.push('/purchases')
      }, 800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create PO')
    } finally {
      setCreating(false)
    }
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
                    <button onClick={() => void handleSave()} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Save Draft
                    </button>
                    <button
                      onClick={handlePrint}
                      style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Printer size={12} />
                      Print / Save PDF
                    </button>
                    {canConvert ? (
                      revisionStatus === 'LOCKED' ? (
                        <div style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Check size={12} /> PO Created
                        </div>
                      ) : (
                        <button
                          onClick={() => void handleCreatePO()}
                          disabled={creating}
                          style={{ height: 30, padding: '0 12px', borderRadius: 7, border: 'none', background: creating ? '#6B7280' : '#111827', color: 'white', fontSize: 12, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: creating ? 0.8 : 1 }}
                        >
                          <Lock size={11} />
                          {creating ? 'Creating PO…' : 'Lock & Create PO'}
                        </button>
                      )
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
                  {/* Left panel — editable */}
                  <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', padding: 20 }}>
                    {/* Editable: Customer */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Customer *</label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                        style={{ width: '100%', fontSize: 13, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
                      />
                    </div>
                    {/* Customer Phone */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Customer Phone</label>
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 98989 58897"
                        style={{ width: '100%', fontSize: 13, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
                      />
                    </div>
                    {/* Brand Label */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Brand Label</label>
                      <input
                        value={brandLabel}
                        onChange={(e) => setBrandLabel(e.target.value)}
                        placeholder="e.g. GROHE"
                        style={{ width: '100%', fontSize: 13, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)' }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLInputElement).style.boxShadow = 'none' }}
                      />
                    </div>
                    {/* Editable: Site Address */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Site / Project Address</label>
                      <textarea
                        value={siteAddress}
                        onChange={(e) => setSiteAddress(e.target.value)}
                        placeholder="Site address"
                        rows={2}
                        style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: '18px' }}
                        onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(0,113,227,0.5)' }}
                        onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)' }}
                      />
                    </div>
                    {/* Editable: Project Name */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Project Name</label>
                      <input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. Master Bathroom"
                        style={{ width: '100%', fontSize: 13, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,113,227,0.5)' }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)' }}
                      />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Quote Date</label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{format(quotation.createdAt, 'dd MMM yyyy')}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Valid Until</label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{format(quotation.validUntil, 'dd MMM yyyy')}</div>
                    </div>
                    {/* Editable: Notes */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Internal notes…"
                        rows={3}
                        style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1.5px solid var(--border-default)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: '18px' }}
                        onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(0,113,227,0.5)' }}
                        onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)' }}
                      />
                    </div>
                  </div>

                  {/* Right panel — line items */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                    {/* Brand + category filter bar */}
                    <ProductFilterBar
                      products={liveProducts}
                      brandFilter={brandFilter}
                      activeFilterTags={activeFilterTags}
                      onBrandChange={(b) => { setBrandFilter(b); setActiveFilterTags(new Set()) }}
                      onTagToggle={(tag) => setActiveFilterTags(prev => {
                        const next = new Set(prev)
                        next.has(tag) ? next.delete(tag) : next.add(tag)
                        return next
                      })}
                      onClear={() => setActiveFilterTags(new Set())}
                    />

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.02)', position: 'sticky', top: 0 }}>
                            <th style={{ width: 24 }} />
                            <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Qty</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 100 }}>MRP</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 60 }}>Disc%</th>
                            <th style={{ padding: '8px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 110 }}>Room</th>
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
                                products={liveProducts}
                                brandFilter={brandFilter}
                                activeFilterTags={activeFilterTags}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>

                    {/* Add line item / Add Custom Item */}
                    <div style={{ display: 'flex', gap: 8, margin: '8px 16px' }}>
                      <button
                        onClick={addLineItem}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          height: 40, borderRadius: 8,
                          border: '1.5px dashed var(--border-default)', background: 'transparent',
                          fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer',
                          transition: 'all 100ms',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
                      >
                        <Plus size={14} /> Add line item
                      </button>
                      <button
                        onClick={() => setShowCustomModal(true)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          height: 40, padding: '0 14px', borderRadius: 8,
                          border: '1.5px dashed #D1D5DB', background: 'transparent',
                          fontSize: 13, color: '#6B7280', cursor: 'pointer',
                          transition: 'all 100ms', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6B7280'; (e.currentTarget as HTMLElement).style.color = '#111827' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
                      >
                        <Sparkles size={13} /> + Add Custom Item
                      </button>
                    </div>

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
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
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

      {/* Quotation History Modal */}
      <QuotationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        quotation={quotation}
      />

      {/* Custom Line Item Modal */}
      <CustomLineItemModal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={(item) => setLineItems(prev => [...prev, item])}
      />
    </DialogPrimitive.Root>
  )
}
