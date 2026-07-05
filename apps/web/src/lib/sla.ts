// SLA thresholds (days) per stage before an order is flagged as delayed.
// Measured from stageEnteredAt if available, else from line createdAt.

import type { PurchaseStage } from '@/lib/purchases-tracker'

export const SLA_DAYS: Record<PurchaseStage, number> = {
  ORDER_IN_CO: 7,
  CO_BILLING:  5,
  INBOX:       7,
  DISPATCHED:  3,
  COMPLETED:   30,
}

export type SLALevel = 'ok' | 'warning' | 'alert' | 'critical'

export interface SLAStatus {
  days:    number
  level:   SLALevel
  overdue: boolean
}

const DAY_MS = 86_400_000

export function computeSLA(
  stage: PurchaseStage,
  since: string | null | undefined,
): SLAStatus {
  if (!since) return { days: 0, level: 'ok', overdue: false }

  const days = Math.floor((Date.now() - new Date(since).getTime()) / DAY_MS)
  const threshold = SLA_DAYS[stage]
  const overdue = days >= threshold

  let level: SLALevel = 'ok'
  if (days >= threshold * 2)    level = 'critical'
  else if (days >= threshold)   level = 'alert'
  else if (days >= threshold * 0.7) level = 'warning'

  return { days, level, overdue }
}

export const SLA_COLORS: Record<SLALevel, string> = {
  ok:       '#10B981',
  warning:  '#F59E0B',
  alert:    '#EF4444',
  critical: '#7F1D1D',
}

export const SLA_BG: Record<SLALevel, string> = {
  ok:       '#ECFDF5',
  warning:  '#FFFBEB',
  alert:    '#FEF2F2',
  critical: '#FEE2E2',
}
