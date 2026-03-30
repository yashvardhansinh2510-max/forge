// GET /api/customers/[customerId]/stage-totals
// Returns aggregated stage qty totals for a specific customer's project.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const { customerId } = await params

    // customerId maps to projectId in our data model
    const items = await prisma.pOLineItem.findMany({
      where: {
        po: { projectId: customerId },
      },
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

    const sum = (field: keyof (typeof items)[0]) =>
      items.reduce((acc, i) => acc + (i[field] as number), 0)

    return NextResponse.json({
      ordered: sum('qtyOrdered'),
      pendingCo: sum('qtyPendingCo'),
      pendingDist: sum('qtyPendingDist'),
      godown: sum('qtyAtGodown'),
      inBox: sum('qtyInBox'),
      dispatched: sum('qtyDispatched'),
      notDisplayed: sum('qtyNotDisplayed'),
    })
  } catch (err) {
    console.error('[customer-stage-totals]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch customer stage totals' },
      { status: 500 },
    )
  }
}
