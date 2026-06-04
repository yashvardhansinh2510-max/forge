'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  STAGE_FRIENDLY_NAME,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface ProjectResult {
  id: string
  clientName: string
  projectName: string
  siteAddress?: string | null
}

interface Props {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (counts: HeaderCounts) => void
  onClose: () => void
  /** Optional: pre-select a product */
  initialProductId?: string
  /** Optional: pre-select a source line */
  initialSourceLineId?: string
}

const TRANSFERABLE: PurchaseStage[] = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED']
const REASON_PRESETS = ['Urgent site requirement', 'Customer on hold', 'Stock redistribution', 'Damaged — reallocating']

// ─── Step tracker ─────────────────────────────────────────────────────────────
type Step = 'product' | 'source' | 'destination' | 'confirm'

interface ProductOption {
  id: string
  name: string
  sku: string
  brand: string
  imageUrl: string | null
}

function ProductMiniThumb({ product }: { product: ProductOption }) {
  if (product.imageUrl) {
    return (
      <div className="relative h-9 w-9 shrink-0">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="rounded-lg border border-[var(--border)] object-contain p-0.5"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-[10px] font-bold text-[var(--text-muted)]">
      {product.brand.slice(0, 2)}
    </div>
  )
}

export default function MoveMaterialModal({
  lines,
  activeBrand,
  onMoved,
  onClose,
  initialProductId,
  initialSourceLineId,
}: Props) {
  // ─── Derived product list from current lines ─────────────────────────────
  const productMap = lines.reduce<Record<string, ProductOption>>((acc, l) => {
    if (!acc[l.product.id]) {
      acc[l.product.id] = {
        id: l.product.id,
        name: l.product.name,
        sku: l.product.sku,
        brand: l.product.brand,
        imageUrl: l.product.imageUrl,
      }
    }
    return acc
  }, {})
  const allProducts = Object.values(productMap).sort((a, b) => a.name.localeCompare(b.name))

  // ─── State ────────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [selectedSourceLineId, setSelectedSourceLineId] = useState<string | null>(null)
  const [fromStage, setFromStage] = useState<PurchaseStage | null>(null)
  const [qty, setQty] = useState(1)
  const [destQuery, setDestQuery] = useState('')
  const [destResults, setDestResults] = useState<ProjectResult[]>([])
  const [selectedDest, setSelectedDest] = useState<ProjectResult | null>(null)
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const destRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Apply initial pre-fills
  useEffect(() => {
    if (initialProductId) {
      const p = productMap[initialProductId]
      if (p) setSelectedProduct(p)
    }
    if (initialSourceLineId) setSelectedSourceLineId(initialSourceLineId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When product changes, reset source
  useEffect(() => {
    if (!initialSourceLineId) setSelectedSourceLineId(null)
    setFromStage(null)
    setQty(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id])

  // When source line changes, auto-select the best from-stage
  useEffect(() => {
    if (!selectedSourceLineId) return
    const sourceLine = lines.find((l) => l.id === selectedSourceLineId)
    if (!sourceLine) return
    const best = TRANSFERABLE.find((s) => sourceLine.stages[s] > 0) ?? null
    setFromStage(best)
    setQty(1)
  }, [selectedSourceLineId, lines])

  // Destination search
  useEffect(() => {
    if (destQuery.length < 2) { setDestResults([]); setShowDestDropdown(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/search?q=${encodeURIComponent(destQuery)}`)
        const data = await res.json() as ProjectResult[]
        setDestResults(Array.isArray(data) ? data : [])
        setShowDestDropdown(true)
      } catch { setDestResults([]) }
    }, 280)
    return () => clearTimeout(t)
  }, [destQuery])

  // Click-outside for dest dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setShowDestDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // (auto-dismiss handled by sonner toast)

  const productLines = selectedProduct
    ? lines.filter((l) => l.product.id === selectedProduct.id && TRANSFERABLE.some((s) => l.stages[s] > 0))
    : []

  const sourceLine = selectedSourceLineId ? lines.find((l) => l.id === selectedSourceLineId) ?? null : null
  const availableQty = fromStage && sourceLine ? sourceLine.stages[fromStage] : 0

  const filteredProducts = productSearch.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : allProducts

  async function doMove() {
    if (!sourceLine || !fromStage || !reason.trim()) return
    if (!selectedDest && !destQuery.trim()) { setErr('Choose a destination customer'); return }

    setSaving(true)
    setErr('')

    const isNew = destQuery.trim() && !selectedDest
    const body = isNew
      ? { mode: 'new', stage: fromStage, qty, newCustomerName: destQuery.trim(), reason, brand: activeBrand }
      : selectedDest
      ? { mode: 'project', stage: fromStage, qty, targetProjectId: selectedDest.id, reason, brand: activeBrand }
      : null

    if (!body) { setErr('Select or type a destination customer'); setSaving(false); return }

    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(sourceLine.id)}/transfer`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }

      if (!res.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Move failed')
        return
      }

      const destName = isNew ? destQuery.trim() : selectedDest!.clientName
      const movedMsg = `Moved ${qty} unit${qty > 1 ? 's' : ''} of ${selectedProduct?.name} to ${destName}`

      // Fire toast BEFORE resets so the closure captures the right values
      toast.success(movedMsg, { duration: 4000 })

      onMoved(data.stageTotals)

      // Full reset — clear everything so the form is obviously ready for a new move
      setSelectedProduct(null)
      setSelectedSourceLineId(null)
      setFromStage(null)
      setQty(1)
      setReason('')
      setDestQuery('')
      setSelectedDest(null)
      setProductSearch('')
      setErr('')
    } catch {
      setErr('Network error — move not saved')
    } finally {
      setSaving(false)
    }
  }

  const canConfirm = sourceLine && fromStage && qty >= 1 && qty <= availableQty && reason.trim() && (selectedDest || destQuery.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="relative flex w-full max-w-lg flex-col rounded-[24px] bg-white shadow-[0_32px_64px_rgba(0,0,0,0.18)]" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Move Material</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Step 1: Product ─────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              1 · Product
            </p>
            {selectedProduct ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
                <ProductMiniThumb product={selectedProduct} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1d4ed8]">{selectedProduct.name}</p>
                  <p className="font-mono text-xs text-[#3b82f6]">{selectedProduct.sku} · {selectedProduct.brand}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedProduct(null); setProductSearch(''); setSelectedSourceLineId(null) }}
                  className="shrink-0 text-xs text-[#2563eb] hover:text-[#1d4ed8]"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product name or SKU…"
                  autoFocus
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#93c5fd]"
                />
                {filteredProducts.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-sm">
                    {filteredProducts.slice(0, 12).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProduct(p); setProductSearch('') }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--n-50)]"
                      >
                        <ProductMiniThumb product={p} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                          <p className="font-mono text-xs text-[var(--text-muted)]">{p.sku} · {p.brand}</p>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length > 12 && (
                      <p className="px-4 py-2 text-xs text-[var(--text-muted)]">+ {filteredProducts.length - 12} more — refine search</p>
                    )}
                  </div>
                )}
                {productSearch.trim() && filteredProducts.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">No products match "{productSearch}"</p>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Source allocation ────────────────────── */}
          {selectedProduct && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                2 · Taking from
              </p>
              {productLines.length === 0 ? (
                <p className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  No stock available for this product at any stage.
                </p>
              ) : (
                <div className="space-y-2">
                  {productLines.map((l) => {
                    const activeStages = TRANSFERABLE.filter((s) => l.stages[s] > 0)
                    const isSelected = selectedSourceLineId === l.id
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedSourceLineId(l.id)}
                        className={[
                          'w-full rounded-xl border px-4 py-3 text-left transition',
                          isSelected ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[var(--border)] bg-white hover:border-[#93c5fd]',
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {l.customer?.name ?? 'Unlinked'}
                        </p>
                        {l.customer?.siteAddress && (
                          <p className="text-xs text-[var(--text-muted)]">{l.customer.siteAddress}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {activeStages.map((s) => (
                            <span key={s} className="rounded-md bg-[var(--n-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                              {STAGE_FRIENDLY_NAME[s] ?? s}: {l.stages[s]}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stage picker within selected source */}
          {sourceLine && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {TRANSFERABLE.filter((s) => sourceLine.stages[s] > 0).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setFromStage(s); setQty(1) }}
                    className={[
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                      fromStage === s
                        ? 'border-[#0f172a] bg-[#0f172a] text-white'
                        : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                    ].join(' ')}
                  >
                    {STAGE_FRIENDLY_NAME[s] ?? s} ({sourceLine.stages[s]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          {fromStage && availableQty > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Quantity (of {availableQty} available)</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
                >-</button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  max={availableQty}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setQty(Math.min(availableQty, Math.max(1, Number.isFinite(v) ? v : 1)))
                  }}
                  className="w-16 rounded-xl border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[#60a5fa]"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(availableQty, q + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
                >+</button>
                <button
                  type="button"
                  onClick={() => setQty(availableQty)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                >
                  All {availableQty}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Destination ─────────────────────────── */}
          {sourceLine && fromStage && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                3 · Moving to
              </p>
              <div ref={destRef} className="relative">
                {selectedDest ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1d4ed8]">{selectedDest.clientName}</p>
                      {selectedDest.siteAddress && (
                        <p className="text-xs text-[#3b82f6]">{selectedDest.siteAddress}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedDest(null); setDestQuery('') }}
                      className="text-xs text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="Search customer or type a new name…"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[#93c5fd]"
                  />
                )}
                {showDestDropdown && destResults.length > 0 && !selectedDest && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-float)]">
                    {destResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedDest(r); setDestQuery(''); setShowDestDropdown(false) }}
                        className="w-full px-4 py-2.5 text-left transition hover:bg-[var(--n-50)]"
                      >
                        <p className="text-sm font-medium text-[var(--text-primary)]">{r.clientName}</p>
                        {r.siteAddress && <p className="text-xs text-[var(--text-muted)]">{r.siteAddress}</p>}
                      </button>
                    ))}
                    {destQuery.trim() && (
                      <div className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)]">
                        Or confirm to create <strong>"{destQuery.trim()}"</strong> as a new customer
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Reason ──────────────────────────────── */}
          {sourceLine && fromStage && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                4 · Reason
              </p>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this material moving?"
                className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[#93c5fd]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REASON_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReason(p)}
                    className="rounded-lg bg-[var(--n-100)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--n-200)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Impact preview ──────────────────────────────── */}
          {canConfirm && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--n-50)] px-4 py-3 text-xs">
              <p className="font-semibold text-[var(--text-secondary)] mb-1">Preview</p>
              <p className="text-[var(--text-primary)]">
                <span className="font-medium">{sourceLine.customer?.name ?? 'source'}</span>
                {' '}→{' '}
                <span className="font-medium">{selectedDest?.clientName ?? destQuery.trim()}</span>
              </p>
              <p className="mt-0.5 text-[var(--text-muted)]">
                {qty} × {selectedProduct?.name} at {STAGE_FRIENDLY_NAME[fromStage] ?? fromStage}
              </p>
            </div>
          )}

          {err && (
            <p className="rounded-xl bg-[#fef2f2] p-3 text-xs text-[#dc2626]">{err}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[var(--border)] p-5">
          <button
            type="button"
            onClick={() => void doMove()}
            disabled={saving || !canConfirm}
            className="flex-1 rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
          >
            {saving ? 'Moving…' : `Move ${qty} unit${qty > 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
