import { prisma } from '@forge/db'
import { buildStageTotals, getBrandsForTab, type BrandTab, type HeaderCounts } from '@/lib/purchases-tracker'

export async function getStageTotalsForScope(scope: BrandTab): Promise<HeaderCounts> {
  const brands = getBrandsForTab(scope)
  const lines = await prisma.pOLineItem.findMany({
    where: brands
      ? {
          product: {
            brand: {
              in: brands as never[],
            },
          },
        }
      : undefined,
    select: {
      qtyOrdered: true,
      qtyPendingCo: true,
      qtyPendingDist: true,
      qtyAtGodown: true,
      qtyInBox: true,
      qtyDispatched: true,
      qtyNotDisplayed: true,
    },
  })

  return buildStageTotals(lines)
}
