// lib/swr-helpers.ts — SWR fetcher and shared hooks for procurement API

import useSWR, { mutate as globalMutate } from 'swr'

/** Default JSON fetcher for SWR */
export const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
})

/** Stage totals shape returned by both endpoints */
export interface StageTotals {
  ordered: number
  pendingCo: number
  pendingDist: number
  godown: number
  inBox: number
  dispatched: number
  notDisplayed: number
}

/** Global stage totals across all line items */
export function useStageTotals() {
  return useSWR<StageTotals>('/api/purchase-orders/stage-totals', fetcher, {
    refreshInterval: 0,        // manual revalidation only
    revalidateOnFocus: false,
  })
}

/** Customer-specific stage totals */
export function useCustomerStageTotals(customerId: string | null) {
  return useSWR<StageTotals>(
    customerId ? `/api/customers/${customerId}/stage-totals` : null,
    fetcher,
    { revalidateOnFocus: false },
  )
}

/** Revalidate all stage-related caches after a move */
export async function revalidateAfterMove(customerId?: string | null) {
  const promises = [
    globalMutate('/api/purchase-orders/stage-totals'),
  ]
  if (customerId) {
    promises.push(globalMutate(`/api/customers/${customerId}/stage-totals`))
  }
  await Promise.all(promises)
}
