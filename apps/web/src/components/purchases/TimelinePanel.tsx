'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, MessageSquare, MoveRight } from 'lucide-react'
import type { TimelineEvent, TimelineEventType } from '@/app/api/purchase-orders/lines/[lineId]/timeline/route'

const TYPE_ICON: Record<TimelineEventType, React.ElementType> = {
  stage_move:      MoveRight,
  transfer:        ArrowRightLeft,
  note:            MessageSquare,
  followup_change: MessageSquare,
  assignment:      MessageSquare,
  priority_change: MessageSquare,
}

const TYPE_COLOR: Record<TimelineEventType, string> = {
  stage_move:      '#6366F1',
  transfer:        '#3B82F6',
  note:            '#10B981',
  followup_change: '#F59E0B',
  assignment:      '#8B5CF6',
  priority_change: '#EF4444',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface TimelinePanelProps {
  lineId: string
}

export function TimelinePanel({ lineId }: TimelinePanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/purchase-orders/lines/${lineId}/timeline`)
      .then((r) => r.json())
      .then((d: { events?: TimelineEvent[] }) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [lineId])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--n-100)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--n-100)]" />
              <div className="h-3 w-48 animate-pulse rounded bg-[var(--n-100)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        No activity recorded yet.
      </div>
    )
  }

  return (
    <div className="relative space-y-0 p-4">
      {/* Vertical line */}
      <div
        className="absolute left-[27px] top-4 bottom-4 w-px"
        style={{ background: 'var(--border-subtle)' }}
      />

      {events.map((event, i) => {
        const Icon  = TYPE_ICON[event.type]
        const color = TYPE_COLOR[event.type]
        return (
          <div key={event.id} className="relative flex gap-3 pb-4">
            <div
              className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}
            >
              <Icon size={12} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {event.title}
                </p>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  by {event.userName}
                </span>
              </div>
              {event.body && (
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {event.body}
                </p>
              )}
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                {fmtTime(event.timestamp)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
