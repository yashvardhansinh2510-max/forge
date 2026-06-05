'use client'

import { getLineUrgency, type PurchaseTrackerLine } from '@/lib/purchases-tracker'

const TRACKER_STAGES = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED'] as const
type TrackerStage = typeof TRACKER_STAGES[number]

const TRACKER_LABEL: Record<TrackerStage, string> = {
  PENDING_CO:   'Ordered',
  PENDING_DIST: 'Dist.',
  GODOWN:       'Godown',
  IN_BOX:       'Packed',
  DISPATCHED:   'Done',
}

function stageQty(line: PurchaseTrackerLine, stage: TrackerStage): number {
  if (stage === 'DISPATCHED') return line.stages.DISPATCHED + line.stages.NOT_DISPLAYED
  // PENDING_CO, PENDING_DIST, GODOWN, IN_BOX all exist directly on stages
  return line.stages[stage as keyof typeof line.stages] as number ?? 0
}

function stageColor(stage: TrackerStage, qty: number, line: PurchaseTrackerLine): string {
  if (qty === 0) return '#e5e7eb'                  // grey — nothing here
  if (stage === 'DISPATCHED') return '#10b981'     // green — done
  if (stage === 'IN_BOX') return '#10b981'         // green — packed/ready
  const urgency = getLineUrgency(line)
  if (urgency === 'critical') return '#ef4444'     // red — overdue
  if (urgency === 'warning')  return '#f59e0b'     // amber — late
  return '#2563eb'                                 // blue — active/normal
}

function glowColor(color: string): string | undefined {
  const map: Record<string, string> = {
    '#10b981': '#bbf7d0',
    '#ef4444': '#fecaca',
    '#f59e0b': '#fde68a',
    '#2563eb': '#bfdbfe',
  }
  return map[color]
}

interface Props {
  line: PurchaseTrackerLine
}

export default function StageTracker({ line }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Dot + connector line row */}
      <div className="flex items-center">
        {TRACKER_STAGES.map((stage, i) => {
          const qty   = stageQty(line, stage)
          const color = stageColor(stage, qty, line)
          const glow  = qty > 0 ? glowColor(color) : undefined
          const isLast = i === TRACKER_STAGES.length - 1
          return (
            <div key={stage} className="flex items-center" style={{ flex: isLast ? '0 0 auto' : 1 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: glow ? `0 0 0 3px ${glow}` : undefined,
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              />
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: qty > 0 ? color : '#e5e7eb',
                    minWidth: 8,
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Label + count row */}
      <div className="flex items-start">
        {TRACKER_STAGES.map((stage, i) => {
          const qty   = stageQty(line, stage)
          const color = stageColor(stage, qty, line)
          const isLast = i === TRACKER_STAGES.length - 1
          return (
            <div
              key={stage}
              style={{
                flex: isLast ? '0 0 auto' : 1,
                minWidth: isLast ? undefined : 0,
                paddingRight: isLast ? 0 : 4,
              }}
            >
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: qty > 0 ? color : '#9ca3af',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {TRACKER_LABEL[stage]}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: qty > 0 ? color : '#d1d5db',
              }}>
                {qty}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
