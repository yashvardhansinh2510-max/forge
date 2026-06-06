'use client'

import * as React from 'react'
import {
  FileText, RotateCcw, Save, Percent, MapPin, Phone, ChevronDown, ChevronUp,
  ShoppingCart, Loader2, AlertTriangle, CheckCircle2, Clock, Hash, RefreshCw,
  StickyNote, Pencil,
} from 'lucide-react'
import { usePOSStore, useTotals } from '@/lib/pos-store'
import { unitMRP } from '@/lib/mock/pos-data'
import { QuotationPreview } from './quotation-preview'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

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
  label, value, onChange, placeholder, width = 140, icon,
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

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onCancel, danger = true,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: 'var(--background)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        padding: '24px',
        width: 'min(90vw, 380px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: danger ? 'rgba(239,68,68,0.10)' : 'rgba(251,191,36,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} style={{ color: danger ? '#ef4444' : '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {message}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'transparent', fontSize: 12, fontWeight: 500,
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: 7, border: 'none',
              background: danger ? '#ef4444' : '#f59e0b',
              fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Quotation Banner ──────────────────────────────────────────────────────────

function QuotationBanner() {
  const ctx = usePOSStore((s) => s.quotationContext)

  if (!ctx) {
    return (
      <div style={{
        height: 28,
        display: 'flex', alignItems: 'center', paddingInline: 16, gap: 8,
        background: 'rgba(251,191,36,0.10)',
        borderBottom: '1px solid rgba(251,191,36,0.25)',
        flexShrink: 0,
      }}>
        <AlertTriangle size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
          Unsaved draft — click Save to create a quotation
        </span>
        <span style={{ fontSize: 10, color: '#b45309' }}>
          (no quotation number assigned yet)
        </span>
      </div>
    )
  }

  const statusColor = ctx.status === 'APPROVED' || ctx.status === 'LOCKED'
    ? '#16a34a'
    : ctx.status === 'REJECTED' ? '#dc2626'
    : ctx.status === 'PENDING_APPROVAL' ? '#d97706'
    : 'var(--text-secondary)'

  const savedAgo = formatDistanceToNow(new Date(ctx.lastSavedAt), { addSuffix: true })

  return (
    <div style={{
      height: 28,
      display: 'flex', alignItems: 'center', paddingInline: 16, gap: 10,
      background: 'rgba(22,163,74,0.06)',
      borderBottom: '1px solid rgba(22,163,74,0.15)',
      flexShrink: 0,
      overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      <CheckCircle2 size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Hash size={10} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}>
          {ctx.quotationNumber}
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
        Rev <strong style={{ color: 'var(--text-secondary)' }}>{ctx.revisionNumber}</strong>
      </span>
      <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
        background: `${statusColor}18`, color: statusColor,
        textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
      }}>
        {ctx.status}
      </span>
      <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <Clock size={10} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Saved <span suppressHydrationWarning style={{ color: 'var(--text-secondary)' }}>{savedAgo}</span>
        </span>
      </div>
    </div>
  )
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export function POSHeader() {
  const project              = usePOSStore((s) => s.project)
  const rooms                = usePOSStore((s) => s.rooms)
  const quotationContext     = usePOSStore((s) => s.quotationContext)
  const setDiscount          = usePOSStore((s) => s.setGlobalDiscount)
  const setClientName        = usePOSStore((s) => s.setClientName)
  const setClientPhone       = usePOSStore((s) => s.setClientPhone)
  const setSiteAddress       = usePOSStore((s) => s.setSiteAddress)
  const setReferenceBy       = usePOSStore((s) => s.setReferenceBy)
  const setProjectName       = usePOSStore((s) => s.setProjectName)
  const setProjectNotes      = usePOSStore((s) => s.setProjectNotes)
  const resetBuilder         = usePOSStore((s) => s.resetBuilder)
  const setQuotationContext  = usePOSStore((s) => s.setQuotationContext)
  const totals               = useTotals()

  const router = useRouter()

  const [showQuotation, setShowQuotation]         = React.useState(false)
  const [expandedExtra, setExpandedExtra]         = React.useState(false)
  const [placingOrder, setPlacingOrder]           = React.useState(false)
  const [saving, setSaving]                       = React.useState(false)
  const [confirmReset, setConfirmReset]           = React.useState(false)

  // ── Follow-up sync (fire-and-forget) ─────────────────────────────────────
  async function syncFollowUp(quotationId: string, quotationNumber: string, revisionNumber: number) {
    if (!project.clientName.trim()) return
    const brands = [...new Set(
      rooms.flatMap((r) => r.items.map((i) => i.product.brand)).filter(Boolean),
    )]
    try {
      await fetch('/api/follow-ups/from-quotation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId,
          quotationNumber,
          quotationValue:   Math.round(totals.totalOffer * 1.28),
          revisionNumber,
          customerName:     project.clientName,
          customerPhone:    project.clientPhone || '',
          projectName:      project.name || undefined,
          brandsInterested: brands,
        }),
      })
    } catch {
      // Non-critical — never surface to user
    }
  }

  // ── Save (creates quotation or new revision) ──────────────────────────────
  async function handleSave() {
    if (saving) return
    const filledRooms = rooms.filter((r) => r.items.length > 0)
    if (filledRooms.length === 0) {
      toast.error('Nothing to save', { description: 'Add products to rooms first.' })
      return
    }

    setSaving(true)
    const roomsPayload = filledRooms.map((room, idx) => ({
      name:  room.name,
      order: idx,
      items: room.items.map((item) => ({
        sku:         item.product.sku,
        productName: item.product.name,
        qty:         item.quantity,
        unitPrice:   unitMRP(item.product, item.finish),
        discount:    Math.max(project.globalDiscount, room.roomDiscount ?? 0, item.itemDiscount ?? 0),
        gstRate:     item.product.gstRate,
        finishCode:  item.finish.code  || undefined,
        finishName:  item.finish.name  || undefined,
        finishSku:   (item.finish.sku && item.finish.sku !== item.product.sku)
          ? item.finish.sku
          : undefined,
        finishColor: item.finish.color || undefined,
        // Custom product metadata — allows API to set correct brand/category/isCustom
        isCustom:    item.product.isCustom || undefined,
        brand:       item.product.isCustom ? item.product.brand : undefined,
        category:    item.product.isCustom ? item.product.category : undefined,
      })),
    }))

    const basePayload = {
      customerName:   project.clientName || 'Unnamed Client',
      clientPhone:    project.clientPhone || undefined,
      referenceBy:    project.referenceBy || undefined,
      siteAddress:    project.siteAddress || undefined,
      projectName:    project.name || undefined,
      notes:          project.notes || undefined,
      globalDiscount: project.globalDiscount,
      rooms:          roomsPayload,
      snapshot:       { project, rooms: filledRooms },
    }

    try {
      // If quotation already saved → create revision on existing quotation
      if (quotationContext) {
        const res = await fetch(`/api/quotations/${quotationContext.quotationId}/save-revision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        })
        if (!res.ok) {
          const err = await res.json() as { message?: string }
          throw new Error(err.message ?? 'Failed to save revision')
        }
        const data = await res.json() as {
          quotationId: string; quotationNumber: string
          revisionId: string; revisionNumber: number; status: string
        }
        const newCtx = {
          quotationId:     data.quotationId,
          revisionId:      data.revisionId,
          quotationNumber: data.quotationNumber,
          revisionNumber:  data.revisionNumber,
          status:          data.status,
          lastSavedAt:     new Date().toISOString(),
        }
        setQuotationContext(newCtx)
        toast.success(`Rev ${data.revisionNumber} saved — ${data.quotationNumber}`, {
          description: `Revision ${data.revisionNumber} created`,
          action: { label: 'View list', onClick: () => router.push('/quotations') },
        })
        void syncFollowUp(newCtx.quotationId, newCtx.quotationNumber, newCtx.revisionNumber)
        return
      }

      // First save → create new quotation
      const res = await fetch('/api/quotations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Failed to save quotation')
      }
      const data = await res.json() as { id: string; quotationNumber: string; revisionId: string }
      const newCtx = {
        quotationId:     data.id,
        revisionId:      data.revisionId,
        quotationNumber: data.quotationNumber,
        revisionNumber:  0,
        status:          'DRAFT',
        lastSavedAt:     new Date().toISOString(),
      }
      setQuotationContext(newCtx)
      toast.success(`Saved as ${data.quotationNumber}`, {
        description: project.clientName ? `Saved for ${project.clientName}` : 'Saved to quotations',
        action: { label: 'View list', onClick: () => router.push('/quotations') },
      })
      void syncFollowUp(newCtx.quotationId, newCtx.quotationNumber, newCtx.revisionNumber)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save quotation')
    } finally {
      setSaving(false)
    }
  }

  // ── Place Order ────────────────────────────────────────────────────────────
  async function handlePlaceOrder() {
    // Must have a saved quotation
    if (!quotationContext) {
      toast.error('Save the quotation first', {
        description: 'A quotation number is required before placing a purchase order.',
      })
      return
    }

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
      const res = await fetch('/api/purchase-orders/from-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: nonConcealedItems.map(({ item }) => {
            const effectiveDisc = Math.max(project.globalDiscount, item.itemDiscount ?? 0)
            return {
              sku:             item.finish.sku || item.product.sku,
              productName:     item.product.name,
              brand:           item.product.brand,
              category:        item.product.category,
              mrp:             item.product.mrp,
              gstRate:         item.product.gstRate,
              qty:             item.quantity,
              clientOfferRate: Math.round(
                (item.product.mrp + item.finish.priceAdj) * (1 - effectiveDisc / 100),
              ),
              isCustom:        item.product.isCustom || undefined,
            }
          }),
          customerName:     project.clientName || undefined,
          projectName:      project.name || undefined,
          // Link PO back to quotation
          quotationId:      quotationContext.quotationId,
          quotationNumber:  quotationContext.quotationNumber,
          revisionId:       quotationContext.revisionId,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Failed to create PO')
      }
      const data = await res.json() as { poNumber: string; lineItemCount: number }
      toast.success(`${data.poNumber} created — ${data.lineItemCount} lines`, {
        description: `Linked to ${quotationContext.quotationNumber} · Items now appear in Purchases`,
      })
      // Mark follow-up as converted
      void fetch('/api/follow-ups/from-quotation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert', quotationId: quotationContext.quotationId }),
      }).catch(() => { /* non-critical */ })
      router.push('/purchases')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create PO')
    } finally {
      setPlacingOrder(false)
    }
  }

  const hasItems = totals.totalItems > 0

  return (
    <div style={{ flexShrink: 0, background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>

      {/* ── Quotation Banner (always visible) ────────────────────────────── */}
      <QuotationBanner />

      {/* ── Primary row ──────────────────────────────────────────────────── */}
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
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
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

        {/* Project name */}
        <InlineField
          label="Project"
          value={project.name}
          onChange={setProjectName}
          placeholder="Project name…"
          width={110}
          icon={<Pencil size={8} />}
        />

        {/* Client name */}
        <InlineField
          label="Client"
          value={project.clientName}
          onChange={setClientName}
          placeholder="Client name…"
          width={110}
        />

        {/* Phone */}
        <InlineField
          label="Phone"
          value={project.clientPhone}
          onChange={setClientPhone}
          placeholder="+91 …"
          width={88}
          icon={<Phone size={8} />}
        />

        {/* Reference */}
        <InlineField
          label="Reference"
          value={project.referenceBy}
          onChange={setReferenceBy}
          placeholder="Referred by…"
          width={96}
        />

        {/* Expand toggle for site address + notes */}
        <button
          onClick={() => setExpandedExtra((v) => !v)}
          title={expandedExtra ? 'Hide extra fields' : 'Add site address & notes'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: expandedExtra ? 'var(--surface-tint)' : 'transparent',
            fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = expandedExtra ? 'var(--surface-tint)' : 'transparent' }}
        >
          <MapPin size={11} />
          {expandedExtra ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        <div style={{ flex: '1 1 0', minWidth: 0 }} />

        {/* Totals */}
        {hasItems && (
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
              title="Global discount — applies to all items unless room or item discount is higher"
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
        {/* Reset — requires confirmation */}
        <button
          onClick={() => setConfirmReset(true)}
          title="Reset builder — clears all rooms and items"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'transparent',
            fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tint)'; e.currentTarget.style.color = '#ef4444' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <RotateCcw size={12} />
          Reset
        </button>

        {/* Save */}
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          title={quotationContext
            ? `Save as new revision of ${quotationContext.quotationNumber}`
            : 'Save as new quotation'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 7,
            border: '1px solid var(--border)',
            background: quotationContext ? 'rgba(22,163,74,0.06)' : 'transparent',
            fontSize: 12,
            color: saving ? 'var(--text-muted)' : quotationContext ? '#15803d' : 'var(--text-secondary)',
            cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0,
            opacity: saving ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(22,163,74,0.10)' }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = quotationContext ? 'rgba(22,163,74,0.06)' : 'transparent' }}
        >
          {saving
            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            : quotationContext
              ? <RefreshCw size={12} />
              : <Save size={12} />
          }
          {saving ? 'Saving…' : quotationContext ? 'Save Rev' : 'Save'}
        </button>

        {/* Quotation Preview */}
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

        {/* Place Order — disabled until quotation saved */}
        {hasItems && (
          <button
            onClick={() => void handlePlaceOrder()}
            disabled={placingOrder || !quotationContext}
            title={!quotationContext
              ? 'Save the quotation first before placing an order'
              : `Place purchase order linked to ${quotationContext.quotationNumber}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, border: 'none',
              background: placingOrder ? '#6B7280'
                : !quotationContext ? '#9ca3af'
                : '#16A34A',
              color: '#fff',
              fontSize: 12, fontWeight: 600,
              cursor: (placingOrder || !quotationContext) ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap',
              opacity: !quotationContext ? 0.6 : placingOrder ? 0.8 : 1,
            }}
            onMouseEnter={(e) => { if (!placingOrder && quotationContext) e.currentTarget.style.background = '#15803d' }}
            onMouseLeave={(e) => { if (!placingOrder && quotationContext) e.currentTarget.style.background = '#16A34A' }}
          >
            <ShoppingCart size={13} />
            {placingOrder ? 'Creating PO…' : 'Place Order'}
          </button>
        )}
      </header>

      {/* ── Expandable: site address + notes ─────────────────────────────── */}
      {expandedExtra && (
        <div style={{
          paddingInline: 16,
          paddingBottom: 10,
          paddingTop: 6,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface)',
        }}>
          {/* Site address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, maxWidth: 420 }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={9} />
              Site / Delivery Address
            </label>
            <textarea
              value={project.siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Enter site address for delivery…"
              rows={2}
              style={{
                width: '100%', fontSize: 12, color: 'var(--text-primary)',
                background: 'var(--background)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 8px', outline: 'none', resize: 'none',
                fontFamily: 'var(--font-ui)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Project notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, maxWidth: 420 }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <StickyNote size={9} />
              Project Notes
            </label>
            <textarea
              value={project.notes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder="Client preferences, site constraints, special requirements…"
              rows={2}
              style={{
                width: '100%', fontSize: 12, color: 'var(--text-primary)',
                background: 'var(--background)',
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

      {/* ── Reset confirmation dialog ─────────────────────────────────────── */}
      {confirmReset && (
        <ConfirmDialog
          title="Reset the builder?"
          message="This will clear all rooms, items, and client details. This cannot be undone."
          confirmLabel="Yes, reset everything"
          danger
          onConfirm={() => { resetBuilder(); setConfirmReset(false) }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {/* ── Quotation preview modal ───────────────────────────────────────── */}
      {showQuotation && (
        <QuotationPreview
          project={project}
          rooms={rooms}
          onClose={() => setShowQuotation(false)}
          quotationNumber={quotationContext?.quotationNumber}
          isDraft={!quotationContext}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
