'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { useProcurementStore } from '@/lib/procurement-store'
import {
  LEGAL_TRANSITIONS,
  STAGE_LABELS,
  STAGE_COLORS,
  type POStage,
} from '@/lib/mock/procurement-data'
import { revalidateAfterMove, fetcher } from '@/lib/swr-helpers'

// ─── types ────────────────────────────────────────────────────────────────────

type AllFromStage = 'ORDERED' | POStage
const ALL_FROM_STAGES: AllFromStage[] = [
  'ORDERED','PENDING_CO','PENDING_DIST','AT_GODOWN','IN_BOX','DISPATCHED','NOT_DISPLAYED',
]

interface DBLineItem {
  id: string
  poId: string
  productId: string
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
  product?: { sku: string; name: string; brand: string }
}

function computeAvailable(line: DBLineItem, stage: AllFromStage): number {
  const fields: Record<POStage, number> = {
    PENDING_CO:    line.qtyPendingCo,
    PENDING_DIST:  line.qtyPendingDist,
    AT_GODOWN:     line.qtyAtGodown,
    IN_BOX:        line.qtyInBox,
    DISPATCHED:    line.qtyDispatched,
    NOT_DISPLAYED: line.qtyNotDisplayed,
  }
  if (stage === 'ORDERED') {
    const staged = Object.values(fields).reduce((a, b) => a + b, 0)
    return Math.max(0, line.qtyOrdered - staged)
  }
  return fields[stage]
}

// ─── PartialMoveModal ─────────────────────────────────────────────────────────

