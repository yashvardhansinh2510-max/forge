'use client'

import {
  BRAND_ACCENTS,
  BRAND_TABS,
  type BrandTab,
} from '@/lib/purchases-tracker'

type BrandMarkSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<BrandMarkSize, string> = {
  sm: 'h-8 min-w-8 px-2 text-xs',
  md: 'h-10 min-w-10 px-3 text-sm',
  lg: 'h-12 min-w-12 px-4 text-base',
}

export function BrandMark({
  tab,
  size = 'md',
}: {
  tab: BrandTab | string
  size?: BrandMarkSize
}) {
  if (tab === 'ALL') {
    return (
      <span className={`inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white font-semibold tracking-[0.18em] text-[var(--text-secondary)] ${SIZE_CLASSES[size]}`}>
        ALL
      </span>
    )
  }

  if (tab === 'HANSGROHE') {
    return (
      <span className={`inline-flex items-center justify-center gap-1 rounded-full border border-[#f3d4d8] bg-white font-semibold ${SIZE_CLASSES[size]}`}>
        <span style={{ color: BRAND_ACCENTS.HANSGROHE }}>H</span>
        <span className="text-[var(--text-placeholder)]">|</span>
        <span className="text-[var(--text-primary)]">A</span>
      </span>
    )
  }

  const label = tab === 'GEBERIT' ? 'GE' : tab === 'VITRA' ? 'V' : tab === 'KAJARIA' ? 'K' : 'G'
  const accent = (tab === 'GROHE' || tab === 'VITRA' || tab === 'KAJARIA' || tab === 'GEBERIT')
    ? BRAND_ACCENTS[tab as Exclude<typeof tab, 'ALL' | 'HANSGROHE'>]
    : 'var(--text-primary)'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border bg-white font-semibold ${SIZE_CLASSES[size]}`}
      style={{
        color: accent,
        borderColor: `${accent}22`,
      }}
    >
      {label}
    </span>
  )
}

interface BrandTabsProps {
  activeBrand: BrandTab
  brandCounts: Record<BrandTab, number>
  onSelect: (brand: BrandTab) => void
}

export default function BrandTabs({
  activeBrand,
  brandCounts,
  onSelect,
}: BrandTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {BRAND_TABS.map((tab) => {
        const active = tab === activeBrand
        const accent = tab === 'ALL' ? '#2563EB' : BRAND_ACCENTS[tab]

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            aria-pressed={active}
            className={[
              'group inline-flex items-center gap-2 rounded-full border px-2.5 py-2 transition',
              active
                ? 'bg-white shadow-[0_12px_24px_rgba(15,23,42,0.08)]'
                : 'bg-white/70 hover:bg-white',
            ].join(' ')}
            style={{
              borderColor: active ? `${accent}55` : 'var(--border)',
              boxShadow: active ? `0 0 0 1px ${accent}22` : undefined,
            }}
          >
            <BrandMark tab={tab} />
            <span
              className={[
                'rounded-full px-2 py-1 text-xs font-semibold',
                active ? 'text-white' : 'text-[var(--text-secondary)]',
              ].join(' ')}
              style={{
                background: active ? accent : 'var(--n-100)',
              }}
            >
              {brandCounts[tab] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
