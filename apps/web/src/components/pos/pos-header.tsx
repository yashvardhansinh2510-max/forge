'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { FileText, RotateCcw, Save, Percent, MapPin, Phone, ChevronDown, ChevronUp, ShoppingCart, FolderOpen } from 'lucide-react'
import { usePOSStore, useTotals } from '@/lib/pos-store'
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
  const addRoom        = usePOSStore((s) => s.addRoom)
  const totals         = useTotals()

  const router = useRouter()

  const [showQuotation, setShowQuotation] = React.useState(false)
  const [expanded, setExpanded]           = React.useState(false)
  const [placingOrder, setPlacingOrder]   = React.useState(false)
  const [saving, setSaving]               = React.useState(false)
  const [showLoadMenu, setShowLoadMenu]   = React.useState(false)
  const [dropdownPos, setDropdownPos]     = React.useState({ top: 0, left: 0 })
  const loadMenuRef  = React.useRef<HTMLDivElement>(null)
  const loadBtnRef   = React.useRef<HTMLButtonElement>(null)
  const dropdownRef  = React.useRef<HTMLDivElement>(null)

  async function handlePlaceOrder() {
    const nonConcealedItems = rooms.flatMap((room) =>
      room.items
        .filter((item) => !item.product.isConcealed)
        .map((item) => ({ item, roomName: room.name })),
    )
    if (nonConcealedItems.length === 0) {
      toast.error('No items to order', { description: 'Add products to your rooms first.' })
      return
    }
    setPlacingOrder(true)
    try {
      const res = await fetch('/api/purchase-orders/from-revision/pos-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: nonConcealedItems.map(({ item }) => ({
            sku: item.product.sku,
            productName: item.product.name,
            qty: item.quantity,
            clientOfferRate: Math.round(
              item.product.mrp
              * (1 - project.globalDiscount / 100)
              * (1 - item.itemDiscount / 100),
            ),
          })),
          customerName: project.clientName || undefined,
          projectName: project.clientName || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Failed to create PO')
      }
      const data = await res.json() as { poNumber: string; lineItemCount: number }
      toast.success(`${data.poNumber} created — ${data.lineItemCount} lines`, {
        description: 'Items now appear as Unallocated in the tracker',
      })
      router.push('/purchases')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create PO')
    } finally {
      setPlacingOrder(false)
    }
  }

  async function handleSave() {
    if (!project.clientName.trim()) {
      toast.error('Add a client name before saving')
      return
    }
    setSaving(true)
    try {
      const lineItems = rooms.flatMap((room) =>
        room.items
          .filter((item) => !item.isAutoAdded)
          .map((item) => ({
            sku:           item.product.sku,
            productName:   item.product.name,
            articleNumber: item.product.articleNumber ?? item.product.sku,
            qty:           item.quantity,
            unitPrice:     item.product.mrp,
            discount:      Math.max(item.itemDiscount, project.globalDiscount),
            gstRate:       item.product.gstRate,
            section:       room.name,
            imageUrl:      item.product.imageUrl ?? undefined,
            finishName:    item.finish.name || undefined,
            seriesName:    item.product.seriesName || undefined,
          }))
      )

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:  project.clientName,
          customerPhone: project.clientPhone,
          siteAddress:   project.siteAddress,
          projectName:   project.clientName,
          notes:         `Ref: ${project.referenceBy}`,
          lineItems,
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Save failed')
      }

      const data = await res.json() as { id: string; quotationNumber: string; revisionId: string }

      const savedList = JSON.parse(
        localStorage.getItem('forge-pos-saved-list') ?? '[]'
      ) as Array<{ id: string; quotationNumber: string; clientName: string; savedAt: string }>

      const entry = {
        id:              data.id,
        revisionId:      data.revisionId,
        quotationNumber: data.quotationNumber,
        clientName:      project.clientName,
        savedAt:         new Date().toISOString(),
      }
      localStorage.setItem(
        'forge-pos-saved-list',
        JSON.stringify([entry, ...savedList].slice(0, 20))
      )

      toast.success(`Saved as ${data.quotationNumber}`, {
        description: `${project.clientName} — view in Quotations`,
        action: {
          label: 'Open',
          onClick: () => router.push('/sales/quotations'),
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function loadProject(revisionId: string) {
    setShowLoadMenu(false)
    try {
      const res = await fetch(`/api/quotations/${revisionId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json() as {
        customerName: string
        customerPhone: string
        siteAddress: string
        lineItems: Array<{
          sku: string
          productName: string
          qty: number
          unitPrice: number
          discount: number
          gstRate: number
          section: string
          imageUrl?: string
        }>
      }

      resetBuilder()
      setClientName(data.customerName ?? '')
      setClientPhone(data.customerPhone ?? '')
      setSiteAddress(data.siteAddress ?? '')

      const bySection = new Map<string, typeof data.lineItems>()
      for (const item of data.lineItems) {
        const section = item.section ?? 'GENERAL'
        if (!bySection.has(section)) bySection.set(section, [])
        bySection.get(section)!.push(item)
      }

      for (const [sectionName] of bySection) {
        addRoom(sectionName)
      }

      toast.success('Project loaded', {
        description: `${data.customerName} — ${data.lineItems.length} items restored`,
      })
    } catch {
      toast.error('Could not load saved project')
    }
  }

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inBtn      = loadMenuRef.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inBtn && !inDropdown) setShowLoadMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
              background: '#1d4ed8',
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
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            fontSize: 12, color: 'var(--text-secondary)', cursor: saving ? 'not-allowed' : 'pointer',
            flexShrink: 0, opacity: saving ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save'}
        </button>

        <div ref={loadMenuRef} style={{ flexShrink: 0 }}>
          <button
            ref={loadBtnRef}
            onClick={() => {
              if (loadBtnRef.current) {
                const r = loadBtnRef.current.getBoundingClientRect()
                setDropdownPos({ top: r.bottom + 4, left: r.left })
              }
              setShowLoadMenu((v) => !v)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'transparent',
              fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <FolderOpen size={12} />
            Load
          </button>
        </div>

        {showLoadMenu && createPortal(
          (() => {
            const saved = JSON.parse(
              localStorage.getItem('forge-pos-saved-list') ?? '[]'
            ) as Array<{ id: string; revisionId: string; quotationNumber: string; clientName: string; savedAt: string }>
            return (
              <div ref={dropdownRef} style={{
                position: 'fixed', top: dropdownPos.top, left: dropdownPos.left,
                width: 280, background: 'var(--background)',
                border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                zIndex: 9999, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '8px 12px', fontSize: 10, fontWeight: 700,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.07em', borderBottom: '1px solid var(--border)',
                }}>
                  Recent saves
                </div>
                {saved.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No saved projects yet
                  </div>
                ) : saved.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => void loadProject(s.revisionId)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.clientName || 'Unnamed client'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {s.quotationNumber} · {new Date(s.savedAt).toLocaleDateString('en-IN')}
                    </div>
                  </button>
                ))}
              </div>
            )
          })(),
          document.body
        )}

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
            onClick={() => void handlePlaceOrder()}
            disabled={placingOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, border: 'none',
              background: placingOrder ? '#6B7280' : '#16A34A', color: '#fff',
              fontSize: 12, fontWeight: 600,
              cursor: placingOrder ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap',
              opacity: placingOrder ? 0.8 : 1,
            }}
            onMouseEnter={(e) => { if (!placingOrder) e.currentTarget.style.background = '#15803d' }}
            onMouseLeave={(e) => { if (!placingOrder) e.currentTarget.style.background = '#16A34A' }}
          >
            <ShoppingCart size={13} />
            {placingOrder ? 'Creating PO…' : 'Place Order'}
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