export function PartialMoveModal() {
  const modal              = usePurchasesStore((s) => s.moveStageModal)
  const closeMoveStageModal = usePurchasesStore((s) => s.closeMoveStageModal)
  const moveStageLocal     = useProcurementStore((s) => s.moveStage)

  const [fromStage, setFromStage] = useState<AllFromStage>('ORDERED')
  const [toStage,   setToStage]   = useState<POStage | ''>('')
  const [qty,       setQty]       = useState(1)
  const [note,      setNote]      = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Fetch line data from DB (live, not from stale Zustand store)
  const { data: line, mutate: mutateLine } = useSWR<DBLineItem>(
    modal?.lineId ? `/api/purchase-orders/lines/${modal.lineId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  // Reset state whenever the modal opens for a different line
  useEffect(() => {
    if (!modal || !line) return
    const firstFrom = ALL_FROM_STAGES.find((s) => computeAvailable(line, s) > 0) ?? 'ORDERED'
    setFromStage(firstFrom)
    const legalNext = LEGAL_TRANSITIONS[firstFrom]
    setToStage(legalNext[0] ?? '')
    setQty(1)
    setNote('')
    setError(null)
    setLoading(false)
  }, [modal?.poId, modal?.lineId, line]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFromStageChange(next: AllFromStage) {
    setFromStage(next)
    const legalNext = LEGAL_TRANSITIONS[next]
    setToStage(legalNext[0] ?? '')
    setQty(1)
    setError(null)
  }

  const handleSubmit = useCallback(async () => {
    if (!modal || !toStage) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/purchase-orders/lines/${modal.lineId}/move-stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromStage, toStage, qty, note: note || undefined }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.message || err.error || 'Move failed')
        return
      }

      // Optimistic local update for Zustand (drill-down panels still read from there)
      moveStageLocal(modal.poId, modal.lineId, fromStage, toStage as POStage, qty)

      // Revalidate all SWR caches
      await Promise.all([
        revalidateAfterMove(),
        mutateLine(),
      ])

      closeMoveStageModal()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [modal, fromStage, toStage, qty, note, moveStageLocal, closeMoveStageModal, mutateLine])

  // ── render ────────────────────────────────────────────────────────────────

  if (!modal) return null

  // While loading line data from DB
  if (!line) {
    return (
      <>
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9998,
        }} onClick={closeMoveStageModal} />
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 9999, background: '#fff', borderRadius: 14, padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}>
          <div style={{ color: '#6b7280', fontFamily: 'var(--font-ui)', fontSize: 14 }}>Loading...</div>
        </div>
      </>
    )
  }

  const available = computeAvailable(line, fromStage)

  // Stages with qty > 0 (user can move FROM these)
  const fromOptions = ALL_FROM_STAGES.filter((s) => computeAvailable(line, s) > 0)

  // Legal TO stages for the selected FROM stage
  const legalToList = (LEGAL_TRANSITIONS[fromStage] ?? []) as POStage[]

  // Colors
  const fromColor = fromStage === 'ORDERED' ? '#2563eb' : STAGE_COLORS[fromStage] ?? '#6b7280'
  const toColor   = toStage ? (STAGE_COLORS[toStage as POStage] ?? '#6b7280') : '#6b7280'

  return (
    <>
      {/* backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 9998, cursor: 'pointer',
        }}
        onClick={closeMoveStageModal}
      />

      {/* dialog */}
      <div
        data-testid="partial-move-modal"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 9999,
          background: '#ffffff', borderRadius: 14,
          width: 380, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 12px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Move Stage</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {line.product?.name ?? modal.lineId}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 10, fontWeight: 600, color: '#6b7280',
              background: '#f3f4f6', borderRadius: 4, padding: '2px 7px',
            }}>
              {line.product?.sku ?? ''}
            </div>
          </div>
          <button
            onClick={closeMoveStageModal}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#9ca3af', padding: 4, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* FROM STAGE */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              FROM STAGE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fromOptions.length === 0 && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>No units available to move</div>
              )}
              {fromOptions.map((stage) => {
                const stageQty = computeAvailable(line, stage)
                const sel = fromStage === stage
                const c = stage === 'ORDERED' ? '#2563eb' : STAGE_COLORS[stage] ?? '#6b7280'
                return (
                  <button
                    key={stage}
                    onClick={() => handleFromStageChange(stage)}
                    data-testid={`from-stage-${stage}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 7,
                      border: sel ? `1.5px solid ${c}` : '1.5px solid #e5e7eb',
                      background: sel ? `${c}12` : '#ffffff',
                      color: sel ? c : '#374151',
                      fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font-ui)', cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {stage === 'ORDERED' ? 'Unallocated' : STAGE_LABELS[stage]}
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      background: sel ? c : '#e5e7eb',
                      color: sel ? '#fff' : '#6b7280',
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {stageQty}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* TO STAGE */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              TO STAGE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {legalToList.length === 0 && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>No further stage transition available</div>
              )}
              {legalToList.map((stage) => {
                const sel = toStage === stage
                const c = STAGE_COLORS[stage] ?? '#6b7280'
                return (
                  <button
                    key={stage}
                    onClick={() => { setToStage(stage); setError(null) }}
                    data-testid={`to-stage-${stage}`}
                    style={{
                      padding: '5px 10px', borderRadius: 7,
                      border: sel ? `1.5px solid ${c}` : '1.5px solid #e5e7eb',
                      background: sel ? `${c}12` : '#ffffff',
                      color: sel ? c : '#374151',
                      fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font-ui)', cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {STAGE_LABELS[stage]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* QUANTITY */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              QUANTITY <span style={{ fontWeight: 400, color: '#9ca3af' }}>max {available}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                data-testid="qty-minus"
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  fontSize: 16, cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                  color: qty <= 1 ? '#d1d5db' : '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <input
                type="number"
                value={qty}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!isNaN(n) && n >= 1 && n <= available) setQty(n)
                }}
                data-testid="qty-input"
                style={{
                  width: 52, height: 32, textAlign: 'center',
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  fontSize: 14, fontWeight: 700, color: '#111827',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
                min={1} max={available}
              />
              <button
                onClick={() => setQty((q) => Math.min(available, q + 1))}
                disabled={qty >= available}
                data-testid="qty-plus"
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  fontSize: 16, cursor: qty >= available ? 'not-allowed' : 'pointer',
                  color: qty >= available ? '#d1d5db' : '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>

          {/* NOTE */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.02em' }}>
              NOTE <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received partial shipment…"
              data-testid="move-note-input"
              style={{
                width: '100%', height: 34, borderRadius: 7,
                border: '1px solid #e5e7eb', padding: '0 10px',
                fontSize: 12, color: '#111827',
                fontFamily: 'var(--font-ui)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              data-testid="move-error-msg"
              style={{
                padding: '8px 12px', borderRadius: 7,
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', fontSize: 12, fontWeight: 500,
                fontFamily: 'var(--font-ui)',
              }}
            >{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              onClick={closeMoveStageModal}
              style={{
                height: 34, padding: '0 18px', borderRadius: 7,
                border: '1px solid #e5e7eb', background: '#ffffff',
                color: '#374151', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!toStage || available === 0 || legalToList.length === 0 || loading}
              data-testid="move-stage-confirm-btn"
              style={{
                height: 34, padding: '0 18px', borderRadius: 7,
                border: 'none',
                background: toStage ? toColor : '#e5e7eb',
                color: toStage ? '#fff' : '#9ca3af',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-ui)', cursor: (toStage && !loading) ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Moving…' : `Move ${qty} unit${qty !== 1 ? 's' : ''}${toStage ? ` → ${STAGE_LABELS[toStage as POStage]}` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
