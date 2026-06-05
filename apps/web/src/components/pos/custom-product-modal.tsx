'use client'

import * as React from 'react'
import { X, ImagePlus, Trash2 } from 'lucide-react'
import { usePOSStore, useActiveRoom } from '@/lib/pos-store'
import type { Finish, POSProduct } from '@/lib/mock/pos-data'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const BRANDS = ['Grohe', 'Axor', 'Hansgrohe', 'Vitra', 'Geberit', 'Kajaria', 'Other'] as const
const BRAND_COLORS: Record<string, string> = {
  Grohe: '#009FE3', Axor: '#1C1C1E', Hansgrohe: '#00529A',
  Vitra: '#E5002B', Geberit: '#6B7280', Kajaria: '#F59E0B', Other: '#4B5563',
}

const CATEGORIES = [
  'Faucets & Mixers', 'Showers', 'Bathtubs', 'Basins & Vanities',
  'WC & Bidets', 'Accessories', 'Tiles', 'Other',
] as const

const COMMON_FINISHES: { name: string; code: string; color: string }[] = [
  { name: 'Chrome',              code: 'CHROME',   color: '#B0B7BC' },
  { name: 'Matt Black',          code: 'MATTBLK',  color: '#1C1C1E' },
  { name: 'Brushed Bronze',      code: 'BRBRONZE', color: '#8B6E4E' },
  { name: 'Polished Gold',       code: 'POLGOLD',  color: '#C8A96E' },
  { name: 'Brushed Nickel',      code: 'BRNICKEL', color: '#6E7174' },
  { name: 'Matt White',          code: 'MATTWHT',  color: '#E8E8E8' },
  { name: 'Brushed Stainless',   code: 'BRSTEEL',  color: '#8C9199' },
  { name: 'Warm Sunset',         code: 'WRMSUN',   color: '#B87333' },
  { name: 'Other',               code: 'OTHER',    color: '#9CA3AF' },
]

const GST_RATES = [5, 12, 18, 28] as const

interface FormState {
  name: string
  code: string
  brand: string
  category: string
  finishPreset: string
  finishCustomName: string
  mrp: string
  offerPrice: string
  qty: string
  unit: string
  gstRate: string
  description: string
  imageUrl: string
}

const EMPTY_FORM: FormState = {
  name: '', code: '', brand: 'Grohe', category: 'Faucets & Mixers',
  finishPreset: 'CHROME', finishCustomName: '',
  mrp: '', offerPrice: '', qty: '1', unit: 'Nos',
  gstRate: '18',
  description: '', imageUrl: '',
}

function fieldLabel(label: string, required?: boolean) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
      {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
    </div>
  )
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '7px 10px',
    border: `1px solid ${hasError ? '#dc2626' : 'var(--border)'}`,
    borderRadius: 7, background: 'var(--surface)',
    fontSize: 12, color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
    outline: 'none', boxSizing: 'border-box',
  }
}

function ImageUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = React.useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  const hasImage = !!value

  return (
    <div>
      {hasImage && (
        <div style={{
          position: 'relative', marginBottom: 8, display: 'inline-block',
          borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Product preview"
            style={{ display: 'block', width: 80, height: 80, objectFit: 'contain', background: 'var(--surface)' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 18, height: 18, borderRadius: 4, border: 'none',
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ImagePlus size={12} />
          {hasImage ? 'Replace' : 'Upload'}
        </button>
        <input
          value={value.startsWith('data:') ? '' : value}
          onChange={handleUrlChange}
          placeholder="or paste image URL…"
          style={{ ...inputStyle(), flex: 1 }}
        />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
        Upload a file or paste a URL. Leave blank to show a finish-color illustration.
      </div>
    </div>
  )
}

export function CustomProductModal() {
  const open             = usePOSStore((s) => s.customModalOpen)
  const closeCustomModal = usePOSStore((s) => s.closeCustomModal)
  const addItem          = usePOSStore((s) => s.addItemToActiveRoom)
  const activeRoom       = useActiveRoom()

  const [form, setForm]     = React.useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})

  React.useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setErrors({})
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCustomModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeCustomModal])

  if (!open) return null

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.code.trim()) e.code = 'Required'
    const mrpNum = parseFloat(form.mrp)
    if (!form.mrp || isNaN(mrpNum) || mrpNum <= 0) e.mrp = 'Enter a valid MRP'
    const offerNum = parseFloat(form.offerPrice)
    if (!form.offerPrice || isNaN(offerNum) || offerNum <= 0) e.offerPrice = 'Enter a valid offer price'
    else if (offerNum > mrpNum) e.offerPrice = 'Cannot exceed MRP'
    const qtyNum = parseInt(form.qty, 10)
    if (!form.qty || isNaN(qtyNum) || qtyNum < 1) e.qty = 'Min 1'
    if (form.finishPreset === 'OTHER' && !form.finishCustomName.trim()) e.finishCustomName = 'Enter finish name'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleAdd() {
    if (!validate() || !activeRoom) return

    const mrp      = parseFloat(form.mrp)
    const offer    = parseFloat(form.offerPrice)
    const qty      = parseInt(form.qty, 10)
    const discount = mrp > 0 ? Math.round(Math.max(0, Math.min(60, (1 - offer / mrp) * 100)) * 100) / 100 : 0

    const finishMeta = COMMON_FINISHES.find((f) => f.code === form.finishPreset) ?? COMMON_FINISHES[0]!
    const finishName = form.finishPreset === 'OTHER' ? form.finishCustomName.trim() : finishMeta.name
    const finishCode = form.finishPreset === 'OTHER'
      ? form.finishCustomName.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 10) || 'CUSTOM'
      : finishMeta.code

    const finish: Finish = {
      name: finishName,
      code: finishCode,
      sku: form.code.trim(),
      color: finishMeta.color,
      priceAdj: 0,
    }

    const product: POSProduct = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sku: form.code.trim(),
      articleNumber: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      brand: form.brand,
      brandColor: BRAND_COLORS[form.brand] ?? '#4B5563',
      category: form.category,
      subCategory: form.category,
      subcategoryLabel: form.category,
      mrp,
      gstRate: parseFloat(form.gstRate) || 18,
      unit: form.unit.trim() || 'Nos',
      tier: 'premium',
      finishes: [finish],
      defaultFinish: finish.code,
      requiresPartIds: [],
      isConcealed: false,
      features: [],
      imageUrl: form.imageUrl.trim() || undefined,
      isCustom: true,
    }

    addItem(product, finish, qty, false, [], discount)
    closeCustomModal()
  }

  const mrpNum   = parseFloat(form.mrp) || 0
  const offerNum = parseFloat(form.offerPrice) || 0
  const discount = mrpNum > 0 && offerNum > 0 && offerNum <= mrpNum
    ? Math.round((1 - offerNum / mrpNum) * 100)
    : null

  const selectedFinishColor = COMMON_FINISHES.find((f) => f.code === form.finishPreset)?.color ?? '#9CA3AF'
  const canAdd = !!activeRoom

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCustomModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.48)',
          zIndex: 52,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 53,
          width: 'min(96vw, 640px)',
          maxHeight: '90vh',
          background: 'var(--background)',
          borderRadius: 14,
          boxShadow: '0 24px 72px rgba(0,0,0,0.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Add Custom Product
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              One-off item — not added to the master catalog
            </div>
          </div>
          <button
            onClick={closeCustomModal}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>

            {/* Product Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              {fieldLabel('Product Name', true)}
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Grohe Euphoria Shower Head"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.name}</div>}
            </div>

            {/* Product Code */}
            <div>
              {fieldLabel('Product Code / SKU', true)}
              <input
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                placeholder="e.g. 27185000"
                style={inputStyle(!!errors.code)}
              />
              {errors.code && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.code}</div>}
            </div>

            {/* Brand */}
            <div>
              {fieldLabel('Brand', true)}
              <select
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                style={{ ...inputStyle(), appearance: 'none' }}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              {fieldLabel('Category', true)}
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                style={{ ...inputStyle(), appearance: 'none' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Finish */}
            <div>
              {fieldLabel('Finish', true)}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: selectedFinishColor,
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
                <select
                  value={form.finishPreset}
                  onChange={(e) => set('finishPreset', e.target.value)}
                  style={{ ...inputStyle(), flex: 1, appearance: 'none' }}
                >
                  {COMMON_FINISHES.map((f) => <option key={f.code} value={f.code}>{f.name}</option>)}
                </select>
              </div>
              {form.finishPreset === 'OTHER' && (
                <div style={{ marginTop: 6 }}>
                  <input
                    value={form.finishCustomName}
                    onChange={(e) => set('finishCustomName', e.target.value)}
                    placeholder="Finish name (e.g. Brushed Copper)"
                    style={inputStyle(!!errors.finishCustomName)}
                  />
                  {errors.finishCustomName && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.finishCustomName}</div>}
                </div>
              )}
            </div>

            {/* MRP */}
            <div>
              {fieldLabel('MRP (₹)', true)}
              <input
                type="number"
                min={0}
                value={form.mrp}
                onChange={(e) => set('mrp', e.target.value)}
                placeholder="e.g. 12500"
                style={inputStyle(!!errors.mrp)}
              />
              {errors.mrp && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.mrp}</div>}
            </div>

            {/* Offer Price */}
            <div>
              {fieldLabel('Offer Price (₹)', true)}
              <input
                type="number"
                min={0}
                value={form.offerPrice}
                onChange={(e) => set('offerPrice', e.target.value)}
                placeholder="e.g. 10625"
                style={inputStyle(!!errors.offerPrice)}
              />
              {errors.offerPrice && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.offerPrice}</div>}
              {discount !== null && discount > 0 && (
                <div style={{ fontSize: 10, color: '#15803d', marginTop: 3 }}>
                  {discount}% off MRP
                </div>
              )}
            </div>

            {/* Qty */}
            <div>
              {fieldLabel('Quantity', true)}
              <input
                type="number"
                min={1}
                value={form.qty}
                onChange={(e) => set('qty', e.target.value)}
                style={inputStyle(!!errors.qty)}
              />
              {errors.qty && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3 }}>{errors.qty}</div>}
            </div>

            {/* Unit */}
            <div>
              {fieldLabel('Unit')}
              <input
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="Nos, Set, Sqft…"
                style={inputStyle()}
              />
            </div>

            {/* GST Rate */}
            <div>
              {fieldLabel('GST Rate', true)}
              <select
                value={form.gstRate}
                onChange={(e) => set('gstRate', e.target.value)}
                style={{ ...inputStyle(), appearance: 'none' }}
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={String(r)}>{r}%</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              {fieldLabel('Description')}
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Optional product description…"
                rows={2}
                style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            {/* Image Upload */}
            <div style={{ gridColumn: '1 / -1' }}>
              {fieldLabel('Product Image (optional)')}
              <ImageUpload
                value={form.imageUrl}
                onChange={(v) => set('imageUrl', v)}
              />
            </div>
          </div>

          {/* Room note */}
          <div style={{
            marginTop: 16, padding: '9px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-secondary)',
          }}>
            {activeRoom
              ? <>Adding to: <strong style={{ color: 'var(--text-primary)' }}>{activeRoom.name}</strong></>
              : <span style={{ color: 'var(--text-muted)' }}>No active room — create a room first</span>
            }
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={closeCustomModal}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: 8,
              border: 'none',
              background: canAdd ? '#1d4ed8' : 'var(--border)',
              color: canAdd ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700,
              cursor: canAdd ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.01em',
            }}
          >
            {activeRoom ? `Add to ${activeRoom.name}` : 'No active room'}
          </button>
        </div>
      </div>
    </>
  )
}
