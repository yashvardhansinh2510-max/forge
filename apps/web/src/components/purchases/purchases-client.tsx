'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants } from '@forge/ui'
import {
  Plus, Search, ShoppingBag, Phone, Mail, MapPin, Building2,
  FileText, ChevronRight, ChevronDown, Check,
  ArrowRight, Minus, Edit3, X, Save,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  STATUS_LABEL,
  STATUS_COLOR,
  STAGE_LABEL,
  STAGE_COLOR,
  FUNNEL_STAGES,
  calcPurchaseTotal,
  calcBrandTotal,
  type PurchaseOrder,
  type BrandFulfilment,
  type FunnelStage,
  type PurchaseStatus,
} from '@/lib/mock/purchases-data'
import { usePurchasesStore } from '@/lib/purchases-store'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Funnel Step ──────────────────────────────────────────────────────────────

function FunnelStep({
  stage, current, brandColor, onClick,
}: {
  stage: FunnelStage
  current: FunnelStage
  brandColor: string
  onClick?: () => void
}) {
  const idx        = FUNNEL_STAGES.indexOf(stage)
  const currentIdx = FUNNEL_STAGES.indexOf(current)
  const isActive   = idx === currentIdx
  const isDone     = idx < currentIdx
  const isNext     = idx === currentIdx + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <button
        onClick={isNext ? onClick : undefined}
        disabled={!isNext}
        title={isNext ? `Advance to ${STAGE_LABEL[stage]}` : undefined}
        style={{
          width: 28, height: 28,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          background: isDone ? brandColor : isActive ? `${brandColor}22` : isNext ? 'transparent' : 'var(--surface)',
          border: isActive
            ? `2px solid ${brandColor}`
            : isDone
            ? `2px solid ${brandColor}`
            : isNext
            ? `2px dashed ${brandColor}`
            : '2px solid var(--border)',
          color: isDone ? '#fff' : isActive ? brandColor : isNext ? brandColor : 'var(--text-muted)',
          cursor: isNext ? 'pointer' : 'default',
          transition: 'all 0.15s',
          flexShrink: 0,
          padding: 0,
          outline: 'none',
          opacity: isNext ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (isNext) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = `${brandColor}22` }
        }}
        onMouseLeave={(e) => {
          if (isNext) { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'transparent' }
        }}
      >
        {isDone ? '✓' : idx + 1}
      </button>
      <span
        style={{
          fontSize: 8, fontWeight: isActive ? 700 : 500,
          color: isActive ? brandColor : isDone ? 'var(--text-secondary)' : isNext ? brandColor : 'var(--text-muted)',
          textAlign: 'center', lineHeight: 1.2, maxWidth: 58,
          opacity: isNext ? 0.8 : 1,
        }}
      >
        {STAGE_LABEL[stage]}
      </span>
    </div>
  )
}

// ─── Funnel Track (interactive) ───────────────────────────────────────────────

