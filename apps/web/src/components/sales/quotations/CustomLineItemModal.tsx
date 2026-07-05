'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { LineItem } from '@/lib/mock/sales-data'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const BRANDS = ['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'KAJARIA', 'OTHER'] as const
const UNITS  = ['Nos', 'Set', 'Pair', 'Running Meter', 'Sqft'] as const

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  brand:       z.enum(BRANDS).optional(),
  unit:        z.enum(UNITS),
  qty:         z.number({ invalid_type_error: 'Qty is required' }).int().positive('Must be ≥ 1'),
  unitPrice:   z.number({ invalid_type_error: 'Price is required' }).positive('Must be > 0'),
  // No .default() here — provided via useForm defaultValues to avoid zodResolver input/output type mismatch
  discount:    z.number().min(0).max(100),
  hsnCode:     z.string().optional(),
  notes:       z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

// Single source of truth for form defaults — used in useForm and both reset calls
const DEFAULT_VALUES: Partial<FormValues> = { unit: 'Nos', qty: 1, discount: 0 }

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '6px 9px',
  border: '1.5px solid var(--border-default)', borderRadius: 7,
  outline: 'none', boxSizing: 'border-box', background: 'var(--background)',
  color: 'var(--text-primary)',
  // Required by CLAUDE.md for all financial/numeric inputs
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

const errorStyle: React.CSSProperties = {
  fontSize: 11, color: '#BE123C', marginTop: 3,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--text-tertiary)', textTransform: 'uppercase' as const,
  letterSpacing: '0.06em', marginBottom: 4,
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomLineItemModalProps {
  open: boolean
  onClose: () => void
  onAdd: (item: LineItem) => void
}

export function CustomLineItemModal({ open, onClose, onAdd }: CustomLineItemModalProps) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  function handleAdd(values: FormValues) {
    const item: LineItem = {
      id:          `custom-${Date.now()}`,
      productId:   '',
      productName: values.description,
      sku:         '',
      // description is computed from brand/hsnCode at display time (SortableRow custom branch)
      // — not stored redundantly here
      description: '',
      unit:        values.unit,
      qty:         values.qty,
      unitPrice:   values.unitPrice,
      discount:    values.discount,
      gstRate:     18,
      isCustom:    true,
      brand:       values.brand,
      hsnCode:     values.hsnCode,
      notes:       values.notes,
    }
    onAdd(item)
    reset(DEFAULT_VALUES)
    onClose()
  }

  function handleClose() {
    reset(DEFAULT_VALUES)
    onClose()
  }

  // Pattern matches QuotationBuilder: Root always mounted, AnimatePresence sequences
  // the exit animation on the inner Portal motion elements via forceMount.
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  key="custom-item-backdrop"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ position: 'fixed', inset: 0, zIndex: 70, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
                />
              </DialogPrimitive.Overlay>

              {/* Dialog */}
              <DialogPrimitive.Content asChild>
                <motion.div
                  key="custom-item-dialog"
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.22, ease: APPLE_EASE }}
                  style={{
                    position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 480, maxHeight: '90vh', overflowY: 'auto',
                    zIndex: 71, background: 'white', borderRadius: 14,
                    boxShadow: 'var(--shadow-modal)', padding: '24px 28px',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <DialogPrimitive.Title style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                        Custom Line Item
                      </DialogPrimitive.Title>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                        Item is quotation-specific — not saved to catalogue
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border-default)', background: 'white', cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Form fields — no <form> tag, onClick handler on submit button */}
                  <Field label="Description *" error={errors.description?.message}>
                    <input
                      {...register('description')}
                      placeholder="e.g. Concealed cistern with push plate"
                      autoFocus
                      style={inputStyle}
                    />
                  </Field>

                  {/* Brand + Unit — 2-col row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Brand</label>
                      <Controller
                        control={control}
                        name="brand"
                        render={({ field }) => (
                          <select
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                          >
                            <option value="">— None —</option>
                            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        )}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Unit *</label>
                      <select {...register('unit')} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Qty + Unit Price — 2-col row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <Field label="Qty *" error={errors.qty?.message}>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        {...register('qty', { valueAsNumber: true })}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Unit Price / MRP (₹) *" error={errors.unitPrice?.message}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        {...register('unitPrice', { valueAsNumber: true })}
                        placeholder="0"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  {/* Discount + HSN — 2-col row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Discount %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        {...register('discount', { valueAsNumber: true })}
                        placeholder="0"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>HSN Code</label>
                      <input
                        {...register('hsnCode')}
                        placeholder="e.g. 6910"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <Field label="Notes" error={errors.notes?.message}>
                    <textarea
                      {...register('notes')}
                      placeholder="Any additional notes…"
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </Field>

                  {/* GST note */}
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 20, marginTop: -4 }}>
                    GST @ 18% applied. Line item included in all totals and PDF.
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={handleClose}
                      style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { void handleSubmit(handleAdd)() }}
                      style={{ height: 34, padding: '0 18px', borderRadius: 8, border: 'none', background: '#111827', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Add to Quotation
                    </button>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
