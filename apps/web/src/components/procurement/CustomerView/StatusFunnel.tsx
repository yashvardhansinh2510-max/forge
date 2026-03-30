'use client'

import type { BoxAllocationStatus } from '@/lib/mock/procurement-data'

type Step = { label: string; status: BoxAllocationStatus[] }

const STEPS: Step[] = [
  { label: 'Ordered',   status: ['ORDERED'] },
  { label: 'At Godown', status: ['AT_GODOWN'] },
  { label: 'In Box',    status: ['IN_BOX', 'DEL_PENDING'] },
  { label: 'Delivered', status: ['DELIVERED', 'GIVEN_OTHER'] },
]

interface Props {
  currentStatus: BoxAllocationStatus
  small?: boolean
}

function getStepIndex(status: BoxAllocationStatus): number {
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    if (step && (step.status as readonly string[]).includes(status)) return i
  }
  return 0
}

export function StatusFunnel({ currentStatus, small = false }: Props) {
  const activeIdx = getStepIndex(currentStatus)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: small ? 2 : 4 }}>
      {STEPS.map((step, i) => {
        const done    = i < activeIdx
        const active  = i === activeIdx
        const pending = i > activeIdx

        const color = done ? '#16a34a' : active ? '#2563eb' : '#d1d5db'
        const bg    = done ? '#dcfce7' : active ? '#dbeafe' : '#f3f4f6'

        return (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: small ? 2 : 4 }}>
            {/* Step dot */}
            <div
              title={step.label}
              style={{
                width:  small ? 8  : 10,
                height: small ? 8  : 10,
                borderRadius: '50%',
                background: bg,
                border: `1.5px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {done && !small && (
                <span style={{ fontSize: 6, color, lineHeight: 1 }}>✓</span>
              )}
              {active && !small && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, display: 'block' }} />
              )}
            </div>

            {/* Connector line (not after last step) */}
            {i < STEPS.length - 1 && (
              <div style={{
                width: small ? 12 : 18,
                height: 1.5,
                background: i < activeIdx ? '#16a34a' : '#e5e7eb',
              }} />
            )}
          </div>
        )
      })}

      {/* Label */}
      {!small && (
        <span style={{
          marginLeft: 6,
          fontSize: 10, fontFamily: 'var(--font-ui)',
          color: '#6b7280',
        }}>
          {STEPS[activeIdx] ? STEPS[activeIdx].label : ''}
        </span>
      )}
    </div>
  )
}
