'use client'

import Image from 'next/image'
import MovePopover from '@/components/purchases/MovePopover'
import {
  STAGE_COLORS,
  STAGE_SHORT_LABEL,
  getOverflowStages,
  getVisibleMoveStages,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const BRAND_COLORS: Record<string, string> = {
  HANSGROHE: '#00529A',
  AXOR: '#1C1C1E',
}

function ProductThumbnail({ line }: { line: PurchaseTrackerLine }) {
  if (line.product.imageUrl) {
    return (
      <div className="relative h-20 w-20 flex-shrink-0">
        <Image
          src={line.product.imageUrl}
          alt={line.product.name}
          fill
          className="rounded-2xl border border-[var(--border)] object-contain p-1"
          unoptimized
        />
      </div>
    )
  }

  const color = BRAND_COLORS[line.product.brand] ?? '#6B7280'
  return (
    <div
      className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] text-sm font-bold tracking-wider"
      style={{ background: color + '15', color }}
    >
      {line.product.brand === 'AXOR' ? 'AX' : 'HG'}
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

interface LineCardProps {
  line: PurchaseTrackerLine
  context: 'company' | 'customer'
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  brandScope: BrandTab
}

export default function LineCard({
  line,
  context,
  onMoved,
  brandScope,
}: LineCardProps) {
  const moveStages = getVisibleMoveStages(line)
  const overflowStages = getOverflowStages(line)

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

  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex items-start gap-4 lg:min-w-0 lg:flex-1">
          <div className="flex flex-col items-center">
            <ProductThumbnail line={line} />
            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
              {line.product.sku}
            </div>
            {line.product.finishName && (
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5 text-center">
                {line.product.finishName}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {line.product.name}
                </h3>
                <p className="mt-1 font-mono text-sm text-[var(--text-muted)]">
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

          <p className="text-xs text-[var(--text-muted)]">
            One move control per active stage, capped at two for readability.
          </p>
        </div>
      </div>
    </article>
  )
}
