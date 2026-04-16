'use client'

import useSWR from 'swr'
import { FollowUpView } from '@/components/purchases/FollowUpView'
import type { PurchaseTrackerLine, PurchaseLinesResponse } from '@/lib/purchases-tracker'

const fetcher = async (url: string): Promise<PurchaseTrackerLine[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load dispatched items')
  const data = await res.json() as PurchaseLinesResponse
  // Filter client-side to lines that have qty > 0 in DISPATCHED
  return (data.lines ?? []).filter((l) => l.stages.DISPATCHED > 0)
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="h-40 rounded-[20px] bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
      ))}
    </div>
  )
}

export default function FollowUpPage() {
  const { data: lines, error, isLoading, mutate } = useSWR(
    '/api/purchase-orders/lines',
    fetcher,
    { revalidateOnFocus: false },
  )

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 p-5 pb-10">
        <section className="rounded-[28px] border border-[var(--border)] bg-white px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Post-dispatch
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Follow-Up
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            All dispatched items grouped by customer. Track installation status and flag snagging issues.
          </p>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-[#fecaca] bg-[#fef2f2] px-5 py-4 text-sm text-[#b91c1c]">
            {error instanceof Error ? error.message : 'Failed to load follow-up data'}
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : (
          <FollowUpView
            lines={lines ?? []}
            onStatusChange={() => void mutate()}
          />
        )}
      </div>
    </div>
  )
}
