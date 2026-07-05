'use client'

import { computeSLA, SLA_BG, SLA_COLORS, type SLALevel } from '@/lib/sla'
import type { PurchaseStage } from '@/lib/purchases-tracker'

interface SLABadgeProps {
  stage:         PurchaseStage
  stageEnteredAt: string | null | undefined
  createdAt?:    string | null
}

const LEVEL_LABEL: Record<SLALevel, string> = {
  ok:       '',
  warning:  'Aging',
  alert:    'Overdue',
  critical: 'Critical',
}

export function SLABadge({ stage, stageEnteredAt, createdAt }: SLABadgeProps) {
  const since = stageEnteredAt ?? createdAt
  const { days, level } = computeSLA(stage, since)

  if (level === 'ok' || days === 0) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: SLA_BG[level],
        color:      SLA_COLORS[level],
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: SLA_COLORS[level] }}
      />
      {LEVEL_LABEL[level]} · {days}d
    </span>
  )
}
