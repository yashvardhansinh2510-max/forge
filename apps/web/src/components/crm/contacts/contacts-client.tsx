'use client'

import * as React from 'react'
import { Search, UserPlus, Phone, MessageCircle, Mail, MapPin, Users, FileText, Send, Package, Store } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { CRMNav } from '../shared/crm-nav'
import { DealStageBadge } from '../shared/status-badge'
import { Badge } from '@/components/shared/badge'
import { formatINR } from '@/lib/mock/dashboard-data'
import {
  contacts,
  deals,
  activities,
  CONTACT_TYPE_CONFIG,
  type Contact,
  type Activity,
  type Deal,
} from '@/lib/mock/crm-data'
import type { ActivityType } from '@/lib/mock/crm-data'

// Activity icon mapping
const ACTIVITY_ICON_MAP: Record<ActivityType, React.ElementType> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  site_visit: MapPin,
  showroom_visit: Store,
  meeting: Users,
  note: FileText,
  quote_sent: Send,
  sample_sent: Package,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type TabId = 'overview' | 'timeline' | 'deals' | 'notes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'deals', label: 'Deals' },
  { id: 'notes', label: 'Notes' },
]

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ contact }: { contact: Contact }) {
  const typeConfig = CONTACT_TYPE_CONFIG[contact.type]

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Deals', value: contact.totalDeals },
          { label: 'Won Deals', value: contact.wonDeals },
          { label: 'Revenue', value: contact.totalRevenue > 0 ? formatINR(contact.totalRevenue) : '—' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Mail size={13} color="var(--text-tertiary)" />
          <a href={`mailto:${contact.email}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{contact.email}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Phone size={13} color="var(--text-tertiary)" />
          <a href={`tel:${contact.phone}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}>{contact.phone}</a>
        </div>
        {contact.whatsapp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageCircle size={13} color="var(--text-tertiary)" />
            <a href={`tel:${contact.whatsapp}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontVariantNumeric: 'tabular-nums' }}>{contact.whatsapp}</a>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={13} color="var(--text-tertiary)" />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {contact.area}, {contact.city}
          </span>
        </div>
      </div>

      {/* Source + last active */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>Source:</span> {contact.source}
        </div>
        <div suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          <span style={{ fontWeight: 600 }}>Last active:</span>{' '}
          {formatDistanceToNow(contact.lastActivityAt, { addSuffix: true })}
        </div>
      </div>

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
            {contact.owner.initials}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
            {contact.owner.name}
          </span>
        </div>
      </div>

      {/* Contact type */}
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
    </div>
  )
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ contactId }: { contactId: string }) {
  const contactActivities = activities.filter((a) => a.contactId === contactId)

  if (contactActivities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        No activities yet
      </div>
    )
  }

  return (
    <div>
      {contactActivities.map((activity: Activity) => {
        const Icon = ACTIVITY_ICON_MAP[activity.type]
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
                {activity.subject}
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
                {activity.body}
              </div>
              <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Deals Tab ────────────────────────────────────────────────────────────────

function DealsTab({ contactId }: { contactId: string }) {
  const contactDeals = deals.filter((d) => d.contactId === contactId)

  if (contactDeals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        No deals yet
      </div>
    )
  }

  return (
    <div>
      {contactDeals.map((deal: Deal) => (
        <div
          key={deal.id}
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 10,
            background: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, marginRight: 8 }}>
              {deal.title}
            </div>
            <DealStageBadge stage={deal.stage} size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatINR(deal.value)}
            </span>
            <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Closes {formatDistanceToNow(deal.closeDate, { addSuffix: true })}
            </span>
          </div>
          {deal.brands.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {deal.brands.slice(0, 3).map((brand) => (
                <span
                  key={brand}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'var(--surface-ground)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {brand}
                </span>
              ))}
              {deal.brands.length > 3 && (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: '2px 4px' }}>
                  +{deal.brands.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ contact }: { contact: Contact }) {
  if (!contact.notes) {
    return (
      <div
        style={{
          color: 'var(--text-tertiary)',
          fontStyle: 'italic',
          fontSize: 14,
          padding: '20px 0',
        }}
      >
        No notes added yet.
      </div>
    )
  }
  return (
    <div
      style={{
        fontSize: 14,
        color: 'var(--text-secondary)',
        lineHeight: '22px',
        whiteSpace: 'pre-wrap',
      }}
    >
      {contact.notes}
    </div>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function ContactsClient() {
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null)
  const [search, setSearch] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<TabId>('overview')

  React.useEffect(() => {
    setActiveTab('overview')
  }, [selectedContact])

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  const actions = (
    <Button size="sm" onClick={() => toast.success('Add contact coming soon')}>
      <UserPlus size={14} className="mr-1.5" />
      Add Contact
    </Button>
  )

  return (
    <PageContainer title="CRM" subtitle={`${contacts.length} contacts`} actions={actions}>
      <CRMNav />

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
        {/* ── Left Pane ─────────────────────────────────────────────────── */}
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
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
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
            {filtered.map((contact) => {
              const typeConfig = CONTACT_TYPE_CONFIG[contact.type]
              const isSelected = selectedContact?.id === contact.id

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-ground)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }
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
                        <Badge label={typeConfig.label} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {contact.title}
                        {contact.company ? ` · ${contact.company}` : ''}
                      </div>
                      <div suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right' }}>
                        {formatDistanceToNow(contact.lastActivityAt, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                }}
              >
                No contacts found
              </div>
            )}
          </div>
        </div>

        {/* ── Right Pane ────────────────────────────────────────────────── */}
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
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Avatar */}
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

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                      {selectedContact.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {selectedContact.title}
                        {selectedContact.company ? ` · ${selectedContact.company}` : ''}
                      </span>
                      <Badge label={CONTACT_TYPE_CONFIG[selectedContact.type].label} />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {[
                      { Icon: Phone, label: 'Call' },
                      { Icon: MessageCircle, label: 'WhatsApp' },
                      { Icon: Mail, label: 'Email' },
                    ].map(({ Icon, label }) => (
                      <button
                        key={label}
                        onClick={() => toast.success(`${label} coming soon`)}
                        title={label}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid var(--border-default)',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-ground)'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'white'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'
                        }}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
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
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 24px',
                }}
              >
                {activeTab === 'overview' && <OverviewTab contact={selectedContact} />}
                {activeTab === 'timeline' && <TimelineTab contactId={selectedContact.id} />}
                {activeTab === 'deals' && <DealsTab contactId={selectedContact.id} />}
                {activeTab === 'notes' && <NotesTab contact={selectedContact} />}
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
