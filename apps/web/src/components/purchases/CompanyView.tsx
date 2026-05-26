'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import TransferModal from '@/components/purchases/TransferModal'
import MoveStageModal from '@/components/purchases/MoveStageModal'
import MarkReceivedModal from '@/components/purchases/MarkReceivedModal'
import {
  BRAND_ACCENTS,
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const SECTION_ORDER = ['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'KAJARIA', 'GEBERIT']

function primaryStage(line: PurchaseTrackerLine): PurchaseStage | null {
  return STAGE_ORDER.find((s) => line.stages[s] > 0) ?? null
}

function StageBadge({ stage }: { stage: PurchaseStage }) {
  const color = STAGE_COLORS[stage]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${color}18`, color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {STAGE_LABEL[stage]}
    </span>
  )
}

interface RowProps {
  line:        PurchaseTrackerLine
  activeBrand: BrandTab
  allLines:    PurchaseTrackerLine[]
  onMoved:     (newCounts: HeaderCounts) => void
}

function LineRow({ line, activeBrand, allLines, onMoved }: RowProps) {
  const [markOpen,     setMarkOpen]     = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [moveOpen,     setMoveOpen]     = useState(false)

  const stage     = primaryStage(line)
  const received  = line.stages.AT_GODOWN + line.stages.IN_BOX + line.stages.DISPATCHED
  const canTransfer = line.stages.AT_GODOWN > 0 || line.stages.IN_BOX > 0
  const canMove     = stage !== null && stage !== 'DISPATCHED'

  const sourceCustomerId   = line.customer?.id   ?? ''
  const sourceCustomerName = line.customer?.name ?? ''

  return (
    <>
      <tr className="group border-t border-[var(--border)] transition hover:bg-[var(--n-50)]">
        <td className="py-3.5 pr-4 pl-5">
          <div className="flex items-center gap-3">
            {line.product.imageUrl ? (
              <img
                src={line.product.imageUrl}
                alt={line.product.name}
                className="h-9 w-9 shrink-0 rounded-xl border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--n-100)] text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
                {line.product.brand.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {line.product.name}
              </p>
              <p
                className="text-xs text-[var(--text-muted)]"
                style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
              >
                {line.product.sku}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3.5 pr-4 text-sm text-[var(--text-secondary)]">
          {line.customer?.name ?? <span className="text-[var(--text-muted)]">—</span>}
        </td>
        <td
          className="py-3.5 pr-4 text-sm tabular-nums text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {line.qtyOrdered}
        </td>
        <td
          className="py-3.5 pr-4 text-sm tabular-nums text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {received}
        </td>
        <td className="py-3.5 pr-4">
          {stage ? <StageBadge stage={stage} /> : null}
        </td>
        <td className="py-3.5 pr-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {canTransfer && line.customer && (
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                title="Transfer items to another customer"
                className="flex h-7 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <ArrowRightLeft size={12} />
                Transfer
              </button>
            )}
            {canMove && stage && (
              <button
                type="button"
                onClick={() => setMoveOpen(true)}
                className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
              >
                Move →
              </button>
            )}
            {line.stages.NEEDS_PO > 0 && (
              <button
                type="button"
                onClick={() => setMarkOpen(true)}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Mark Received
              </button>
            )}
          </div>
        </td>
      </tr>

      {markOpen && (
        <MarkReceivedModal
          line={line}
          open={markOpen}
          onClose={() => setMarkOpen(false)}
          onMoved={onMoved}
          brandScope={activeBrand}
        />
      )}

      {transferOpen && line.customer && (
        <TransferModal
          line={line}
          sourceCustomerId={sourceCustomerId}
          sourceCustomerName={sourceCustomerName}
          allLines={allLines}
          onClose={() => setTransferOpen(false)}
          onTransferred={(counts) => { setTransferOpen(false); onMoved(counts) }}
        />
      )}

      {moveOpen && stage && (
        <MoveStageModal
          line={line}
          currentStage={stage}
          availableQty={line.stages[stage]}
          onClose={() => setMoveOpen(false)}
          onMoved={(counts) => { setMoveOpen(false); onMoved(counts) }}
          brandScope={activeBrand}
        />
      )}
    </>
  )
}

interface CompanyViewProps {
  lines:       PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved:     (newCounts: HeaderCounts) => void
}

export default function CompanyView({ lines, activeBrand, onMoved }: CompanyViewProps) {
  const groups = lines.reduce<Record<string, PurchaseTrackerLine[]>>((acc, line) => {
    const key = line.product.brand
    acc[key] ??= []
    acc[key].push(line)
    return acc
  }, {})

  const sectionKeys = Object.keys(groups).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a)
    const bi = SECTION_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-[var(--text-primary)]">No lines for this brand</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Switch the brand filter or add purchase order lines.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sectionKeys.map((brand) => {
        const sectionLines = (groups[brand] ?? [])
          .slice()
          .sort((a, b) => a.product.name.localeCompare(b.product.name))

        const accentKey = brand as keyof typeof BRAND_ACCENTS
        const accent    = BRAND_ACCENTS[accentKey] ?? '#6B7280'

        return (
          <div
            key={brand}
            className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderLeft: `4px solid ${accent}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-bold tracking-[0.12em]"
                  style={{ color: accent }}
                >
                  {brand}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--n-50)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                  {sectionLines.length} line{sectionLines.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {sectionLines.reduce((s, l) => s + l.qtyOrdered, 0)} units total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-t border-[var(--border)] bg-[var(--n-50)]">
                    <th className="py-2.5 pr-4 pl-5 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Product
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Customer
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Ordered
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Received
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Status
                    </th>
                    <th className="py-2.5 pr-5 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sectionLines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      activeBrand={activeBrand}
                      allLines={lines}
                      onMoved={onMoved}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
