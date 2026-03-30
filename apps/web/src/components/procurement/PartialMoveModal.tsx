'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { useProcurementStore } from '@/lib/procurement-store'
import {
  LEGAL_TRANSITIONS,
  STAGE_LABELS,
  STAGE_COLORS,
  type POStage,
} from '@/lib/mock/procurement-data'
import { revalidateAfterMove } from '@/lib/swr-helpers'

// ─── Constants ────────────────────────────────────────────────────────────────

const NUM: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontVariantNumeric: 'tabular-nums',
}

const ALL_FROM_STAGES: Array<'ORDERED' | POStage> = [
  'ORDERED', 'PENDING_CO', 'PENDING_DIST', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeAvailable(line: {
  qtyOrdered: number
  qtyPendingCo: number; qtyPendingDist: number; qtyAtGodown: number
  qtyInBox: number; qtyDispatched: number; qtyNotDisplayed: number
}, stage: 'ORDERED' | POStage): number {
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
    return line.qtyOrdered - staged
  }
  return fields[stage]
}

// ─── PartialMoveModal ─────────────────────────────────────────────────────────

export function PartialMoveModal() {
  const modal              = usePurchasesStore((s) => s.moveStageModal)
  const closeMoveStageModal = usePurchasesStore((s) => s.closeMoveStageModal)
  const orders             = useProcurementStore((s) => s.orders)
  const moveStage          = useProcurementStore((s) => s.moveStage)

  const [fromStage, setFromStage] = useState<'ORDERED' | POStage>('ORDERED')
  const [toStage,   setToStage]   = useState<POStage | ''>('')
  const [qty,       setQty]       = useState(1)
  const [note,      setNote]      = useState('')
  const [error,     setError]     = useState<string | null>(null)

  // Find the line data
  const po   = modal ? orders.find((o) => o.id === modal.poId)   : null
  const line = po    ? po.lineItems.find((l) => l.id === modal?.lineId) : null

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
  }, [modal?.poId, modal?.lineId]) // eslint-disable-line react-hooks/exhaustive-deps

  // When fromStage changes, reset toStage to first legal option
  function handleFromStageChange(next: 'ORDERED' | POStage) {
    setFromStage(next)
    const legalNext = LEGAL_TRANSITIONS[next]
    setToStage(legalNext[0] ?? '')
    setQty(1)
    setError(null)
  }

  const [loading, setLoading] = useState(false)

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

      // Optimistic local update so UI reflects immediately
      moveStage(modal.poId, modal.lineId, fromStage, toStage as POStage, qty)

      // Revalidate SWR caches for stat cards
      await revalidateAfterMove()

      closeMoveStageModal()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [modal, fromStage, toStage, qty, note, moveStage, closeMoveStageModal])

  if (!modal || !line) return null

  const available   = computeAvailable(line, fromStage)
  const legalToList = LEGAL_TRANSITIONS[fromStage] as POStage[]
  const toColor     = toStage ? (STAGE_COLORS[toStage as POStage] ?? '#374151') : '#374151'

  // Stages with qty > 0 for the "from" selector
  const fromOptions = ALL_FROM_STAGES.filter((s) => computeAvailable(line, s) > 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeMoveStageModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 200,
          animation: 'modal-fade-in 0.15s ease',
        }}
      />

      {/* Modal card */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 201,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: 420,
        maxWidth: 'calc(100vw - 32px)',
        animation: 'modal-slide-in 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <style>{`
          @keyframes modal-fade-in  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes modal-slide-in { from { opacity: 0; transform: translate(-50%,-46%) } to { opacity: 1; transform: translate(-50%,-50%) } }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-ui)' }}>
              Move Stage
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
              {line.productName}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 9, fontWeight: 700, color: '#6b7280',
              background: '#f3f4f6', padding: '2px 6px', borderRadius: 4,
              fontFamily: 'var(--font-ui)', letterSpacing: '0.04em',
            }}>
              {line.productSku}
            </div>
          </div>
          <button
            onClick={closeMoveStageModal}
            style={{
              width: 26, height: 26, borderRadius: 6,
              border: '1px solid #e5e7eb', background: '#f9fafb',
              color: '#6b7280', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* From stage */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              FROM STAGE
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {fromOptions.length === 0 ? (
                <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
                  No qty in any stage
                </span>
              ) : (
                fromOptions.map((s) => {
                  const avail = computeAvailable(line, s)
                  const color = s === 'ORDERED' ? '#6b7280' : (STAGE_COLORS[s] ?? '#6b7280')
                  const active = fromStage === s
                  return (
                    <button
                      key={s}
                      onClick={() => handleFromStageChange(s)}
                      style={{
                        padding: '5px 10px', borderRadius: 6,
                        border: active ? `2px solid ${color}` : '1.5px solid #e5e7eb',
                        background: active ? `${color}12` : '#f9fafb',
                        color: active ? color : '#374151',
                        fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
                        cursor: 'pointer', transition: 'all 0.1s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span>{STAGE_LABELS[s]}</span>
                      <span style={{
                        ...NUM, fontSize: 9,
                        background: active ? color : '#e5e7eb',
                        color: active ? '#fff' : '#6b7280',
                        padding: '1px 5px', borderRadius: 10, fontWeight: 700,
                      }}>
                        {avail}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* To stage */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              TO STAGE
            </label>
            {legalToList.length === 0 ? (
              <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'var(--font-ui)' }}>
                No legal transitions from {STAGE_LABELS[fromStage]}
              </span>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                {legalToList.map((s) => {
                  const color  = STAGE_COLORS[s] ?? '#374151'
                  const active = toStage === s
                  return (
                    <button
                      key={s}
                      onClick={() => setToStage(s)}
                      style={{
                        padding: '5px 12px', borderRadius: 6,
                        border: active ? `2px solid ${color}` : '1.5px solid #e5e7eb',
                        background: active ? `${color}12` : '#f9fafb',
                        color: active ? color : '#374151',
                        fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                    >
                      {STAGE_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Qty */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              QUANTITY
              <span style={{ ...NUM, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>
                max {available}
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb',
                  background: '#f9fafb', color: '#374151', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={available}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(available, Number(e.target.value) || 1)))}
                style={{
                  width: 70, height: 30, textAlign: 'center',
                  border: '1.5px solid #e5e7eb', borderRadius: 6,
                  fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                  fontSize: 14, fontWeight: 700, color: '#111827',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => setQty((q) => Math.min(available, q + 1))}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb',
                  background: '#f9fafb', color: '#374151', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Note (optional) */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'var(--font-ui)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              NOTE <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Received partial shipment…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              style={{
                width: '100%', height: 34, padding: '0 10px',
                border: '1.5px solid #e5e7eb', borderRadius: 6,
                fontFamily: 'var(--font-ui)', fontSize: 11, color: '#111827',
                background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 11, color: '#dc2626', fontFamily: 'var(--font-ui)',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px',
          borderTop: '1px solid #f3f4f6',
        }}>
          <button
            onClick={closeMoveStageModal}
            style={{
              height: 34, padding: '0 16px', borderRadius: 7,
              border: '1.5px solid #e5e7eb', background: '#fff',
              color: '#374151', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
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
    </>
  )
}
