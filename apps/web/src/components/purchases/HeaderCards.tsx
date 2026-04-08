'use client'

import {
  STAGE_COLORS,
  STAGE_SHORT_LABEL,
  STAGE_ORDER,
  type HeaderCounts,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

interface HeaderCardsProps {
  headerCounts: HeaderCounts
  activePanel: PurchaseStage | null
  onToggle: (stage: PurchaseStage) => void
}

export default function HeaderCards({
  headerCounts,
  activePanel,
  onToggle,
}: HeaderCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {STAGE_ORDER.map((stage) => {
        const active = activePanel === stage
        const accent = STAGE_COLORS[stage]

        return (
          <button
            key={stage}
            type="button"
            onClick={() => onToggle(stage)}
            className={[
              'group relative overflow-hidden rounded-3xl border bg-white p-4 text-left transition',
              active
                ? 'shadow-[0_18px_32px_rgba(15,23,42,0.08)]'
                : 'hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.06)]',
            ].join(' ')}
            style={{
              borderColor: active ? `${accent}55` : 'var(--border)',
              borderLeftWidth: 5,
              borderLeftColor: accent,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px opacity-80"
              style={{
                background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)`,
              }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {STAGE_SHORT_LABEL[stage]}
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {headerCounts[stage]}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Click to {active ? 'close' : 'drill into'} this stage
            </p>
          </button>
        )
      })}
    </div>
  )
}
