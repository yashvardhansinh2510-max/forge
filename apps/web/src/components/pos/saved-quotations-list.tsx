'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Plus, FileText, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { usePOSStore, type ActiveProject, type Room } from '@/lib/pos-store'
import useSWR from 'swr'

interface ApiQuotation {
  id: string
  revisionId: string
  quotationNumber: string
  revisionNumber: number
  status: string
  customerName: string | null
  siteAddress: string | null
  grandTotal: number
  createdAt: string
  lineItemCount: number
  isLocked: boolean
  globalDiscountPct: number
}

interface QuotationDetail {
  id: string
  revisionId: string
  quotationNumber: string
  status: string
  globalDiscountPct: number
  snapshot: { project: ActiveProject; rooms: Room[] } | null
}

/** All revisions for a single quotation number */
interface QuotationGroup {
  quotationNumber: string
  revisions: ApiQuotation[]  // sorted ascending by revisionNumber
  latest: ApiQuotation
}

const fetcher = async (url: string): Promise<ApiQuotation[]> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status}`)
  const json = await r.json()
  return Array.isArray(json) ? json : []
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT:            'Draft',
    PENDING_APPROVAL: 'Pending',
    APPROVED:         'Approved',
    REJECTED:         'Rejected',
    LOCKED:           'Locked',
    FINALIZED:        'Finalized',
  }
  return map[status] ?? status
}

function statusColor(status: string): string {
  if (status === 'APPROVED' || status === 'LOCKED' || status === 'FINALIZED') return '#16a34a'
  if (status === 'REJECTED') return '#dc2626'
  if (status === 'PENDING_APPROVAL') return '#d97706'
  return '#6b7280'
}

function groupQuotations(entries: ApiQuotation[]): QuotationGroup[] {
  if (!Array.isArray(entries)) return []
  const map = new Map<string, ApiQuotation[]>()
  for (const q of entries) {
    const arr = map.get(q.quotationNumber) ?? []
    arr.push(q)
    map.set(q.quotationNumber, arr)
  }
  const groups: QuotationGroup[] = []
  for (const [quotationNumber, revisions] of map.entries()) {
    const sorted = [...revisions].sort((a, b) => a.revisionNumber - b.revisionNumber)
    const latest = sorted[sorted.length - 1]
    if (!latest) continue
    groups.push({ quotationNumber, revisions: sorted, latest })
  }
  return groups
}

export function SavedQuotationsList() {
  const router = useRouter()
  const loadSnapshotWithContext = usePOSStore((s) => s.loadSnapshotWithContext)
  const [openingId, setOpeningId]         = React.useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  const { data: quotations, error, isLoading } = useSWR<ApiQuotation[]>('/api/quotations', fetcher, {
    revalidateOnFocus: true,
  })

  async function handleOpen(q: ApiQuotation) {
    setOpeningId(q.revisionId)
    try {
      const res = await fetch(`/api/quotations/${q.revisionId}`)
      if (!res.ok) throw new Error('Failed to load quotation')
      const detail = await res.json() as QuotationDetail
      if (detail.snapshot?.project && detail.snapshot?.rooms) {
        loadSnapshotWithContext(detail.snapshot.project, detail.snapshot.rooms, {
          quotationId:     detail.id,
          revisionId:      detail.revisionId,
          quotationNumber: detail.quotationNumber,
          revisionNumber:  q.revisionNumber,
          status:          detail.status,
          lastSavedAt:     new Date(q.createdAt).toISOString(),
        })
      }
      router.push('/pos')
    } catch {
      router.push('/pos')
    } finally {
      setOpeningId(null)
    }
  }

  function toggleGroup(quotationNumber: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(quotationNumber)) next.delete(quotationNumber)
      else next.add(quotationNumber)
      return next
    })
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 72, borderRadius: 10, marginBottom: 10,
              background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
              backgroundSize: '200% 100%',
              animation: `shimmer ${0.9 + i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>
        Failed to load quotations. Check your database connection.
      </div>
    )
  }

  const entries = Array.isArray(quotations) ? quotations : []
  const groups  = groupQuotations(entries)

  return (
    <div style={{ padding: '24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Quotations
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            {groups.length === 0 ? 'No quotations yet' : `${groups.length} quotation${groups.length === 1 ? '' : 's'} · ${entries.length} revision${entries.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/pos')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#1d4ed8', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
        >
          <Plus size={14} />
          New Quotation
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '72px 24px', background: 'white', borderRadius: 12,
            boxShadow: 'var(--shadow-sm)', textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, marginBottom: 16,
              background: 'linear-gradient(135deg, #e0e7ff, #ddd6fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FileText size={24} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No quotations yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, maxWidth: 320 }}>
            Build a quotation in the builder and click Save — it will appear here.
          </div>
          <button
            onClick={() => router.push('/pos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#1d4ed8', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
          >
            <Plus size={14} />
            Open Builder
          </button>
        </div>
      )}

      {/* Grouped quotation list */}
      {groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map((group) => {
            const { latest, revisions, quotationNumber } = group
            const isExpanded   = expandedGroups.has(quotationNumber)
            const hasMultiple  = revisions.length > 1
            const isOpeningAny = revisions.some((r) => openingId === r.revisionId)

            return (
              <div
                key={quotationNumber}
                style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}
              >
                {/* Group header — shows latest revision info */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    cursor: 'pointer', transition: 'background 60ms',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                  }}
                  onClick={() => {
                    if (hasMultiple) toggleGroup(quotationNumber)
                    else void handleOpen(latest)
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #e0e7ff, #ddd6fe)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isOpeningAny
                      ? <Loader2 size={18} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                      : <FileText size={18} style={{ color: '#4f46e5' }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}>
                        {quotationNumber}
                      </span>
                      {hasMultiple ? (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                          {revisions.length} revisions
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                          Rev {latest.revisionNumber}
                        </span>
                      )}
                      {latest.customerName && (
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          · {latest.customerName}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          color: statusColor(latest.status),
                          background: `${statusColor(latest.status)}15`,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}
                      >
                        {statusLabel(latest.status)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      <span>{latest.lineItemCount} {latest.lineItemCount === 1 ? 'item' : 'items'}</span>
                      {latest.globalDiscountPct > 0 && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>{latest.globalDiscountPct}% off</span>
                        </>
                      )}
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span suppressHydrationWarning>
                        {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  {latest.lineItemCount > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {formatINR(latest.grandTotal)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>incl. GST</div>
                    </div>
                  )}

                  {/* Expand / navigate arrow */}
                  {hasMultiple
                    ? (isExpanded
                        ? <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />)
                    : <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  }
                </div>

                {/* Revision list (expanded) */}
                {isExpanded && hasMultiple && (
                  <div>
                    {revisions.map((rev, idx) => {
                      const isLast      = idx === revisions.length - 1
                      const isOpening   = openingId === rev.revisionId
                      return (
                        <div
                          key={rev.revisionId}
                          onClick={() => void handleOpen(rev)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '10px 20px 10px 32px',
                            borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                            cursor: isOpening ? 'default' : 'pointer',
                            opacity: isOpening ? 0.7 : 1,
                            transition: 'background 60ms',
                            background: isLast ? 'rgba(29,78,216,0.02)' : 'transparent',
                          }}
                          onMouseEnter={(e) => { if (!isOpening) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isLast ? 'rgba(29,78,216,0.02)' : 'transparent' }}
                        >
                          {/* Tree connector */}
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, width: 24, textAlign: 'right' }}>
                            {isLast ? '└─' : '├─'}
                          </div>

                          {/* Rev icon */}
                          <div style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            background: isLast ? 'linear-gradient(135deg, #e0e7ff, #ddd6fe)' : 'var(--surface)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isOpening
                              ? <Loader2 size={13} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                              : <span style={{ fontSize: 9, fontWeight: 700, color: isLast ? '#4f46e5' : 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                                  R{rev.revisionNumber}
                                </span>
                            }
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: isLast ? 700 : 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                                Rev {rev.revisionNumber}{isLast ? ' (latest)' : ''}
                              </span>
                              <span
                                style={{
                                  fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                                  color: statusColor(rev.status),
                                  background: `${statusColor(rev.status)}15`,
                                  textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}
                              >
                                {statusLabel(rev.status)}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              <span suppressHydrationWarning>
                                {formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}
                              </span>
                              {rev.lineItemCount > 0 && (
                                <> · {rev.lineItemCount} items</>
                              )}
                            </div>
                          </div>

                          {rev.lineItemCount > 0 && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: isLast ? 700 : 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatINR(rev.grandTotal)}
                              </div>
                            </div>
                          )}

                          <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
