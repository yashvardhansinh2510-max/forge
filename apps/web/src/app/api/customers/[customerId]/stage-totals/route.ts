// GET /api/customers/[customerId]/stage-totals
// Returns aggregated stage qty totals for a specific customer's project.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { computeStageTotalsResult } from '@/lib/purchases-tracker'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const { customerId } = await params

    const items = await prisma.pOLineItem.findMany({
      where: {
        quotationItem: {
          room: {
            revision: {
              quotation: { projectId: customerId },
            },
          },
        },
      },
      select: {
        qtyOrdered: true,
        qtyTransferredIn: true,
        qtyTransferredOut: true,
        qtyPendingCo: true,
        qtyPendingDist: true,
        qtyAtGodown: true,
        qtyInBox: true,
        qtyDispatched: true,
        qtyNotDisplayed: true,
      },
    })

    const sum = (field: keyof (typeof items)[0]) =>
      items.reduce((acc, i) => acc + (i[field] as number), 0)

    return NextResponse.json(computeStageTotalsResult({
      ordered: sum('qtyOrdered'),
      transferredIn: sum('qtyTransferredIn'),
      transferredOut: sum('qtyTransferredOut'),
      pendingCo: sum('qtyPendingCo'),
      pendingDist: sum('qtyPendingDist'),
      godown: sum('qtyAtGodown'),
      inBox: sum('qtyInBox'),
      dispatched: sum('qtyDispatched'),
      notDisplayed: sum('qtyNotDisplayed'),
    }))
  } catch (err) {
    console.error('[customer-stage-totals]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch customer stage totals' },
      { status: 500 },
    )
  }
}
