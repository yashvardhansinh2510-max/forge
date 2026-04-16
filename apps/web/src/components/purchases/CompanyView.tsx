'use client'

import { BrandMark } from '@/components/purchases/BrandTabs'
import LineCard from '@/components/purchases/LineCard'
import {
  getBrandSectionKey,
  type BrandTab,
  type HeaderCounts,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const SECTION_ORDER = ['GROHE', 'HANSGROHE', 'VITRA', 'GEBERIT']

interface CompanyViewProps {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

export default function CompanyView({
  lines,
  activeBrand,
  onMoved,
}: CompanyViewProps) {
  const groups = lines.reduce<Record<string, PurchaseTrackerLine[]>>((acc, line) => {
    const key = getBrandSectionKey(line.product.brand)
    acc[key] ??= []
    acc[key].push(line)
    return acc
  }, {})

  const sectionKeys = Object.keys(groups).sort((left, right) => {
    const leftIndex = SECTION_ORDER.indexOf(left)
    const rightIndex = SECTION_ORDER.indexOf(right)

    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right)
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  })

  if (lines.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed border-[var(--border-strong)] bg-white px-6 py-14 text-center">
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          No purchase lines match this brand yet
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Switch the brand tab or move fresh inventory into one of the live stages.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sectionKeys.map((section) => {
        const sectionLines = groups[section] ?? []

        return (
          <section key={section} className="space-y-4">
            <div className="flex items-center gap-4">
              <BrandMark tab={section} size="lg" />
              <div className="h-px flex-1 bg-[linear-gradient(90deg,var(--border-strong),transparent)]" />
              <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {sectionLines.length} line{sectionLines.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-4">
              {sectionLines
                .slice()
                .sort((left, right) => left.product.name.localeCompare(right.product.name))
                .map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    context="company"
                    onMoved={onMoved}
                    brandScope={activeBrand}
                  />
                ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
