'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Phone, MessageCircle, Mail, MapPin, ExternalLink,
  CheckCircle2, XCircle, Copy, Check,
} from 'lucide-react'
import { SlideOver, DetailField } from '@/components/crm/shared/slide-over'
import {
  FOLLOWUP_STATUS_CONFIG,
  CUSTOMER_TYPE_LABELS,
  RESPONSE_METHOD_LABELS,
  addFollowUpResponse,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpStatus,
  type ResponseMethod,
} from '@/lib/mock/followup-data'
import type { Quotation } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'
import { Badge } from '@/components/shared/badge'

const METHOD_ICON: Record<ResponseMethod, React.ReactNode> = {
  call:     <Phone size={13} />,
  whatsapp: <MessageCircle size={13} />,
  email:    <Mail size={13} />,
  visit:    <MapPin size={13} />,
}

const STATUSES: FollowUpStatus[] = ['pending', 'contacted', 'interested', 'negotiating', 'won', 'lost']

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white', borderRadius: 16, padding: 28,
          width: 360, boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border-default)', background: 'white',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, fontSize: 13,
              background: confirmColor, color: 'white',
              border: 'none', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main slide-over ──────────────────────────────────────────────────────────

interface FollowUpSlideOverProps {
  followUp: FollowUp | null
  onClose: () => void
  onRefresh: () => Promise<void>
  onStatusChange?: (id: string, status: FollowUpStatus) => Promise<void>
  onLogResponse?: (id: string, outcome: string, method: string, nextAction: string, nextDate: string) => Promise<void>
  quotations: Quotation[]
  canEdit?: boolean
}

