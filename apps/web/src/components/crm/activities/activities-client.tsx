'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Phone,
  Mail,
  Users,
  FileText,
  Plus,
  MessageCircle,
  MapPin,
  Home,
  Send,
  Package,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { CRMNav } from '../shared/crm-nav'
import { activities, contacts, type Activity, type ActivityType } from '@/lib/mock/crm-data'

// ─── Activity Type Config ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ActivityType,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  call:           { icon: Phone,          color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Call' },
  email:          { icon: Mail,           color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Email' },
  meeting:        { icon: Users,          color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Meeting' },
  note:           { icon: FileText,       color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Note' },
  whatsapp:       { icon: MessageCircle,  color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'WhatsApp' },
  site_visit:     { icon: MapPin,         color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Site Visit' },
  showroom_visit: { icon: Home,           color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Showroom Visit' },
  quote_sent:     { icon: Send,           color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Quote Sent' },
  sample_sent:    { icon: Package,        color: 'var(--text-muted)', bg: 'var(--n-100)', label: 'Sample Sent' },
}

// ─── Date Group Header ────────────────────────────────────────────────────────

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '8px 20px',
        background: 'var(--surface-ground)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {label}
    </div>
  )
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ activity, index }: { activity: Activity; index: number }) {
  const config = TYPE_CONFIG[activity.type]
  const Icon = config.icon
  const company = contacts.find((c) => c.id === activity.contactId)?.company ?? null

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 80ms',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-ground)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = ''
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: config.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon size={15} color={config.color} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {config.label}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>with</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {activity.contactName}
          </span>
          {company && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>· {company}</span>
          )}
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: '18px',
            marginBottom: 8,
          }}
        >
          {activity.body}
        </div>

        <div className="flex items-center gap-3">
          {activity.duration && (
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {activity.duration} min
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            by {activity.createdBy}
          </span>
          <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Calls', value: 'call' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Email', value: 'email' },
  { label: 'Meetings', value: 'meeting' },
  { label: 'Site Visits', value: 'site_visit' },
  { label: 'Notes', value: 'note' },
]

// ─── Date Grouping ────────────────────────────────────────────────────────────

type DateGroup = 'TODAY' | 'YESTERDAY' | 'EARLIER'

function getDateGroup(date: Date): DateGroup {
  if (isToday(date)) return 'TODAY'
  if (isYesterday(date)) return 'YESTERDAY'
  return 'EARLIER'
}

// ─── Client ───────────────────────────────────────────────────────────────────

export function ActivitiesClient() {
  const [filter, setFilter] = React.useState<ActivityType | 'all'>('all')

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter)

  // Group activities
  const grouped: { group: DateGroup; items: Activity[] }[] = []
  const groupOrder: DateGroup[] = ['TODAY', 'YESTERDAY', 'EARLIER']

  const byGroup: Record<DateGroup, Activity[]> = {
    TODAY: [],
    YESTERDAY: [],
    EARLIER: [],
  }

  for (const activity of filtered) {
    byGroup[getDateGroup(activity.createdAt)].push(activity)
  }

  for (const group of groupOrder) {
    if (byGroup[group].length > 0) {
      grouped.push({ group, items: byGroup[group] })
    }
  }

  const actions = (
    <Button size="sm" onClick={() => toast.success('Log activity coming soon')}>
      <Plus size={14} className="mr-1.5" />
      Log Activity
    </Button>
  )

  // Running index for animation delay
  let rowIndex = 0

  return (
    <PageContainer
      title="CRM"
      subtitle={`${activities.length} activities logged`}
      actions={actions}
    >
      <CRMNav />

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 6,
              border: 'none',
              background: filter === f.value ? 'var(--accent)' : 'var(--n-100)',
              color: filter === f.value ? 'white' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: filter === f.value ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 120ms',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--border-default)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {grouped.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              fontSize: 14,
              color: 'var(--text-tertiary)',
            }}
          >
            No activities for this filter
          </div>
        ) : (
          grouped.map(({ group, items }) => (
            <React.Fragment key={group}>
              <DateGroupHeader label={group} />
              {items.map((activity) => {
                const idx = rowIndex++
                return <ActivityRow key={activity.id} activity={activity} index={idx} />
              })}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Floating action button */}
      <button
        onClick={() => toast.success('Log activity coming soon')}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 20px',
          borderRadius: 22,
          border: 'none',
          background: 'var(--accent)',
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          transition: 'all 120ms',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
        }}
      >
        <Plus size={16} />
        Log Activity
      </button>
    </PageContainer>
  )
}
