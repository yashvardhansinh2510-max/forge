'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { X, Clock, Lock, FileEdit, Plus, Loader2, CheckCircle2, GitBranch } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { Quotation } from '@/lib/mock/sales-data'
import { toast } from 'sonner'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

interface RevisionRow {
  id: string
  revisionNumber: number
  status: string
  isLocked: boolean
  createdAt: string
  lockedAt: string | null
  globalDiscountPct: number
  itemCount: number
  grandTotal: number
  notes: string | null
}

interface QuotationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  quotation: Quotation | null
  /** Called when a new revision is created — pass back the new revisionId */
  onRevisionCreated?: (revisionId: string, revisionNumber: number) => void
}

export function QuotationHistoryModal({
  isOpen,
  onClose,
  quotation,
  onRevisionCreated,
}: QuotationHistoryModalProps) {
  const [revisions, setRevisions] = React.useState<RevisionRow[]>([])
  const [loading, setLoading]     = React.useState(false)
  const [creating, setCreating]   = React.useState(false)
  const [error, setError]         = React.useState<string | null>(null)

  // Fetch revisions whenever the modal opens for a quotation
  React.useEffect(() => {
    if (!isOpen || !quotation) return
    setError(null)

    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/quotations')
        if (!res.ok) throw new Error('Failed to load')
        const all = await res.json() as Array<{
          id: string
          revisionId: string
          quotationNumber: string
          status: string
          isLocked: boolean
          createdAt: string
          grandTotal: number
          lineItemCount: number
          globalDiscountPct: number
        }>
        // Filter to revisions belonging to this quotation
        const matching = all
          .filter(q => q.id === quotation!.id)
          .map(q => ({
            id:                q.revisionId,
            revisionNumber:    0,   // We'll get this from the detail call
            status:            q.status,
            isLocked:          q.isLocked,
            createdAt:         q.createdAt,
            lockedAt:          null,
            globalDiscountPct: q.globalDiscountPct ?? 0,
            itemCount:         q.lineItemCount,
            grandTotal:        q.grandTotal,
            notes:             null,
          }))

        // If there are multiple revisions (one quotationId → multiple revisionIds), they
        // all show up as separate rows in the flat list. Use the revisionId to distinguish.
        setRevisions(matching.reverse()) // oldest first
      } catch {
        setError('Could not load revision history')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [isOpen, quotation])

  async function handleCreateRevision() {
    if (!quotation?.revisionId) return
    setCreating(true)
    try {
      const res = await fetch(`/api/quotations/${quotation.revisionId}/revise`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json() as { message?: string }
        throw new Error(err.message ?? 'Could not create revision')
      }
      const data = await res.json() as { revisionId: string; revisionNumber: number }
      toast.success(`Revision ${data.revisionNumber} created — you can now edit it`)
      onRevisionCreated?.(data.revisionId, data.revisionNumber)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revision creation failed')
    } finally {
      setCreating(false)
    }
  }

  const latestRevision  = revisions[revisions.length - 1]
  const canCreateRevision = latestRevision?.isLocked === true

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 60, backdropFilter: 'blur(2px)',
          }}
        />
        <DialogPrimitive.Content
          style={{
            position: 'fixed', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white', borderRadius: 14,
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            width: 520, maxWidth: '95vw',
            maxHeight: '80vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            zIndex: 61,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: APPLE_EASE }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    Revision History
                  </h2>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {quotation?.number} · {quotation?.customerName}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {canCreateRevision && (
                  <button
                    onClick={() => void handleCreateRevision()}
                    disabled={creating}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 8, border: 'none',
                      background: creating ? '#6B7280' : '#111827',
                      color: 'white', fontSize: 12, fontWeight: 600,
                      cursor: creating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {creating
                      ? <><Loader2 size={12} className="animate-spin" /> Creating…</>
                      : <><GitBranch size={12} /> Create New Revision</>
                    }
                  </button>
                )}
                <DialogPrimitive.Close asChild>
                  <button
                    style={{
                      width: 30, height: 30, borderRadius: 6, border: 'none',
                      background: 'var(--surface-tint)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <X size={14} />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, color: 'var(--text-tertiary)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: 13 }}>Loading history…</span>
                </div>
              )}

              {error && (
                <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
                  {error}
                </div>
              )}

              {!loading && !error && revisions.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No revision history found.
                </div>
              )}

              {!loading && revisions.length > 0 && (
                <div style={{ position: 'relative' }}>
                  {/* Timeline line */}
                  <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--border-subtle)', borderRadius: 1 }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {revisions.map((rev, i) => {
                      const isLatest  = i === revisions.length - 1
                      const isLocked  = rev.isLocked
                      const statusLabel = isLocked ? 'Locked' : 'Draft'
                      const dotColor  = isLocked ? '#15803D' : isLatest ? '#2563EB' : '#9CA3AF'
                      const bgColor   = isLatest ? 'rgba(37,99,235,0.04)' : 'transparent'

                      return (
                        <div
                          key={rev.id}
                          style={{
                            display: 'flex', gap: 14, paddingBottom: 20,
                            paddingLeft: 4, position: 'relative',
                          }}
                        >
                          {/* Dot */}
                          <div style={{ flexShrink: 0, width: 24, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: dotColor, border: '2px solid white', boxShadow: `0 0 0 2px ${dotColor}20`, zIndex: 1 }} />
                          </div>

                          {/* Card */}
                          <div style={{
                            flex: 1, background: bgColor,
                            border: `1px solid ${isLatest ? 'rgba(37,99,235,0.15)' : 'var(--border-subtle)'}`,
                            borderRadius: 10, padding: '12px 14px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isLocked
                                    ? <Lock size={12} style={{ color: '#15803D', flexShrink: 0 }} />
                                    : <FileEdit size={12} style={{ color: '#2563EB', flexShrink: 0 }} />
                                  }
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {i === 0 ? 'Original' : `Revision ${i}`}
                                    {isLatest && (
                                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: dotColor, background: `${dotColor}15`, padding: '1px 6px', borderRadius: 4 }}>
                                        Current
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                  {formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}
                                  {rev.lockedAt && (
                                    <> · Locked {format(new Date(rev.lockedAt), 'dd MMM yyyy')}</>
                                  )}
                                </div>
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                                background: isLocked ? '#F0FDF4' : '#EFF6FF',
                                color: isLocked ? '#15803D' : '#2563EB',
                              }}>
                                {statusLabel}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <span>
                                <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                  {rev.itemCount}
                                </strong>{' '}
                                item{rev.itemCount !== 1 ? 's' : ''}
                              </span>
                              <span>
                                Discount:{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {rev.globalDiscountPct}%
                                </strong>
                              </span>
                              {rev.grandTotal > 0 && (
                                <span>
                                  Total:{' '}
                                  <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                    ₹ {rev.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {rev.notes && (
                              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                                {rev.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer info when can create */}
            {!loading && canCreateRevision && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-tint)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <CheckCircle2 size={13} style={{ color: '#15803D', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Latest revision is locked. Click <strong>Create New Revision</strong> to make editable changes.
                </span>
              </div>
            )}
            {!loading && !canCreateRevision && revisions.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-tint)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Plus size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Lock this revision first, then you can create a new one.
                </span>
              </div>
            )}
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