export function FollowUpSlideOver({ followUp, onClose, onRefresh, onStatusChange, onLogResponse, quotations, canEdit = true }: FollowUpSlideOverProps) {
  const f = followUp

  // Add response form state
  const [method, setMethod] = React.useState<ResponseMethod>('call')
  const [outcome, setOutcome] = React.useState('')
  const [nextAction, setNextAction] = React.useState('')
  const [nextDate, setNextDate] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]!
  })
  const [submitting, setSubmitting] = React.useState(false)

  // Confirmation dialogs
  const [confirmWon, setConfirmWon] = React.useState(false)
  const [confirmLost, setConfirmLost] = React.useState(false)

  // Phone copy
  const [copied, setCopied] = React.useState(false)

  // Reset form when follow-up changes
  React.useEffect(() => {
    setOutcome('')
    setNextAction('')
    const d = new Date()
    d.setDate(d.getDate() + 3)
    setNextDate(d.toISOString().split('T')[0]!)
  }, [f?.id])

  if (!f) return null

  const linkedQuotation = f.quotationId
    ? quotations.find((q) => q.id === f.quotationId)
    : undefined

  const statusCfg = FOLLOWUP_STATUS_CONFIG[f.status]

  function handleCopyPhone() {
    void navigator.clipboard.writeText(f!.customerPhone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleStatusChange(status: FollowUpStatus) {
    if (onStatusChange) {
      await onStatusChange(f!.id, status)
    } else {
      updateFollowUpStatus(f!.id, status)
      await onRefresh()
    }
    toast.success(`Status updated to ${FOLLOWUP_STATUS_CONFIG[status].label}`)
  }

  async function handleLogResponse() {
    if (!outcome.trim()) {
      toast.error('Enter what the customer said')
      return
    }
    setSubmitting(true)
    if (onLogResponse) {
      await onLogResponse(f!.id, outcome.trim(), method, nextAction.trim(), nextDate)
    } else {
      const response = {
        id: `r${Date.now()}`,
        date: new Date(),
        method,
        outcome: outcome.trim(),
        nextAction: nextAction.trim(),
        staffMember: 'Suresh Iyer',
      }
      addFollowUpResponse(f!.id, response, new Date(nextDate))
      await onRefresh()
    }
    setOutcome('')
    setNextAction('')
    setSubmitting(false)
    toast.success('Response logged')
  }

  async function handleMarkWon() {
    if (onStatusChange) {
      await onStatusChange(f!.id, 'won')
    } else {
      updateFollowUpStatus(f!.id, 'won')
      // Sync quotation in mock data
      if (f!.quotationId) {
        const qIdx = quotations.findIndex((q) => q.id === f!.quotationId)
        if (qIdx !== -1) {
          quotations[qIdx] = { ...quotations[qIdx]!, status: 'accepted', acceptedAt: new Date() }
        }
      }
      await onRefresh()
    }
    setConfirmWon(false)
    toast.success('Marked as Won!')
    onClose()
  }

  async function handleMarkLost() {
    if (onStatusChange) {
      await onStatusChange(f!.id, 'lost')
    } else {
      updateFollowUpStatus(f!.id, 'lost')
      // Sync quotation in mock data
      if (f!.quotationId) {
        const qIdx = quotations.findIndex((q) => q.id === f!.quotationId)
        if (qIdx !== -1) {
          quotations[qIdx] = { ...quotations[qIdx]!, status: 'declined' }
        }
      }
      await onRefresh()
    }
    setConfirmLost(false)
    toast.success('Marked as Lost')
    onClose()
  }

  const isClosed = f.status === 'won' || f.status === 'lost'

  return (
    <>
      <SlideOver
        open={true}
        onClose={onClose}
        title={f.customerName}
        subtitle={f.projectName ?? CUSTOMER_TYPE_LABELS[f.customerType]}
        width={560}
      >
        {/* ── Header info ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            padding: '12px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Phone with copy */}
          <button
            onClick={handleCopyPhone}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface-tint)', border: '1px solid var(--border-subtle)',
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13,
              color: 'var(--text-secondary)', transition: 'all 120ms',
            }}
          >
            {copied ? <Check size={12} style={{ color: '#16A34A' }} /> : <Phone size={12} />}
            {f.customerPhone}
            <Copy size={10} style={{ opacity: 0.4 }} />
          </button>

          {/* Type badge */}
          <Badge
            label={f.type === 'walk_in' ? 'Walk-in' : 'Quotation'}
            dot={f.type === 'walk_in' ? 'accent' : 'neutral'}
          />

          {/* Status selector */}
          {canEdit && <div style={{ marginLeft: 'auto' }}>
            <select
              value={f.status}
              onChange={(e) => handleStatusChange(e.target.value as FollowUpStatus)}
              style={{
                height: 28, padding: '0 8px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${statusCfg.text}`,
                background: statusCfg.bg,
                color: statusCfg.text,
                fontWeight: 600, cursor: 'pointer', outline: 'none',
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{FOLLOWUP_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>}
        </div>

        {/* ── Info grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 20 }}>
          <DetailField label="Customer Type" value={CUSTOMER_TYPE_LABELS[f.customerType]} />
          <DetailField label="Assigned To" value={f.assignedTo} />
          <DetailField
            label="Next Follow-up"
            value={
              <span
                style={{
                  color: f.nextFollowUpDate < new Date() ? '#DC2626' : 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                {format(f.nextFollowUpDate, 'dd MMM yyyy')}
              </span>
            }
          />
          <DetailField
            label="Last Contacted"
            value={f.lastContactedAt ? format(f.lastContactedAt, 'dd MMM yyyy') : '—'}
          />
          {(f.estimatedBudget || f.quotationValue) && (
            <DetailField
              label="Value"
              value={
                <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {formatINR(f.quotationValue ?? f.estimatedBudget!, true)}
                </span>
              }
            />
          )}
          {f.projectName && <DetailField label="Project" value={f.projectName} />}
        </div>

        {/* ── Brands ── */}
        <DetailField
          label="Brands Interested"
          value={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {f.brandsInterested.map((b) => (
                <span
                  key={b}
                  style={{
                    padding: '2px 8px', borderRadius: 5,
                    background: 'var(--surface-tint)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          }
        />

        {f.productsNoted && (
          <DetailField label="Products Noted" value={<span style={{ fontSize: 13 }}>{f.productsNoted}</span>} />
        )}

        {/* ── Linked quotation card ── */}
        {linkedQuotation && (
          <div
            style={{
              marginBottom: 20, padding: 14, borderRadius: 10,
              background: 'rgba(0,113,227,0.04)',
              border: '1px solid rgba(0,113,227,0.15)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Linked Quotation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                  {linkedQuotation.number}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {format(linkedQuotation.createdAt, 'dd MMM yyyy')} · {linkedQuotation.status}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatINR(f.quotationValue ?? 0, true)}
                </div>
              </div>
            </div>
            <a
              href="/pos"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
              }}
            >
              View Quotation <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* ── Response timeline ── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}
          >
            Activity ({f.responses.length})
          </div>

          {f.responses.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No responses logged yet.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {f.responses.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex', gap: 10, paddingBottom: i < f.responses.length - 1 ? 12 : 0,
                  borderBottom: i < f.responses.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--surface-tint)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-tertiary)', flexShrink: 0,
                  }}
                >
                  {METHOD_ICON[r.method]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {RESPONSE_METHOD_LABELS[r.method]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {format(r.date, 'dd MMM yyyy')}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {r.staffMember.split(' ')[0]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.4 }}>
                    {r.outcome}
                  </div>
                  {r.nextAction && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      Next: {r.nextAction}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Log response form ── */}
        {!isClosed && canEdit && (
          <div
            style={{
              padding: 16, borderRadius: 10,
              background: 'var(--surface-tint)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
              }}
            >
              Log Response
            </div>

            {/* Method tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {(['call', 'whatsapp', 'email', 'visit'] as ResponseMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, height: 28,
                    padding: '0 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${method === m ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: method === m ? 'var(--accent-light)' : 'white',
                    color: method === m ? 'var(--accent)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  {METHOD_ICON[m]}
                  {RESPONSE_METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            <textarea
              placeholder="What did the customer say?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              style={{
                width: '100%', fontSize: 13, padding: 10, borderRadius: 8,
                border: '1px solid var(--border-default)', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', marginBottom: 8,
                fontFamily: 'var(--font-ui)',
              }}
            />
            <textarea
              placeholder="Next action (optional)"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              rows={1}
              style={{
                width: '100%', fontSize: 13, padding: 10, borderRadius: 8,
                border: '1px solid var(--border-default)', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', marginBottom: 8,
                fontFamily: 'var(--font-ui)',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Next follow-up:
                </label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  style={{
                    height: 28, padding: '0 8px', borderRadius: 6, fontSize: 12,
                    border: '1px solid var(--border-default)', outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleLogResponse}
                disabled={submitting}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 8,
                  background: 'var(--accent)', color: 'white',
                  fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                Log Response
              </button>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        {!isClosed && canEdit && (
          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setConfirmWon(true)}
              style={{
                flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'rgba(26,127,55,0.08)', color: '#1A7F37',
                border: '1px solid rgba(26,127,55,0.25)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <CheckCircle2 size={14} /> Mark as Won
            </button>
            <button
              onClick={() => setConfirmLost(true)}
              style={{
                flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'rgba(207,34,46,0.06)', color: '#CF222E',
                border: '1px solid rgba(207,34,46,0.2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <XCircle size={14} /> Mark as Lost
            </button>
          </div>
        )}
      </SlideOver>

      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={confirmWon}
        title="Mark as Won?"
        body={
          f.quotationId
            ? `This will mark the follow-up as Won and set quotation ${f.quotationNumber} to Accepted.`
            : 'This will mark the follow-up as Won. This cannot be undone.'
        }
        confirmLabel="Mark Won"
        confirmColor="#1A7F37"
        onConfirm={handleMarkWon}
        onCancel={() => setConfirmWon(false)}
      />
      <ConfirmDialog
        open={confirmLost}
        title="Mark as Lost?"
        body={
          f.quotationId
            ? `This will mark the follow-up as Lost and decline quotation ${f.quotationNumber}.`
            : 'This will mark the follow-up as Lost. This cannot be undone.'
        }
        confirmLabel="Mark Lost"
        confirmColor="#CF222E"
        onConfirm={handleMarkLost}
        onCancel={() => setConfirmLost(false)}
      />
    </>
  )
}
