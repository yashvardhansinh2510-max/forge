'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUp, ArrowDown, ArrowLeftRight, RotateCcw, SlidersHorizontal, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { products, warehouses, formatQty, type MovementType } from '@/lib/mock/inventory-data'

interface LogMovementModalProps {
  open: boolean
  onClose: () => void
}

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
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

export function LogMovementModal({ open, onClose }: LogMovementModalProps) {
  const [productSearch, setProductSearch] = React.useState('')
  const [showProductList, setShowProductList] = React.useState(false)

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'IN', reference: '', quantity: 0, productId: '' },
  })

  const selectedType = watch('type')
  const productId = watch('productId')
  const quantity = watch('quantity') || 0

  const selectedProduct = products.find((p) => p.id === productId)

  React.useEffect(() => {
    if (!open) {
      reset()
      setProductSearch('')
    }
  }, [open, reset])

  const filteredProducts = products.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()),
  )

  function onSubmit(data: FormValues) {
    const product = products.find((p) => p.id === data.productId)
    if (!product) return
    toast.success(`${data.type} of ${formatQty(data.quantity, product.unit)} for ${product.name} logged`)
    onClose()
  }

  const currentType = MOVEMENT_TYPES.find((t) => t.value === selectedType)
  const newStock = selectedProduct
    ? Math.max(0, selectedProduct.totalStock + (selectedType === 'OUT' ? -quantity : quantity))
    : 0

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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
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
                  width: 460,
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: 'calc(100vh - 64px)',
                  zIndex: 61,
                  background: 'white',
                  borderRadius: 14,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-default)',
                  overflow: 'auto',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '20px 20px 0',
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    zIndex: 1,
                  }}
                >
                  <DialogPrimitive.Title
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Log Stock Movement
                  </DialogPrimitive.Title>
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
                  {/* Movement type */}
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

                  {/* Product combobox */}
                  <div style={{ marginBottom: 14, position: 'relative' }}>
                    <label style={labelStyle}>Product</label>
                    <div style={{ position: 'relative' }}>
                      <Search
                        size={13}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-tertiary)',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        type="text"
                        placeholder={selectedProduct ? selectedProduct.name : 'Search product…'}
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setShowProductList(true)
                        }}
                        onFocus={() => setShowProductList(true)}
                        style={{
                          ...inputStyle,
                          paddingLeft: 30,
                          borderColor: errors.productId ? '#EF4444' : 'var(--border-default)',
                        }}
                      />
                    </div>
                    {errors.productId && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                        {errors.productId.message}
                      </p>
                    )}
                    {showProductList && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 10,
                          background: 'white',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          maxHeight: 200,
                          overflowY: 'auto',
                        }}
                      >
                        {filteredProducts.slice(0, 8).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setValue('productId', p.id)
                              setProductSearch('')
                              setShowProductList(false)
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              fontSize: 13,
                              background: productId === p.id ? 'var(--surface-ground)' : 'white',
                              border: 'none',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-subtle)',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'var(--surface-ground)'
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                productId === p.id ? 'var(--surface-ground)' : 'white'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                              {p.sku} · {formatQty(p.totalStock, p.unit)} in stock
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div style={{ padding: '12px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>
                      Quantity{selectedProduct ? ` (${selectedProduct.unit})` : ''}
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
                      placeholder="e.g. GRN-2024-001, SO-0012"
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
                  <div style={{ marginBottom: 14 }}>
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
                  {selectedProduct && quantity > 0 && (
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
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Current</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatQty(selectedProduct.totalStock, selectedProduct.unit)}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>→</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>After</div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: newStock < selectedProduct.reorderPoint ? '#B45309' : '#15803D',
                          }}
                        >
                          {formatQty(newStock, selectedProduct.unit)}
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
                      Log {currentType?.label}
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
