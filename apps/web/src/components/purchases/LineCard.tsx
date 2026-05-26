'use client'

import React from 'react'
import { toast } from 'sonner'
import MovePopover from '@/components/purchases/MovePopover'
import {
  STAGE_COLORS,
  STAGE_ORDER,
  STAGE_SHORT_LABEL,
  getOverflowStages,
  getVisibleMoveStages,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function ProductThumbnail({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <img
        src={line.product.imageUrl}
        alt={line.product.name}
        className="h-20 w-20 rounded-2xl border border-[var(--border)] object-cover"
      />
    )
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,#eff6ff,white_52%,#ecfeff)] text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
      {line.product.brand.slice(0, 2)}
    </div>
  )
}

function StageChip({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--n-50)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function PipelineDots({ stages }: { stages: HeaderCounts }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {STAGE_ORDER.map((stage) => {
        const qty = stages[stage] ?? 0
        const color = STAGE_COLORS[stage]
        return (
          <div key={stage} className="relative flex flex-col items-center" title={`${STAGE_SHORT_LABEL[stage]}: ${qty}`}>
            <div
              className="rounded-full transition-all"
              style={{
                width: qty > 0 ? 10 : 7,
                height: qty > 0 ? 10 : 7,
                backgroundColor: qty > 0 ? color : '#e5e7eb',
              }}
            />
            {qty > 0 && (
              <span
                className="mt-0.5 text-[9px] font-bold leading-none"
                style={{ color }}
              >
                {qty}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface LineCardProps {
  line: PurchaseTrackerLine
  context: 'company' | 'customer'
  onMoved: (newCounts: HeaderCounts) => void
  brandScope: BrandTab
}

export default function LineCard({
  line,
  context,
  onMoved,
  brandScope,
}: LineCardProps) {
  const [marking, setMarking] = React.useState(false)

  const moveStages = getVisibleMoveStages(line)
  const overflowStages = getOverflowStages(line)

  const daysSinceOrder = line.createdAt
    ? Math.floor((Date.now() - new Date(line.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const isStalled =
    (line.stages.NEEDS_PO > 0 || line.stages.ORDERED > 0) &&
    daysSinceOrder > 7

  const meta = context === 'company'
    ? [
        `Brand: ${line.product.brand}`,
        `Vendor: ${line.vendorName ?? 'Bulk company'}`,
        `Customer: ${line.customer?.name ?? 'No project linked'}`,
      ]
    : [
        `PO: ${line.poNumber}`,
        `Vendor: ${line.vendorName ?? 'Bulk company'}`,
        line.customer?.siteAddress ? `Site: ${line.customer.siteAddress}` : 'Customer-linked line item',
      ]

  async function handleMarkReceived() {
    setMarking(true)
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/mark-received`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qty: line.stages.NEEDS_PO, brand: brandScope }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
      if (!res.ok || !data.stageTotals) {
        toast.error(data.message ?? data.error ?? 'Failed to mark received')
        return
      }
      onMoved(data.stageTotals)
      toast.success(`${line.stages.NEEDS_PO} unit${line.stages.NEEDS_PO !== 1 ? 's' : ''} marked as received at godown`)
    } catch {
      toast.error('Network error')
    } finally {
      setMarking(false)
    }
  }

  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex items-start gap-4 lg:min-w-0 lg:flex-1">
          <ProductThumbnail line={line} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {line.product.name}
                  </h3>
                  {isStalled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      ⚠ Stalled {daysSinceOrder}d
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {line.product.sku}
                </p>
              </div>

              <span className="rounded-full border border-[var(--border)] bg-[var(--n-50)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {line.qtyOrdered} ordered
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {Object.entries(line.stages).map(([stage, value]) => (
                <StageChip
                  key={stage}
                  label={STAGE_SHORT_LABEL[stage as PurchaseStage]}
                  value={value}
                  color={STAGE_COLORS[stage as PurchaseStage]}
                />
              ))}
            </div>

            {context === 'customer' && (
              <PipelineDots stages={line.stages} />
            )}
          </div>
        </div>

        <div className="flex w-full flex-col justify-between gap-3 lg:w-56">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--n-50)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Live move controls
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {moveStages.map((stage) => (
                <MovePopover
                  key={stage}
                  lineItemId={line.id}
                  productId={line.product.id}
                  currentStage={stage}
                  availableQty={line.stages[stage]}
                  onMoved={onMoved}
                  brandScope={brandScope}
                />
              ))}
            </div>
            {overflowStages.length > 0 && (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Also in {overflowStages.map((stage) => `${STAGE_SHORT_LABEL[stage]} ${line.stages[stage]}`).join(' · ')}
              </p>
            )}
          </div>

          {line.stages.NEEDS_PO > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkReceived()}
              disabled={marking}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              {marking
                ? 'Marking…'
                : `Mark ${line.stages.NEEDS_PO} as Received`}
            </button>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            One move control per active stage, capped at two for readability.
          </p>
        </div>
      </div>
    </article>
  )
}
