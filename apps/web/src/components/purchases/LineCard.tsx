'use client'

import Image from 'next/image'
import {
  STAGE_ORDER,
  STAGE_FRIENDLY_NAME,
  DISPATCH_READINESS_COLOR,
  DISPATCH_READINESS_LABEL,
  getDispatchReadiness,
  getLineUrgency,
  URGENCY_COLORS,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

interface LineCardProps {
  line: PurchaseTrackerLine
  context: 'company' | 'customer'
  activeBrand: BrandTab
  allLines: PurchaseTrackerLine[]
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelect: () => void
  onTransfer?: () => void
}

function ProductThumb({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div className="relative h-16 w-16 shrink-0">
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-xl border border-[var(--border)] object-contain p-0.5"
          unoptimized
        />
      </div>
    )
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--n-50)] text-xs font-bold text-[var(--text-muted)]">
      {line.product.brand.slice(0, 2)}
    </div>
  )
}

export default function LineCard({ line, context, activeBrand, allLines, onMoved, onSelect, onTransfer }: LineCardProps) {
  const urgency = getLineUrgency(line)
  const urgencyColor = URGENCY_COLORS[urgency]

  // Only show stages with non-zero quantities
  const activeStages = STAGE_ORDER.filter((s) => line.stages[s] > 0)

  const meta = context === 'company'
    ? [`${line.vendorName ?? 'Bulk'}`, line.customer?.name ?? 'No project']
    : [`PO ${line.poNumber}`, line.customer?.siteAddress ?? line.vendorName ?? '']

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-[20px] border border-[var(--border)] bg-white transition hover:border-[#93c5fd] hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
      style={urgency !== 'normal' ? { borderLeftColor: urgencyColor, borderLeftWidth: 3 } : undefined}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-center gap-4 p-4">
        <ProductThumb line={line} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {line.product.name}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                {meta.map((m) => m && <span key={m}>{m}</span>)}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {urgency !== 'normal' && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: urgencyColor }}
                >
                  {urgency === 'critical' ? 'Overdue' : urgency}
                </span>
              )}
              <span
                className="rounded-full border border-[var(--border)] bg-[var(--n-50)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {line.qtyOrdered} ordered
              </span>
            </div>
          </div>

          {/* Stage chips — only active (non-zero) stages, using friendly names */}
          {activeStages.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeStages.map((stage) => (
                <div
                  key={stage}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 bg-[var(--n-100)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {STAGE_FRIENDLY_NAME[stage] ?? stage}
                  </span>
                  <span
                    className="text-[11px] font-bold text-[var(--text-primary)]"
                    style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {line.stages[stage]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-muted)]">All units dispatched or transferred.</p>
          )}

          {/* Bottom row: readiness chip + Give to Customer action */}
          <div className="mt-3 flex items-center gap-2">
            {(() => {
              const readiness = getDispatchReadiness(line)
              if (readiness === 'dispatched' || readiness === 'archived') return null
              return (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: DISPATCH_READINESS_COLOR[readiness] }}
                >
                  {DISPATCH_READINESS_LABEL[readiness]}
                </span>
              )
            })()}

            {onTransfer && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTransfer() }}
                className="ml-auto rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[#93c5fd] hover:text-[var(--text-primary)]"
              >
                Redirect ↱
              </button>
            )}
          </div>
        </div>

        {/* Expand arrow */}
        <div className="shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100">
          →
        </div>
      </div>
    </article>
  )
}
