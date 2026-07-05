'use client'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const CONFIG: Record<Priority, { label: string; bg: string; color: string; dot: string }> = {
  LOW:    { label: 'Low',    bg: '#F0FDF4', color: '#15803D', dot: '#86EFAC' },
  MEDIUM: { label: 'Medium', bg: '#FFFBEB', color: '#92400E', dot: '#FCD34D' },
  HIGH:   { label: 'High',   bg: '#FEF2F2', color: '#991B1B', dot: '#FCA5A5' },
  URGENT: { label: 'Urgent', bg: '#450A0A', color: '#FEF2F2', dot: '#EF4444' },
}

interface PriorityBadgeProps {
  priority: string | null | undefined
  size?: 'xs' | 'sm'
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const key = (priority ?? 'MEDIUM') as Priority
  const cfg = CONFIG[key] ?? CONFIG.MEDIUM

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export function PriorityRowStyle(priority: string | null | undefined): React.CSSProperties {
  if (priority === 'URGENT') return { background: 'rgba(239,68,68,0.04)', borderLeft: '3px solid #EF4444' }
  if (priority === 'HIGH')   return { background: 'rgba(239,68,68,0.02)' }
  return {}
}
