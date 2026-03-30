'use client'

import { formatDistanceToNow } from 'date-fns'
import { Phone, Mail, Building2, Tag, User } from 'lucide-react'
import { SlideOver, DetailField } from '../shared/slide-over'
import { DealStageBadge } from '../shared/status-badge'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { Contact } from '@/lib/mock/crm-data'

interface ContactSlideOverProps {
  contact: Contact | null
  onClose: () => void
}

export function ContactSlideOver({ contact, onClose }: ContactSlideOverProps) {
  if (!contact) return null

  return (
    <SlideOver
      open={!!contact}
      onClose={onClose}
      title={contact.name}
      subtitle={contact.company ?? undefined}
    >
      {/* Avatar + status */}
      <div className="mb-6 flex items-center gap-3">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--n-150)',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {contact.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {contact.name}
          </div>
          <DealStageBadge stage={contact.stage} size="md" />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 20 }} />

      {/* Contact info */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={14} color="var(--text-tertiary)" />
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{contact.email}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Phone size={14} color="var(--text-tertiary)" />
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{contact.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 size={14} color="var(--text-tertiary)" />
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{contact.company ?? '—'}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 20 }} />

      {/* Fields */}
      <DetailField label="Revenue" value={contact.totalRevenue > 0 ? formatINR(contact.totalRevenue) : '—'} />
      <DetailField
        label="Last Activity"
        value={<span suppressHydrationWarning>{formatDistanceToNow(contact.lastActivityAt, { addSuffix: true })}</span>}
      />
      <DetailField
        label="Owner"
        value={
          <div className="flex items-center gap-1.5">
            <User size={13} color="var(--text-tertiary)" />
            {contact.owner.name}
          </div>
        }
      />

      {contact.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            <Tag size={10} style={{ display: 'inline', marginRight: 4 }} />
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
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
    </SlideOver>
  )
}
