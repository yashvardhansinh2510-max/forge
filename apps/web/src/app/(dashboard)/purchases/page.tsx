'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import BrandTabs from '@/components/purchases/BrandTabs'
import CompanyView from '@/components/purchases/CompanyView'
import CustomerView from '@/components/purchases/CustomerView'
import DrillPanel from '@/components/purchases/DrillPanel'
import HeaderCards from '@/components/purchases/HeaderCards'
import {
  createEmptyBrandCounts,
  createEmptyHeaderCounts,
  getStageQuantity,
  type BrandTab,
  type HeaderCounts,
  type PurchaseLinesResponse,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

const fetcher = async (url: string): Promise<PurchaseLinesResponse> => {
  const response = await fetch(url)
  const data = await response.json() as PurchaseLinesResponse | { message?: string }

  if (!response.ok) {
    throw new Error('message' in data && data.message ? data.message : 'Failed to load purchases')
  }

  return data as PurchaseLinesResponse
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 rounded-full bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 rounded-[28px] bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
        ))}
      </div>
      <div className="h-[440px] rounded-[32px] bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
    </div>
  )
}

export default function PurchasesPage() {
  const [headerCounts, setHeaderCounts] = useState<HeaderCounts>(createEmptyHeaderCounts())
  const [activeBrand, setActiveBrand] = useState<BrandTab>('ALL')
  const [activePanel, setActivePanel] = useState<PurchaseStage | null>(null)
  const [view, setView] = useState<'company' | 'customer'>('company')

  const { data, error, mutate, isLoading } = useSWR(
    `/api/purchase-orders/lines?brand=${encodeURIComponent(activeBrand)}`,
    fetcher,
    { revalidateOnFocus: true },
  )

  useEffect(() => {
    if (data?.headerCounts) {
      setHeaderCounts(data.headerCounts)
    }
  }, [data])

  const lines = data?.lines ?? []
  const brandCounts = data?.brandCounts ?? createEmptyBrandCounts()
  const drillLines = activePanel
    ? lines.filter((line) => getStageQuantity(line, activePanel) > 0)
    : []

  const handleMoved = (newCounts: HeaderCounts) => {
    setHeaderCounts(newCounts)
    void mutate()
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 p-5 pb-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_44%,#f8fcfa_100%)] p-6 shadow-[0_24px_40px_rgba(15,23,42,0.05)] lg:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#dbeafe] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-[#cffafe] blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Forge operations
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                Purchase tracker, rebuilt around live stage movement
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Filter by brand, drill into any stage card, and move stock through the pipeline from one clean control surface.
                Header counts stay instant, rows revalidate in the background, and customer drill-downs stay aligned with the same live data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-3xl border border-[var(--border)] bg-white/90 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Lines in scope
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {brandCounts[activeBrand]}
                </p>
              </div>

              <div className="inline-flex rounded-full border border-[var(--border)] bg-white/90 p-1 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                {(['company', 'customer'] as const).map((mode) => {
                  const active = view === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setView(mode)}
                      className={[
                        'rounded-full px-4 py-2 text-sm font-semibold transition',
                        active
                          ? 'bg-[#111827] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      {mode === 'company' ? 'Company view' : 'Customer view'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[28px] border border-[#fecaca] bg-[#fef2f2] px-5 py-4 text-sm text-[#b91c1c]">
            {error.message}
          </div>
        ) : null}

        <BrandTabs
          activeBrand={activeBrand}
          brandCounts={brandCounts}
          onSelect={setActiveBrand}
        />

        {isLoading && !data ? (
          <LoadingState />
        ) : (
          <>
            <HeaderCards
              headerCounts={headerCounts}
              activePanel={activePanel}
              onToggle={(stage) => setActivePanel((current) => current === stage ? null : stage)}
            />

            <DrillPanel
              stage={activePanel}
              lines={drillLines}
              total={activePanel ? headerCounts[activePanel] : 0}
              activeBrand={activeBrand}
              onClose={() => setActivePanel(null)}
              onMoved={handleMoved}
            />

            {view === 'company' ? (
              <CompanyView
                lines={lines}
                activeBrand={activeBrand}
                onMoved={handleMoved}
              />
            ) : (
              <CustomerView
                lines={lines}
                activeBrand={activeBrand}
                onMoved={handleMoved}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
