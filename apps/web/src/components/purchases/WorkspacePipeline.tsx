'use client'

import { BrandMark } from '@/components/purchases/BrandTabs'
import LineCard from '@/components/purchases/LineCard'
import {
  getBrandSectionKey,
  DISPLAY_STAGE_LABEL,
  type BrandTab,
  type DisplayStage,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const SECTION_ORDER = ['GROHE', 'HANSGROHE', 'VITRA', 'GEBERIT']

interface Props {
  lines: PurchaseTrackerLine[]
  allLines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  stageFilter: DisplayStage | null
  isLoading: boolean
  onMoved: (newCounts: HeaderCounts, lineId: string, fromStage: PurchaseStage, toStage: PurchaseStage, qty: number) => void
  onSelectLine: (lineId: string, tab?: 'move' | 'transfer' | 'history') => void
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-32 rounded-full bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="h-28 rounded-[20px] bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function WorkspacePipeline({
  lines,
  allLines,
  activeBrand,
  stageFilter,
  isLoading,
  onMoved,
  onSelectLine,
}: Props) {
  if (isLoading) return <LoadingSkeleton />

  const groups = lines.reduce<Record<string, PurchaseTrackerLine[]>>((acc, line) => {
    const key = getBrandSectionKey(line.product.brand)
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
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {stageFilter ? `No lines at ${DISPLAY_STAGE_LABEL[stageFilter]}` : 'No purchase lines match this filter'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {stageFilter ? 'Clear the stage filter or switch brand.' : 'Switch the brand tab or move stock into a live stage.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {stageFilter && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-2.5">
          <span className="text-sm font-medium text-[#1d4ed8]">
            Filtered: <strong>{DISPLAY_STAGE_LABEL[stageFilter]}</strong> — {lines.length} line{lines.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {sectionKeys.map((section) => {
        const sectionLines = (groups[section] ?? []).sort((a, b) =>
          a.product.name.localeCompare(b.product.name),
        )
        return (
          <section key={section} className="space-y-3">
            <div className="flex items-center gap-3">
              <BrandMark tab={section} size="md" />
              <div className="h-px flex-1 bg-[linear-gradient(90deg,var(--border-strong),transparent)]" />
              <span className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {sectionLines.length}
              </span>
            </div>
            <div className="space-y-3">
              {sectionLines.map((line) => (
                <LineCard
                  key={line.id}
                  line={line}
                  context="company"
                  activeBrand={activeBrand}
                  allLines={allLines}
                  onMoved={onMoved}
                  onSelect={() => onSelectLine(line.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
