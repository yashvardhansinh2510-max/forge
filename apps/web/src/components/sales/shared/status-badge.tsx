import { Badge, type BadgeDot } from '@/components/shared/badge'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_DOT_MAP: Record<string, BadgeDot> = {
  draft:      'neutral',
  sent:       'accent',
  viewed:     'accent',
  accepted:   'positive',
  declined:   'negative',
  expired:    'neutral',
  confirmed:  'accent',
  processing: 'caution',
  dispatched: 'accent',
  delivered:  'positive',
  cancelled:  'negative',
  paid:       'positive',
  partial:    'caution',
  overdue:    'negative',
  void:       'neutral',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const dot: BadgeDot = STATUS_DOT_MAP[status] ?? 'neutral'
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <Badge label={label} dot={dot} />
}
