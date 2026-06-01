// GET /api/purchase-orders/stage-totals
// Returns aggregated stage qty totals across all PO line items.
// Also computes "unallocated" = ordered - sum(all stages)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { computeStageTotalsResult } from '@/lib/purchases-tracker'

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get('brand')
    const vendor = req.nextUrl.searchParams.get('vendor')

    const where: Record<string, unknown> = {}
    if (brand) {
      where.product = { brand }
    }
    if (vendor) {
      where.po = { vendorName: vendor }
    }

    const totals = await prisma.pOLineItem.aggregate({
      _sum: {
        qtyOrdered: true,
        qtyPendingCo: true,
        qtyPendingDist: true,
        qtyAtGodown: true,
        qtyInBox: true,
        qtyDispatched: true,
        qtyNotDisplayed: true,
      },
      where: Object.keys(where).length > 0 ? where : undefined,
    })

    const result = computeStageTotalsResult({
      ordered: totals._sum.qtyOrdered ?? 0,
      pendingCo: totals._sum.qtyPendingCo ?? 0,
      pendingDist: totals._sum.qtyPendingDist ?? 0,
      godown: totals._sum.qtyAtGodown ?? 0,
      inBox: totals._sum.qtyInBox ?? 0,
      dispatched: totals._sum.qtyDispatched ?? 0,
      notDisplayed: totals._sum.qtyNotDisplayed ?? 0,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[stage-totals]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch stage totals' },
      { status: 500 },
    )
  }
}
