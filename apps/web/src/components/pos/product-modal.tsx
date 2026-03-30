'use client'

import * as React from 'react'
import { X, Check, Package } from 'lucide-react'
import { usePOSStore, useActiveRoom } from '@/lib/pos-store'
import { getBundledParts, getDefaultFinish } from '@/lib/mock/pos-data'
import type { Finish } from '@/lib/mock/pos-data'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

const BRAND_BG: Record<string, string> = {
  'Grohe':     'linear-gradient(135deg, #009FE3 0%, #0077B6 100%)',
  'Hansgrohe': 'linear-gradient(135deg, #00529A 0%, #003f7a 100%)',
  'Axor':      'linear-gradient(135deg, #1C1C1E 0%, #3a3a3c 100%)',
  'Vitra':     'linear-gradient(135deg, #E5002B 0%, #b0001f 100%)',
  'Geberit':   'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
  'Kajaria':   'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
}

export function ProductModal() {
  const product             = usePOSStore((s) => s.modalProduct)
  const closeModal          = usePOSStore((s) => s.closeModal)
  const addItemToActiveRoom = usePOSStore((s) => s.addItemToActiveRoom)
  const activeRoom          = useActiveRoom()

  const [selectedFinish, setSelectedFinish]         = React.useState<Finish | null>(null)
  const [qty, setQty]                               = React.useState(1)
  const [includeConcealedParts, setIncludeConcealedParts] = React.useState(false)

  React.useEffect(() => {
    if (product) {
      const def = getDefaultFinish(product)
      setSelectedFinish(def ?? product.finishes[0] ?? null)
      setQty(1)
    }
  }, [product?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  React.useEffect(() => {
    if (!product) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [product, closeModal])

  if (!product) return null

  const bundledParts = getBundledParts(product.id)
  const effectiveMRP = product.mrp + (selectedFinish?.priceAdj ?? 0)
  const canAdd       = !!activeRoom && (product.finishes.length === 0 || !!selectedFinish)
  const bg           = BRAND_BG[product.brand] ?? 'linear-gradient(135deg, #6B7280, #4B5563)'

  const handleAdd = () => {
    if (!canAdd) return
    const finish = selectedFinish ?? { name: '', code: '', color: '#9ca3af', priceAdj: 0 }
    addItemToActiveRoom(product, finish, qty, includeConcealedParts)
    closeModal()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.48)',
          zIndex: 50,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 'min(94vw, 740px)',
          maxHeight: '90vh',
          background: 'var(--background)',
          borderRadius: 14,
          boxShadow: '0 24px 72px rgba(0,0,0,0.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Brand color header */}
        <div
          style={{
            background: bg,
            padding: '20px 22px 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.20)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                {product.brand.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  marginBottom: 3,
                }}
              >
                {product.name}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
                {product.subCategory} · SKU: <span style={{ fontFamily: 'var(--font-ui)' }}>{product.sku}</span>
              </div>
            </div>
            {/* MRP */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>MRP</div>
              <div
                style={{
                  fontSize: 20, fontWeight: 800,
                  fontFamily: 'var(--font-ui)',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatINR(effectiveMRP)}
              </div>
            </div>
          </div>

          {/* Features */}
          {product.features.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
              {product.features.map((f) => (
                <span
                  key={f}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    fontSize: 10, color: '#fff',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <Check size={8} />
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Left: configure */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
            {/* Description */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 18px' }}>
              {product.description}
            </p>

            {/* Finish picker */}
            {product.finishes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10, fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    marginBottom: 10,
                  }}
                >
                  Finish
                  {selectedFinish && (
                    <span style={{ fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>
                      — {selectedFinish.name}
                      {selectedFinish.priceAdj > 0 && (
                        <span style={{ fontFamily: 'var(--font-ui)', marginLeft: 3 }}>
                          (+{formatINR(selectedFinish.priceAdj)})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {product.finishes.map((f) => {
                    const isSelected = selectedFinish?.code === f.code
                    return (
                      <button
                        key={f.code}
                        onClick={() => setSelectedFinish(f)}
                        title={f.name}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 5,
                          padding: '8px 10px',
                          borderRadius: 9,
                          border: isSelected ? '2px solid var(--text-primary)' : '2px solid var(--border)',
                          background: isSelected ? 'var(--surface)' : 'transparent',
                          cursor: 'pointer',
                          minWidth: 58,
                          transition: 'border-color 0.1s, background 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = 'var(--text-secondary)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        <div
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: f.color,
                            border: '1px solid rgba(0,0,0,0.12)',
                            boxShadow: isSelected
                              ? '0 0 0 2px var(--background), 0 0 0 4px var(--text-primary)'
                              : 'none',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 9, fontWeight: 500,
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                            textAlign: 'center', lineHeight: 1.25,
                          }}
                        >
                          {f.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  marginBottom: 10,
                }}
              >
                Quantity
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  style={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '7px 0 0 7px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer', fontSize: 16,
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--background)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                >−</button>
                <div
                  style={{
                    width: 44, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    fontSize: 14, fontWeight: 700,
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-primary)',
                  }}
                >
                  {qty}
                </div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  style={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '0 7px 7px 0',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer', fontSize: 16,
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--background)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                >+</button>
              </div>
            </div>

            {/* Active room */}
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {activeRoom
                ? <>Adding to: <strong style={{ color: 'var(--text-primary)' }}>{activeRoom.name}</strong></>
                : <span style={{ color: 'var(--text-muted)' }}>No active room — create a room first</span>
              }
            </div>
          </div>

          {/* Right: concealed parts (opt-in) */}
          {bundledParts.length > 0 && (
            <div
              style={{
                width: 200, flexShrink: 0,
                borderLeft: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '18px 14px',
                overflowY: 'auto',
              }}
            >
              {/* Opt-in toggle */}
              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  cursor: 'pointer', marginBottom: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={includeConcealedParts}
                  onChange={(e) => setIncludeConcealedParts(e.target.checked)}
                  style={{ marginTop: 2, cursor: 'pointer', accentColor: '#1d4ed8' }}
                />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    Include concealed parts
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                    {bundledParts.length} part{bundledParts.length > 1 ? 's' : ''} — add only if needed
                  </div>
                </div>
              </label>

              {/* Parts list (dimmed when not checked) */}
              <div style={{ opacity: includeConcealedParts ? 1 : 0.4, transition: 'opacity 150ms' }}>
                <div
                  style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10,
                  }}
                >
                  <Package size={10} />
                  Concealed parts
                </div>
                {bundledParts.map((part) => (
                  <div
                    key={part.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      marginBottom: 10, paddingBottom: 10,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{part.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3, marginBottom: 2 }}>
                        {part.name}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                        {formatINR(part.mrp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            onClick={closeModal}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: canAdd ? '#1d4ed8' : 'var(--border)',
              color: canAdd ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700,
              cursor: canAdd ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.01em',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { if (canAdd) e.currentTarget.style.background = '#1e40af' }}
            onMouseLeave={(e) => { if (canAdd) e.currentTarget.style.background = '#1d4ed8' }}
          >
            {activeRoom ? `Add to ${activeRoom.name}` : 'No active room'}
          </button>
          {/* Close X */}
          <button
            onClick={closeModal}
            style={{
              width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </>
  )
}
