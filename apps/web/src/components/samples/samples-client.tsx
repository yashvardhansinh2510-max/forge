'use client'

import * as React from 'react'
import { Package, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { Badge } from '@/components/shared/badge'
import { samples as initialSamples, SAMPLE_STATUS_CONFIG, type Sample, type SampleStatus } from '@/lib/mock/samples-data'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(sample: Sample): boolean {
  if (sample.status !== 'with_client' && sample.status !== 'sent') return false
  if (!sample.expectedReturn) return false
  return sample.expectedReturn < new Date()
}

// ─── Send Sample Modal ────────────────────────────────────────────────────────

interface SendSampleModalProps {
  onClose: () => void
}

function SendSampleModal({ onClose }: SendSampleModalProps) {
  const [form, setForm] = React.useState({
    productName: '',
    sentTo: '',
    sentDate: new Date().toISOString().slice(0, 10),
    expectedReturn: '',
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Sample recorded successfully')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-raised)',
          width: '100%',
          maxWidth: 480,
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Send Sample
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Product Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grohe Essence Basin Mixer"
              value={form.productName}
              onChange={(e) => setForm(f => ({ ...f, productName: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Sent To
            </label>
            <input
              type="text"
              required
              placeholder="Contact name or company"
              value={form.sentTo}
              onChange={(e) => setForm(f => ({ ...f, sentTo: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Sent Date
              </label>
              <input
                type="date"
                required
                value={form.sentDate}
                onChange={(e) => setForm(f => ({ ...f, sentDate: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Expected Return
              </label>
              <input
                type="date"
                value={form.expectedReturn}
                onChange={(e) => setForm(f => ({ ...f, expectedReturn: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Notes
            </label>
            <textarea
              placeholder="Project or context notes…"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              <Package size={14} className="mr-1.5" />
              Send Sample
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 34,
  padding: '0 10px',
  fontSize: 13,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

interface KPITileProps {
  label: string
  value: number | string
  valueColor?: string
}

function KPITile({ label, value, valueColor }: KPITileProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 'var(--r-md)',
        padding: '16px 20px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 6px', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, margin: 0, color: valueColor ?? 'var(--text-primary)', letterSpacing: '-0.04em', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SamplesClient() {
  const [samples, setSamples] = React.useState<Sample[]>(initialSamples)
  const [showModal, setShowModal] = React.useState(false)

  const today = new Date()

  const active = samples.filter(s => s.status === 'with_client' || s.status === 'sent')
  const overdue = samples.filter(s => isOverdue(s))
  const returned = samples.filter(s => s.status === 'returned')

  function handleMarkReturned(id: string) {
    setSamples(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'returned' as SampleStatus, returnedDate: new Date() } : s)
    )
    toast.success('Sample marked as returned')
  }

  const actions = (
    <Button size="sm" onClick={() => setShowModal(true)}>
      <Package size={14} className="mr-1.5" />
      Send Sample
    </Button>
  )

  return (
    <>
      <PageContainer
        title="Samples"
        subtitle={`${samples.length} samples tracked`}
        actions={actions}
      >
        {/* KPI Tiles */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPITile label="Total Samples" value={samples.length} />
          <KPITile label="With Client" value={active.length} />
          <KPITile
            label="Overdue"
            value={overdue.length}
            valueColor={overdue.length > 0 ? 'var(--negative)' : 'var(--text-primary)'}
          />
          <KPITile label="Returned" value={returned.length} />
        </div>

        {/* Table */}
        <div
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-base)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Product', 'Sent To', 'Sent Date', 'Expected Return', 'Status', 'Actions'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, idx) => {
                const overdueRow = isOverdue(sample)
                const cfg = SAMPLE_STATUS_CONFIG[sample.status]
                return (
                  <tr
                    key={sample.id}
                    style={{
                      borderBottom: idx < samples.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'transparent',
                    }}
                  >
                    {/* Product */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                        {sample.productName}
                      </p>
                      <p style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-tertiary)', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                        {sample.productSku}
                      </p>
                    </td>

                    {/* Sent To */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                        {sample.contactName}
                      </p>
                      {sample.contactCompany && (
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                          {sample.contactCompany}
                        </p>
                      )}
                    </td>

                    {/* Sent Date */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)' }}>
                        {formatDate(sample.sentDate)}
                      </span>
                    </td>

                    {/* Expected Return */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      {sample.expectedReturn ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--font-ui)',
                            color: overdueRow ? 'var(--negative)' : 'var(--text-muted)',
                            fontWeight: overdueRow ? 600 : 400,
                          }}
                        >
                          {formatDate(sample.expectedReturn)}
                          {overdueRow && (
                            <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--negative)' }}>overdue</span>
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <Badge label={cfg.label} dot={cfg.dot} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      {(sample.status === 'with_client' || sample.status === 'sent') && (
                        <button
                          onClick={() => handleMarkReturned(sample.id)}
                          style={{
                            height: 28,
                            padding: '0 10px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </PageContainer>

      {showModal && <SendSampleModal onClose={() => setShowModal(false)} />}
    </>
  )
}
