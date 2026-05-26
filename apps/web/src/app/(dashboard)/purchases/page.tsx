'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useSWR from 'swr'
import BrandTabs from '@/components/purchases/BrandTabs'
import POCodeTable from '@/components/procurement/CompanyView/POCodeTable'
import BillingView from '@/components/procurement/BillingView/BillingView'
import CustomerView from '@/components/purchases/CustomerView'
import DispatchList from '@/components/purchases/DispatchList'
import HeaderCards from '@/components/purchases/HeaderCards'
import DrillPanel from '@/components/purchases/DrillPanel'
import {
  createEmptyBrandCounts,
  createEmptyHeaderCounts,
  getStageQuantity,
  type BrandTab,
  type HeaderCounts,
  type PurchaseLinesResponse,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

type View = 'company' | 'customer' | 'dispatch' | 'billing'

const VIEWS: { id: View; label: string; description: string }[] = [
  { id: 'company',  label: 'By Supplier',  description: "Outstanding per brand" },
  { id: 'customer', label: 'By Customer',  description: "What each customer needs" },
  { id: 'dispatch', label: 'Dispatch',     description: "Ready to go out today" },
  { id: 'billing',  label: 'Billing',      description: "Vendor billing summary" },
]

const fetcher = async (url: string): Promise<PurchaseLinesResponse> => {
  const response = await fetch(url)
  const data = await response.json() as PurchaseLinesResponse | { message?: string }
  if (!response.ok) {
    throw new Error('message' in data && data.message ? data.message : 'Failed to load purchases')
  }
  return data as PurchaseLinesResponse
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl bg-[var(--n-100)] ${className ?? ''}`}
    />
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-24" />
        ))}
      </div>
      <Shimmer className="h-[400px]" />
    </div>
  )
}

export default function PurchasesPage() {
  const [headerCounts, setHeaderCounts] = useState<HeaderCounts>(createEmptyHeaderCounts())
  const [activeBrand, setActiveBrand] = useState<BrandTab>('ALL')
  const [activePanel, setActivePanel] = useState<PurchaseStage | null>(null)
  const [view, setView] = useState<View>('company')

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

  const atGodownCount = headerCounts.AT_GODOWN + headerCounts.IN_BOX

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-5 pb-12">

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_50%,#f8fcf9_100%)] px-6 py-6 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#dbeafe] blur-3xl opacity-60" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[#cffafe] blur-3xl opacity-50" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Purchases
              </p>
              <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Purchase Tracker
              </h1>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                Track inventory from order through godown to dispatch.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {atGodownCount > 0 && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">
                    Ready to dispatch
                  </p>
                  <p
                    className="mt-0.5 text-xl font-semibold tabular-nums text-violet-700"
                    style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {atGodownCount}
                  </p>
                </div>
              )}

              {/* View switcher */}
              <div className="inline-flex rounded-full border border-[var(--border)] bg-white/90 p-1 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                {VIEWS.map(({ id, label }) => {
                  const active = view === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setView(id)}
                      className={[
                        'rounded-full px-4 py-2 text-sm font-semibold transition',
                        active
                          ? 'bg-[#111827] text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error.message}
          </div>
        ) : null}

        {isLoading && !data ? (
          <LoadingState />
        ) : (
          <>
            <BrandTabs
              activeBrand={activeBrand}
              brandCounts={brandCounts}
              onSelect={setActiveBrand}
            />

            <HeaderCards
              headerCounts={headerCounts}
              activePanel={activePanel}
              onToggle={(stage) => setActivePanel((cur) => cur === stage ? null : stage)}
            />

            <DrillPanel
              stage={activePanel}
              lines={drillLines}
              total={activePanel ? headerCounts[activePanel] : 0}
              activeBrand={activeBrand}
              onClose={() => setActivePanel(null)}
              onMoved={handleMoved}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {view === 'company' && (
                  <POCodeTable
                    lines={lines}
                    activeBrand={activeBrand}
                    onMoved={handleMoved}
                  />
                )}
                {view === 'customer' && (
                  <CustomerView
                    lines={lines}
                    activeBrand={activeBrand}
                    onMoved={handleMoved}
                  />
                )}
                {view === 'dispatch' && (
                  <DispatchList
                    lines={lines}
                    activeBrand={activeBrand}
                    onMoved={handleMoved}
                  />
                )}
                {view === 'billing' && (
                  <BillingView
                    lines={lines}
                    activeBrand={activeBrand}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