function FunnelTrack({
  brand, globalDiscount, poId,
}: {
  brand: BrandFulfilment
  globalDiscount: number
  poId: string
}) {
  const { updateBrandStage, updateBrandDetails, updateBrandQty } = usePurchasesStore()
  const [editing, setEditing] = React.useState(false)
  const [draftPO, setDraftPO]     = React.useState(brand.poNumber     ?? '')
  const [draftRef, setDraftRef]   = React.useState(brand.vendorOrderRef ?? '')
  const [draftETA, setDraftETA]   = React.useState(brand.expectedDeliveryDate ?? '')
  const [draftNotes, setDraftNotes] = React.useState(brand.notes)

  // Sync draft state when brand data changes (e.g. stage advance auto-fill)
  React.useEffect(() => {
    setDraftPO(brand.poNumber ?? '')
    setDraftRef(brand.vendorOrderRef ?? '')
    setDraftETA(brand.expectedDeliveryDate ?? '')
    setDraftNotes(brand.notes)
  }, [brand.poNumber, brand.vendorOrderRef, brand.expectedDeliveryDate, brand.notes])

  const totals   = calcBrandTotal(brand, globalDiscount)
  const totalQty = brand.items.reduce((s, i) => s + i.quantity, 0)
  const stageColor = STAGE_COLOR[brand.stage]
  const currentIdx = FUNNEL_STAGES.indexOf(brand.stage)
  const nextStage  = currentIdx < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[currentIdx + 1] : null

  function advanceStage() {
    if (!nextStage) return
    updateBrandStage(poId, brand.brand, nextStage)
    toast.success(`${brand.brand} advanced to ${STAGE_LABEL[nextStage]}`)
  }

  function saveEdits() {
    updateBrandDetails(poId, brand.brand, {
      poNumber:             draftPO,
      vendorOrderRef:       draftRef,
      expectedDeliveryDate: draftETA,
      notes:                draftNotes,
    })
    setEditing(false)
    toast.success(`${brand.brand} details updated`)
  }

  function cancelEdits() {
    setDraftPO(brand.poNumber ?? '')
    setDraftRef(brand.vendorOrderRef ?? '')
    setDraftETA(brand.expectedDeliveryDate ?? '')
    setDraftNotes(brand.notes)
    setEditing(false)
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--background)',
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: brand.brandColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
          {brand.brand}
        </span>
        <span
          style={{
            padding: '2px 8px', borderRadius: 999,
            fontSize: 10, fontWeight: 600,
            background: stageColor.bg, color: stageColor.text,
          }}
        >
          {STAGE_LABEL[brand.stage]}
        </span>
        <span
          style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {formatINR(totals.offer)}
        </span>
        <button
          onClick={() => editing ? cancelEdits() : setEditing(true)}
          title={editing ? 'Cancel edits' : 'Edit details'}
          style={{
            width: 26, height: 26,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: editing ? 'rgba(239,68,68,0.08)' : 'var(--surface)',
            color: editing ? '#ef4444' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {editing ? <X size={12} /> : <Edit3 size={12} />}
        </button>
      </div>

      <div style={{ padding: '14px 12px 10px' }}>

        {/* Funnel steps */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative', marginBottom: 12 }}>
          <div
            style={{
              position: 'absolute',
              top: 13, left: '8%', right: '8%',
              height: 2,
              background: 'var(--border)',
              zIndex: 0,
            }}
          />
          {FUNNEL_STAGES.map((s) => (
            <FunnelStep
              key={s}
              stage={s}
              current={brand.stage}
              brandColor={brand.brandColor}
              onClick={advanceStage}
            />
          ))}
        </div>

        {/* Advance button */}
        {nextStage && (
          <button
            onClick={advanceStage}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 7,
              border: `1px dashed ${brand.brandColor}`,
              background: `${brand.brandColor}0d`,
              color: brand.brandColor,
              fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              marginBottom: 12,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${brand.brandColor}1a` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${brand.brandColor}0d` }}
          >
            <ArrowRight size={12} />
            Advance to {STAGE_LABEL[nextStage]}
          </button>
        )}

        {/* Quantity controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {(
            [
              { label: 'Received at Godown', field: 'receivedQty' as const },
              { label: 'Shipped to Client', field: 'shippedToClientQty' as const },
            ] as const
          ).map(({ label, field }) => (
            <div
              key={field}
              style={{
                padding: '8px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => updateBrandQty(poId, brand.brand, field, -1)}
                  disabled={brand[field] <= 0}
                  style={{
                    width: 22, height: 22,
                    borderRadius: 5, border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: brand[field] <= 0 ? 'not-allowed' : 'pointer',
                    opacity: brand[field] <= 0 ? 0.4 : 1,
                    padding: 0,
                  }}
                >
                  <Minus size={10} />
                </button>
                <span
                  style={{
                    flex: 1, textAlign: 'center',
                    fontSize: 14, fontWeight: 700,
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-primary)',
                  }}
                >
                  {brand[field]}
                  <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>
                    / {totalQty}
                  </span>
                </span>
                <button
                  onClick={() => updateBrandQty(poId, brand.brand, field, +1)}
                  disabled={brand[field] >= totalQty}
                  style={{
                    width: 22, height: 22,
                    borderRadius: 5, border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: brand[field] >= totalQty ? 'not-allowed' : 'pointer',
                    opacity: brand[field] >= totalQty ? 0.4 : 1,
                    padding: 0,
                  }}
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Editable detail fields */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, marginBottom: 10 }}>
                {(
                  [
                    { label: 'Our PO Number', key: 'poNumber', val: draftPO, set: setDraftPO, placeholder: 'e.g. BCH-GRH-2025-007' },
                    { label: 'Vendor Order Ref', key: 'vendorOrderRef', val: draftRef, set: setDraftRef, placeholder: 'Vendor\'s reference number' },
                    { label: 'Expected Delivery', key: 'expectedDeliveryDate', val: draftETA, set: setDraftETA, placeholder: 'YYYY-MM-DD', type: 'date' },
                  ] as const
                ).map((f) => (
                  <div key={f.key}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      {f.label}
                    </div>
                    <input
                      type={('type' in f && f.type) ? f.type : 'text'}
                      value={f.val}
                      onChange={(e) => (f.set as (v: string) => void)(e.target.value)}
                      placeholder={f.placeholder}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'var(--font-ui)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = brand.brandColor }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    Notes
                  </div>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Any notes about this brand's order…"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'var(--font-ui)',
                      lineHeight: 1.5,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = brand.brandColor }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                </div>
                <button
                  onClick={saveEdits}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    background: brand.brandColor,
                    color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Save size={11} />
                  Save Details
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Read-only detail summary (when not editing) */}
        {!editing && (brand.poNumber || brand.vendorOrderRef || brand.expectedDeliveryDate || brand.notes) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: 8 }}>
            {brand.poNumber && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                PO: <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{brand.poNumber}</span>
              </span>
            )}
            {brand.vendorOrderRef && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Ref: <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{brand.vendorOrderRef}</span>
              </span>
            )}
            {brand.expectedDeliveryDate && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                ETA: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(brand.expectedDeliveryDate)}</span>
              </span>
            )}
            {brand.notes && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: '100%', fontStyle: 'italic', lineHeight: 1.4 }}>
                {brand.notes}
              </span>
            )}
          </div>
        )}

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {brand.items.map((item) => {
            const lineMRP   = item.unitMRP * item.quantity
            const disc      = Math.max(globalDiscount, item.itemDiscount)
            const lineOffer = lineMRP * (1 - disc / 100)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px',
                  background: 'var(--surface)',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.finishColor || brand.brandColor,
                    border: '1px solid rgba(0,0,0,0.10)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.productName}
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}> × {item.quantity}</span>
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {disc > 0 ? (
                    <>{formatINR(lineOffer)} <span style={{ textDecoration: 'line-through', marginLeft: 2 }}>{formatINR(lineMRP)}</span></>
                  ) : formatINR(lineMRP)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Purchase Slide-Over ──────────────────────────────────────────────────────

const PO_STATUS_OPTIONS: { value: PurchaseStatus; label: string }[] = [
  { value: 'draft',      label: 'Draft' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'partial',    label: 'Partial' },
  { value: 'fulfilled',  label: 'Fulfilled' },
  { value: 'cancelled',  label: 'Cancelled' },
]

function PurchaseSlideOver({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { updatePOStatus, updatePONotes } = usePurchasesStore()
  const livePO     = usePurchasesStore((s) => s.orders.find((o) => o.id === po.id)) ?? po
  const totals     = calcPurchaseTotal(livePO)
  const statusCol  = STATUS_COLOR[livePO.status]
  const [notesVal, setNotesVal] = React.useState(livePO.internalNotes)
  const [showStatusMenu, setShowStatusMenu] = React.useState(false)

  // Sync notes when PO changes externally
  React.useEffect(() => {
    setNotesVal(livePO.internalNotes)
  }, [livePO.internalNotes])

  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleStatusChange(status: PurchaseStatus) {
    updatePOStatus(livePO.id, status)
    setShowStatusMenu(false)
    toast.success(`PO status updated to ${STATUS_LABEL[status]}`)
  }

  function handleNotesBlur() {
    if (notesVal !== livePO.internalNotes) {
      updatePONotes(livePO.id, notesVal)
    }
  }

  const deliveredBrands = livePO.brands.filter((b) => b.stage === 'delivered').length

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.24)' }} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(96vw, 680px)',
          background: 'var(--background)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 14, fontWeight: 800,
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-primary)', letterSpacing: '-0.01em',
                  }}
                >
                  {livePO.id}
                </span>
                {livePO.quotationRef && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <FileText size={11} /> {livePO.quotationRef}
                  </span>
                )}
                {/* Clickable status badge */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowStatusMenu((v) => !v)}
                    style={{
                      padding: '2px 8px', borderRadius: 999,
                      fontSize: 10, fontWeight: 600,
                      background: statusCol.bg, color: statusCol.text,
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    {STATUS_LABEL[livePO.status]}
                    <ChevronDown size={9} />
                  </button>
                  {showStatusMenu && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                        onClick={() => setShowStatusMenu(false)}
                      />
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 70,
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          overflow: 'hidden',
                          minWidth: 130,
                        }}
                      >
                        {PO_STATUS_OPTIONS.map((opt) => {
                          const col = STATUS_COLOR[opt.value]
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleStatusChange(opt.value)}
                              style={{
                                width: '100%', textAlign: 'left',
                                padding: '7px 12px',
                                border: 'none',
                                background: livePO.status === opt.value ? 'var(--surface)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 7,
                                fontSize: 12,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = livePO.status === opt.value ? 'var(--surface)' : 'transparent' }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.text, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                              {livePO.status === opt.value && <Check size={11} style={{ marginLeft: 'auto', color: col.text }} />}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                {livePO.client.name}
              </div>
              {livePO.referenceBy && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Referred by: <span style={{ color: 'var(--text-secondary)' }}>{livePO.referenceBy}</span>
                  {' · '}{deliveredBrands}/{livePO.brands.length} brands delivered
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Order Value</div>
              <div
                style={{
                  fontSize: 22, fontWeight: 800,
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-primary)', letterSpacing: '-0.02em',
                }}
              >
                {formatINR(totals.offer)}
              </div>
              {totals.mrp > totals.offer && (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-muted)', textDecoration: 'line-through',
                  }}
                >
                  {formatINR(totals.mrp)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Client details */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Client Details
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                padding: '14px',
                background: 'var(--surface)',
                borderRadius: 10,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Phone size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Phone</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                    {livePO.client.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Mail size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Email</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {livePO.client.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, gridColumn: '1/-1' }}>
                <MapPin size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Delivery Address</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    {livePO.client.address ? `${livePO.client.address}, ${livePO.client.city}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                </div>
              </div>
              {livePO.client.gstNumber && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, gridColumn: '1/-1' }}>
                  <Building2 size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>GST Number</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>{livePO.client.gstNumber}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Brand fulfilment funnels */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Order Tracking — by Brand
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {livePO.brands.map((bf) => (
                <FunnelTrack key={bf.brand} brand={bf} globalDiscount={livePO.globalDiscount} poId={livePO.id} />
              ))}
            </div>
          </div>

          {/* Internal notes */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Internal Notes
            </div>
            <textarea
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add internal notes about this order…"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-ui)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
            />
          </div>

          {/* Timestamps */}
          <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Created: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(livePO.createdAt)}</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Updated: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(livePO.updatedAt)}</span>
            </span>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─── Purchase Row Card ────────────────────────────────────────────────────────

function PurchaseCard({ po, onClick }: { po: PurchaseOrder; onClick: () => void }) {
  const totals    = calcPurchaseTotal(po)
  const statusCol = STATUS_COLOR[po.status]
  const deliveredBrands = po.brands.filter((b) => b.stage === 'delivered').length

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* PO ID + Status */}
      <div style={{ minWidth: 120, flexShrink: 0 }}>
        <div
          style={{
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)', letterSpacing: '-0.01em',
            marginBottom: 4,
          }}
        >
          {po.id}
        </div>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 7px', borderRadius: 999,
            fontSize: 10, fontWeight: 600,
            background: statusCol.bg, color: statusCol.text,
          }}
        >
          {STATUS_LABEL[po.status]}
        </span>
      </div>

      {/* Client */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }}
        >
          {po.client.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {po.client.city}
          {po.referenceBy && <span> · via {po.referenceBy}</span>}
        </div>
      </div>

      {/* Brand dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {po.brands.map((b) => {
          const col = STAGE_COLOR[b.stage]
          return (
            <div
              key={b.brand}
              title={`${b.brand}: ${STAGE_LABEL[b.stage]}`}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: col.text,
                border: `2px solid ${col.bg}`,
              }}
            />
          )
        })}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>
          {deliveredBrands}/{po.brands.length} done
        </span>
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)', letterSpacing: '-0.01em',
          }}
        >
          {formatINR(totals.offer)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(po.createdAt)}</div>
      </div>

      <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function PurchasesClient() {
  const orders = usePurchasesStore((s) => s.orders)
  const [search, setSearch]   = React.useState('')
  const [selected, setSelected] = React.useState<PurchaseOrder | null>(null)

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((po) =>
      po.id.toLowerCase().includes(q) ||
      po.client.name.toLowerCase().includes(q) ||
      po.referenceBy.toLowerCase().includes(q) ||
      po.brands.some((b) => b.brand.toLowerCase().includes(q))
    )
  }, [search, orders])

  // Aggregate KPIs
  const kpis = React.useMemo(() => {
    let total = 0, inProgress = 0, fulfilled = 0
    for (const po of orders) {
      total += calcPurchaseTotal(po).offer
      if (po.status === 'fulfilled') fulfilled++
      else if (po.status !== 'draft' && po.status !== 'cancelled') inProgress++
    }
    return { total, inProgress, fulfilled, orders: orders.length }
  }, [orders])

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Page header */}
      <div style={{ padding: '20px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShoppingBag size={18} style={{ color: 'var(--text-muted)' }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Purchases
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Client orders · vendor tracking · delivery funnel
            </p>
          </div>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#1d4ed8', color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
          >
            <Plus size={14} />
            New Purchase Order
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Orders', value: String(kpis.orders) },
            { label: 'In Progress', value: String(kpis.inProgress) },
            { label: 'Fulfilled', value: String(kpis.fulfilled) },
            { label: 'Total Value', value: formatINR(kpis.total) },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                padding: '10px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                flex: 1,
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 16, fontWeight: 700,
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-primary)', letterSpacing: '-0.01em',
                }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, PO number, brand…"
            style={{
              width: '100%',
              paddingLeft: 36, paddingRight: 14,
              paddingBlock: 9,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 60, gap: 8, color: 'var(--text-muted)',
            }}
          >
            <ShoppingBag size={36} strokeWidth={1.2} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>No purchase orders found</span>
            <span style={{ fontSize: 12 }}>Create a quotation and convert it to a purchase order</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((po) => (
              <PurchaseCard key={po.id} po={po} onClick={() => setSelected(po)} />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over */}
      <AnimatePresence>
        {selected && (
          <PurchaseSlideOver po={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
