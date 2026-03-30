'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { PackageX, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { activityData, type ActivityItem } from '@/lib/mock/dashboard-data'

// ─── Activity Item ────────────────────────────────────────────────────────────

const slideInLeft = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const isSystem = item.type === 'low_stock' || item.type === 'production_complete'

  return (
    <motion.div
      variants={slideInLeft}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 16px 12px 14px',
        borderLeft: '2px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 80ms',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--n-50)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = ''
      }}
    >
      {/* Avatar */}
      {isSystem ? (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--n-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {item.type === 'low_stock' ? (
            <PackageX size={13} color="var(--text-muted)" />
          ) : (
            <CheckCircle size={13} color="var(--text-muted)" />
          )}
        </div>
      ) : (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--n-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
          }}
        >
          {item.user.initials}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: '20px' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.user.name}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.target}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {item.value && (
            <span
              style={{
                background: 'var(--n-100)',
                border: '1px solid var(--border)',
                padding: '0 7px',
                height: 18,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {item.value}
            </span>
          )}
          <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ActivityFeedSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="animate-pulse rounded bg-zinc-100" style={{ width: 120, height: 15 }} />
        <div className="animate-pulse rounded bg-zinc-100" style={{ width: 60, height: 12 }} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="animate-pulse rounded-full bg-zinc-100"
            style={{ width: 30, height: 30, flexShrink: 0 }}
          />
          <div className="flex-1">
            <div className="animate-pulse rounded bg-zinc-100" style={{ width: '70%', height: 13 }} />
            <div
              className="mt-1.5 animate-pulse rounded bg-zinc-100"
              style={{ width: '40%', height: 11 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  isLoading?: boolean
}

export function ActivityFeed({ isLoading = false }: ActivityFeedProps) {
  if (isLoading) return <ActivityFeedSkeleton />

  if (activityData.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-base)',
          borderRadius: 'var(--r-md)',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
          No activity yet. Start by adding a contact.
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow var(--t-base)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-raised)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-base)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}
      >
        <div className="flex items-center gap-2.5">
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Activity
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
            }}
          >
            Live
          </span>
        </div>
        <button
          style={{
            fontSize: 13,
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          View all →
        </button>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activityData.map((item, i) => (
          <ActivityRow key={item.id} item={item} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5"
        style={{
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Showing 8 of 142 activities
        </span>
      </div>
    </motion.div>
  )
}
