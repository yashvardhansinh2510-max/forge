'use client'

import * as React from 'react'
import { FileText, RotateCcw, Save, Percent, MapPin, Phone, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import { usePOSStore, useTotals } from '@/lib/pos-store'
import { useProcurementStore } from '@/lib/procurement-store'
import { QuotationPreview } from './quotation-preview'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const FIELD_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-primary)',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  outline: 'none',
  padding: '1px 0',
  fontFamily: 'var(--font-ui)',
}

function InlineField({
  label,
  value,
  onChange,
  placeholder,
  width = 140,
  icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  width?: number
  icon?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
      <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 3 }}>
        {icon}{label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...FIELD_STYLE, width }}
        onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--text-primary)' }}
        onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--border)' }}
      />
    </div>
  )
}

export function POSHeader() {
  const project        = usePOSStore((s) => s.project)
  const rooms          = usePOSStore((s) => s.rooms)
  const setDiscount    = usePOSStore((s) => s.setGlobalDiscount)
  const setClientName  = usePOSStore((s) => s.setClientName)
  const setClientPhone = usePOSStore((s) => s.setClientPhone)
  const setSiteAddress = usePOSStore((s) => s.setSiteAddress)
  const setReferenceBy = usePOSStore((s) => s.setReferenceBy)
  const resetBuilder   = usePOSStore((s) => s.resetBuilder)
  const totals         = useTotals()

  const { openDraft, addLine, clearDraft } = useProcurementStore()
  const router = useRouter()

  const [showQuotation, setShowQuotation] = React.useState(false)
  const [expanded, setExpanded]           = React.useState(false)

  function handlePlaceOrder() {
    const nonConcealedItems = rooms.flatMap((room) =>
      room.items
        .filter((item) => !item.product.isConcealed)
        .map((item) => ({ item, roomName: room.name })),
    )
    if (nonConcealedItems.length === 0) {
      toast.error('No items to order', { description: 'Add products to your rooms first.' })
      return
    }
    clearDraft()
    openDraft('PROJECT_LINKED', {
      projectName: project.clientName || 'Unnamed Project',
    })
    nonConcealedItems.forEach(({ item, roomName }) => {
      const offerRate = Math.round(
        item.product.mrp
        * (1 - project.globalDiscount / 100)
        * (1 - item.itemDiscount / 100),
      )
      addLine(item.product, item.quantity, offerRate, roomName)
    })
    router.push('/purchases/new')
    toast.success('Items loaded into Purchase Order draft', {
      description: `${nonConcealedItems.length} item${nonConcealedItems.length !== 1 ? 's' : ''} ready for procurement`,
    })
  }

  const handleSave = () => {
    const existing = JSON.parse(localStorage.getItem('forge-pos-saved-list') ?? '[]')
    const entry = {
      id: `save-${Date.now()}`,
      savedAt: new Date().toISOString(),
      project,
      rooms,
    }
    const updated = [entry, ...existing].slice(0, 20)
    localStorage.setItem('forge-pos-saved-list', JSON.stringify(updated))
    toast.success('Project saved', {
      description: project.clientName ? `Saved for ${project.clientName}` : 'Saved to local storage',
    })
  }

  return (
    <div style={{ flexShrink: 0, background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
      {/* Primary row */}
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          gap: 6,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        {/* Buildcon House brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>B</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              Buildcon House
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Quotation Builder
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

        {/* Client name */}
        <InlineField
          label="Client"
          value={project.clientName}
          onChange={setClientName}
          placeholder="Client name…"
          width={120}
        />

        {/* Phone */}
        <InlineField
          label="Phone"
          value={project.clientPhone}
          onChange={setClientPhone}
          placeholder="+91 …"
          width={92}
          icon={<Phone size={8} />}
        />

        {/* Reference By */}
        <InlineField
          label="Reference"
          value={project.referenceBy}
          onChange={setReferenceBy}
          placeholder="Referred by…"
          width={100}
        />

        {/* Expand toggle for site address */}
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Hide site address' : 'Add site address'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: expanded ? 'var(--surface-tint)' : 'transparent',
            fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = expanded ? 'var(--surface-tint)' : 'transparent' }}
        >
          <MapPin size={11} />
          Site
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {/* Spacer — collapses when header is tight */}
        <div style={{ flex: '1 1 0', minWidth: 0 }} />

        {/* Totals */}
        {totals.totalItems > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>MRP</div>
              <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                {formatINR(totals.totalMRP)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>
                Offer · {totals.totalItems} items
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {formatINR(totals.totalOffer)}
              </div>
            </div>
          </div>
        )}

        <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

        {/* Global Discount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Percent size={12} style={{ color: 'var(--text-muted)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Global %
            </label>
            <input
              type="number"
              min={0} max={60} step={1}
              value={project.globalDiscount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              style={{
                width: 44, textAlign: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '2px 4px',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <button
          onClick={resetBuilder}
          title="Clear all rooms"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <RotateCcw size={12} />
          Reset
        </button>

        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Save size={12} />
          Save
        </button>

        <button
          onClick={() => setShowQuotation(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7, border: 'none',
            background: '#1d4ed8', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '-0.01em', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
        >
          <FileText size={13} />
          Quotation
        </button>

        {totals.totalItems > 0 && (
          <button
            onClick={handlePlaceOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, border: 'none',
              background: '#16A34A', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#15803d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#16A34A' }}
          >
            <ShoppingCart size={13} />
            Place Order
          </button>
        )}
      </header>

      {/* Expandable site address row */}
      {expanded && (
        <div
          style={{
            paddingInline: 16,
            paddingBottom: 10,
            paddingTop: 4,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <MapPin size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, marginBottom: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, maxWidth: 480 }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Site / Delivery Address
            </label>
            <textarea
              value={project.siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Enter site address for delivery…"
              rows={2}
              style={{
                width: '100%', fontSize: 12, color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 8px', outline: 'none', resize: 'none',
                fontFamily: 'var(--font-ui)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>
        </div>
      )}

      {showQuotation && (
        <QuotationPreview
          project={project}
          rooms={rooms}
          onClose={() => setShowQuotation(false)}
        />
      )}
    </div>
  )
}
