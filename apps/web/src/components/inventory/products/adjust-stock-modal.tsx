'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUp, ArrowDown, ArrowLeftRight, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatQty, warehouses, type MovementType, type Product } from '@/lib/mock/inventory-data'

interface AdjustStockModalProps {
  product: Product | null
  onClose: () => void
}

const schema = z.object({
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUST', 'RETURN']),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  warehouseFromId: z.string().optional(),
  warehouseToId: z.string().optional(),
  reference: z.string().min(1, 'Reference is required'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const MOVEMENT_TYPES: { value: MovementType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'IN', label: 'Stock In', icon: ArrowUp, color: '#15803D' },
  { value: 'OUT', label: 'Stock Out', icon: ArrowDown, color: '#BE123C' },
  { value: 'TRANSFER', label: 'Transfer', icon: ArrowLeftRight, color: '#2563EB' },
  { value: 'ADJUST', label: 'Adjust', icon: SlidersHorizontal, color: '#B45309' },
  { value: 'RETURN', label: 'Return', icon: RotateCcw, color: '#6D28D9' },
]

export function AdjustStockModal({ product, onClose }: AdjustStockModalProps) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'IN', reference: '', quantity: 0 },
  })

  const selectedType = watch('type')
  const quantity = watch('quantity') || 0

  React.useEffect(() => {
    if (!product) reset({ type: 'IN', reference: '', quantity: 0 })
  }, [product, reset])

  function onSubmit(data: FormValues) {
    toast.success(`Stock ${data.type.toLowerCase()} of ${formatQty(data.quantity, product!.unit)} recorded`)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 36,
    padding: '0 10px',
    fontSize: 13,
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    outline: 'none',
    background: 'white',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 5,
  }

  const currentType = MOVEMENT_TYPES.find((t) => t.value === selectedType)
  const stockDelta =
    selectedType === 'OUT' ? -quantity : selectedType === 'ADJUST' ? quantity : quantity
  const newStock = product
    ? Math.max(0, product.totalStock + (selectedType === 'OUT' ? -quantity : quantity))
    : 0

  return (
    <DialogPrimitive.Root open={!!product} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {product && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 60,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(3px)',
                }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 440,
                  maxWidth: 'calc(100vw - 32px)',
                  zIndex: 61,
                  background: 'white',
                  borderRadius: 14,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-default)',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '20px 20px 0',
                  }}
                >
                  <div>
                    <DialogPrimitive.Title
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Adjust Stock
                    </DialogPrimitive.Title>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {product.name}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid var(--border-default)',
                      background: 'white',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 20 }}>
                  {/* Movement type segmented control */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Movement Type</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {MOVEMENT_TYPES.map((t) => {
                        const Icon = t.icon
                        const active = selectedType === t.value
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setValue('type', t.value)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: `1px solid ${active ? t.color : 'var(--border-default)'}`,
                              background: active ? `${t.color}14` : 'white',
                              color: active ? t.color : 'var(--text-secondary)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 120ms',
                            }}
                          >
                            <Icon size={12} />
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>
                      Quantity ({product.unit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register('quantity')}
                      style={{
                        ...inputStyle,
                        borderColor: errors.quantity ? '#EF4444' : 'var(--border-default)',
                      }}
                    />
                    {errors.quantity && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>

                  {/* Warehouse selectors */}
                  {(selectedType === 'IN' || selectedType === 'RETURN') && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>To Warehouse</label>
                      <select {...register('warehouseToId')} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Select warehouse</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedType === 'OUT' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>From Warehouse</label>
                      <select {...register('warehouseFromId')} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Select warehouse</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedType === 'TRANSFER' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label style={labelStyle}>From</label>
                        <select {...register('warehouseFromId')} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="">Select</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.shortName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>To</label>
                        <select {...register('warehouseToId')} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="">Select</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.shortName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Reference */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Reference #</label>
                    <input
                      type="text"
                      placeholder="e.g. PO-2024-001"
                      {...register('reference')}
                      style={{
                        ...inputStyle,
                        borderColor: errors.reference ? '#EF4444' : 'var(--border-default)',
                      }}
                    />
                    {errors.reference && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                        {errors.reference.message}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Notes (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add any notes..."
                      {...register('notes')}
                      style={{
                        ...inputStyle,
                        height: 'auto',
                        padding: '8px 10px',
                        resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Live summary */}
                  {quantity > 0 && (
                    <div
                      style={{
                        background: 'var(--surface-ground)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                          Current stock
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatQty(product.totalStock, product.unit)}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>→</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                          After adjustment
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: newStock < product.reorderPoint ? '#B45309' : '#15803D',
                          }}
                        >
                          {formatQty(newStock, product.unit)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        height: 34,
                        padding: '0 16px',
                        borderRadius: 7,
                        border: '1px solid var(--border-default)',
                        background: 'white',
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        height: 34,
                        padding: '0 16px',
                        borderRadius: 7,
                        border: 'none',
                        background: currentType?.color ?? 'var(--accent)',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm {currentType?.label}
                    </button>
                  </div>
                </form>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
