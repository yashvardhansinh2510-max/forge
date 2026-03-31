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

    const ordered = sum('qtyOrdered')
    const pendingCo = sum('qtyPendingCo')
    const pendingDist = sum('qtyPendingDist')
    const godown = sum('qtyAtGodown')
    const inBox = sum('qtyInBox')
    const dispatched = sum('qtyDispatched')
    const notDisplayed = sum('qtyNotDisplayed')
    const staged = pendingCo + pendingDist + godown + inBox + dispatched + notDisplayed
    const unallocated = Math.max(0, ordered - staged)

    return NextResponse.json({
      unallocated,
      pendingCo,
      pendingDist,
      godown,
      inBox,
      dispatched,
      notDisplayed,
    })
  } catch (err) {
    console.error('[customer-stage-totals]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch customer stage totals' },
      { status: 500 },
    )
  }
}
