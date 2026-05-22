'use client'

import * as React from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Search, UserPlus, Phone, MessageCircle, Mail, MapPin, Users, FileText, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { CRMNav } from '../shared/crm-nav'
import { Badge } from '@/components/shared/badge'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { ApiContact, ContactsListResponse } from '@/app/api/crm/contacts/route'
import type { ContactDetailResponse, ContactActivity, ContactFollowUp } from '@/app/api/crm/contacts/[id]/route'

// ── Fetcher ────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Config ────────────────────────────────────────────────────────────────────

type ApiContactType = 'ARCHITECT' | 'INTERIOR_DESIGNER' | 'BUILDER' | 'CONTRACTOR' | 'RETAIL' | 'INSTITUTIONAL'

const CONTACT_TYPE_CONFIG: Record<ApiContactType, { label: string }> = {
  ARCHITECT:         { label: 'Architect' },
  INTERIOR_DESIGNER: { label: 'Interior Designer' },
  BUILDER:           { label: 'Builder' },
  CONTRACTOR:        { label: 'Contractor' },
  RETAIL:            { label: 'Retail' },
  INSTITUTIONAL:     { label: 'Institutional' },
}

const ACTIVITY_ICON_MAP: Record<string, React.ElementType> = {
  CALL:          Phone,
  WHATSAPP:      MessageCircle,
  EMAIL:         Mail,
  MEETING:       Users,
  SITE_VISIT:    MapPin,
  SHOWROOM_VISIT: MapPin,
  NOTE:          FileText,
  QUOTE_CREATED: FileText,
  QUOTE_SENT:    FileText,
  QUOTE_APPROVED: FileText,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  contact,
  followUps,
}: {
  contact: ApiContact
  followUps: ContactFollowUp[]
}) {
  const typeConfig = CONTACT_TYPE_CONFIG[contact.type as ApiContactType]

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Follow-ups', value: followUps.length },
          { label: 'Tags', value: contact.tags.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface-ground)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div
        style={{
          background: 'var(--surface-ground)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
        }}
      >
        {contact.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Mail size={13} color="var(--text-tertiary)" />
            <a href={`mailto:${contact.email}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Phone size={13} color="var(--text-tertiary)" />
            <a href={`tel:${contact.phone}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {contact.phone}
            </a>
          </div>
        )}
        {contact.whatsapp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageCircle size={13} color="var(--text-tertiary)" />
            <a
              href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}
            >
              {contact.whatsapp}
            </a>
          </div>
        )}
        {(contact.area || contact.city) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={13} color="var(--text-tertiary)" />
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {[contact.area, contact.city].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Last active */}
      {contact.lastActivityAt && (
        <div style={{ marginBottom: 16 }}>
          <div suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            <span style={{ fontWeight: 600 }}>Last active:</span>{' '}
            {formatDistanceToNow(new Date(contact.lastActivityAt), { addSuffix: true })}
          </div>
        </div>
      )}

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            Tags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {contact.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: 'var(--surface-ground)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Owner */}
      {contact.owner && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            Owner
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--n-150)',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getInitials(contact.owner.name)}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              {contact.owner.name}
            </span>
          </div>
        </div>
      )}

      {/* Type */}
      {typeConfig && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            Type
          </div>
          <Badge label={typeConfig.label} />
        </div>
      )}
    </div>
  )
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab({ activities }: { activities: ContactActivity[] }) {
  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        No activities yet
      </div>
    )
  }

  return (
    <div>
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICON_MAP[activity.type] ?? FileText
        return (
          <div
            key={activity.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              paddingBottom: 16,
              marginBottom: 16,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--n-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={14} color="var(--text-muted)" strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                {activity.type.replace(/_/g, ' ')}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: '17px',
                  marginBottom: 6,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {activity.description}
              </div>
              <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Follow-ups Tab ────────────────────────────────────────────────────────────

function FollowUpsTab({ followUps }: { followUps: ContactFollowUp[] }) {
  if (followUps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        No follow-ups yet
      </div>
    )
  }

  return (
    <div>
      {followUps.map((f) => (
        <div
          key={f.id}
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 10,
            background: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {f.projectName ?? f.type}
            </div>
            <Badge label={f.status} />
          </div>
          {f.estimatedBudget != null && (
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 4,
              }}
            >
              {formatINR(f.estimatedBudget)}
            </div>
          )}
          <div suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Next follow-up:{' '}
            {formatDistanceToNow(new Date(f.nextFollowUpDate), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function NotesTab({ notes }: { notes: string | null }) {
  if (!notes) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: 14, padding: '20px 0' }}>
        No notes added yet.
      </div>
    )
  }
  return (
    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', whiteSpace: 'pre-wrap' }}>
      {notes}
    </div>
  )
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────

const CONTACT_TYPES: ApiContactType[] = [
  'ARCHITECT', 'INTERIOR_DESIGNER', 'BUILDER', 'CONTRACTOR', 'RETAIL', 'INSTITUTIONAL',
]

function AddContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '',
    type: 'ARCHITECT' as ApiContactType,
    phone: '',
    email: '',
    whatsapp: '',
    title: '',
    city: '',
    area: '',
    notes: '',
  })

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          title: form.title.trim(),
          city: form.city.trim() || undefined,
          area: form.area.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create contact')
      toast.success('Contact created')
      onCreated()
      onClose()
    } catch {
      toast.error('Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--text-primary)',
    background: 'white',
    outline: 'none',
    fontFamily: 'var(--font-ui)',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: '24px 28px',
          width: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Add Contact</div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="Ar. Vikram Mehta" required />
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>Type *</label>
              <select
                style={{ ...inputStyle, appearance: 'none' }}
                value={form.type}
                onChange={(e) => field('type', e.target.value as ApiContactType)}
              >
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>{CONTACT_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone *</label>
              <input style={inputStyle} value={form.phone} onChange={(e) => field('phone', e.target.value)} placeholder="+91 98200 44512" required />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => field('email', e.target.value)} placeholder="name@example.com" />
            </div>

            {/* WhatsApp */}
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input style={inputStyle} value={form.whatsapp} onChange={(e) => field('whatsapp', e.target.value)} placeholder="+91 98200 44512" />
            </div>

            {/* Title/Designation */}
            <div>
              <label style={labelStyle}>Designation</label>
              <input style={inputStyle} value={form.title} onChange={(e) => field('title', e.target.value)} placeholder="Principal Architect" />
            </div>

            {/* City + Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={form.city} onChange={(e) => field('city', e.target.value)} placeholder="Mumbai" />
              </div>
              <div>
                <label style={labelStyle}>Area</label>
                <input style={inputStyle} value={form.area} onChange={(e) => field('area', e.target.value)} placeholder="Bandra West" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                value={form.notes}
                onChange={(e) => field('notes', e.target.value)}
                placeholder="Any notes about this contact..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: '1px solid var(--border-default)',
                background: 'white',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Client ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'timeline' | 'followups' | 'notes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'timeline',  label: 'Timeline' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'notes',     label: 'Notes' },
]

const CONTACTS_KEY = '/api/crm/contacts?limit=50'

export function ContactsClient() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<TabId>('overview')
  const [addOpen, setAddOpen] = React.useState(false)

  React.useEffect(() => { setActiveTab('overview') }, [selectedId])

  const apiUrl = `/api/crm/contacts?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`

  const { data: listData, isLoading } = useSWR<ContactsListResponse>(apiUrl, fetcher)
  const { data: detailData } = useSWR<ContactDetailResponse>(
    selectedId ? `/api/crm/contacts/${selectedId}` : null,
    fetcher,
  )

  const contacts = listData?.contacts ?? []
  const total = listData?.total ?? 0
  const selectedContact = detailData?.contact ?? contacts.find((c) => c.id === selectedId) ?? null
  const activities = detailData?.activities ?? []
  const followUps = detailData?.followUps ?? []

  function handleCreated() {
    void globalMutate(apiUrl)
  }

  const actions = (
    <Button size="sm" onClick={() => setAddOpen(true)}>
      <UserPlus size={14} className="mr-1.5" />
      Add Contact
    </Button>
  )

  return (
    <PageContainer title="CRM" subtitle={`${total} contacts`} actions={actions}>
      <CRMNav />

      {addOpen && (
        <AddContactModal
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      )}

      <div
        style={{
          display: 'flex',
          gap: 0,
          height: 'calc(100vh - 200px)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* ── Left Pane ────────────────────────────────────────────────── */}
        <div
          style={{
            width: 360,
            flexShrink: 0,
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface-ground)',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                padding: '0 10px',
                height: 32,
              }}
            >
              <Search size={12} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Contact list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {isLoading && (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                Loading…
              </div>
            )}

            {!isLoading && contacts.map((contact) => {
              const typeConfig = CONTACT_TYPE_CONFIG[contact.type as ApiContactType]
              const isSelected = selectedId === contact.id

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedId(contact.id)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-ground)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--n-150)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {getInitials(contact.name)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                          {contact.name}
                        </span>
                        {typeConfig && <Badge label={typeConfig.label} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {contact.title}
                        {contact.company ? ` · ${contact.company.name}` : ''}
                      </div>
                      {contact.lastActivityAt && (
                        <div suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                          {formatDistanceToNow(new Date(contact.lastActivityAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {!isLoading && contacts.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No contacts found
              </div>
            )}
          </div>
        </div>

        {/* ── Right Pane ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedContact ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 14,
              }}
            >
              Select a contact to view details
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--n-150)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      flexShrink: 0,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {getInitials(selectedContact.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                      {selectedContact.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {selectedContact.title}
                        {selectedContact.company ? ` · ${selectedContact.company.name}` : ''}
                      </span>
                      {CONTACT_TYPE_CONFIG[selectedContact.type as ApiContactType] && (
                        <Badge label={CONTACT_TYPE_CONFIG[selectedContact.type as ApiContactType].label} />
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedContact.phone && (
                      <a
                        href={`tel:${selectedContact.phone}`}
                        title="Call"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--border-default)',
                          background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-tertiary)', textDecoration: 'none',
                        }}
                      >
                        <Phone size={14} />
                      </a>
                    )}
                    {selectedContact.whatsapp && (
                      <a
                        href={`https://wa.me/${selectedContact.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--border-default)',
                          background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-tertiary)', textDecoration: 'none',
                        }}
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {selectedContact.email && (
                      <a
                        href={`mailto:${selectedContact.email}`}
                        title="Email"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--border-default)',
                          background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-tertiary)', textDecoration: 'none',
                        }}
                      >
                        <Mail size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab bar */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexShrink: 0,
                  paddingLeft: 24,
                }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      height: 40,
                      padding: '0 16px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      fontWeight: activeTab === tab.id ? 600 : 500,
                      color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 120ms',
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {activeTab === 'overview'  && <OverviewTab contact={selectedContact} followUps={followUps} />}
                {activeTab === 'timeline'  && <TimelineTab activities={activities} />}
                {activeTab === 'followups' && <FollowUpsTab followUps={followUps} />}
                {activeTab === 'notes'     && <NotesTab notes={selectedContact.notes} />}
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
