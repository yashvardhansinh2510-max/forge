// PATCH /api/purchase-orders/lines/[lineId]/follow-up-status
// Updates the followUpStatus field for a dispatched PO line item.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'

const Schema = z.object({
  followUpStatus: z.enum(['AWAITING', 'INSTALLED', 'SNAGGING']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  try {
    const { lineId } = await params
    const { followUpStatus } = Schema.parse(await req.json())

    const updated = await prisma.pOLineItem.update({
      where: { id: lineId },
      data: { followUpStatus },
    })

    return NextResponse.json({ id: updated.id, followUpStatus: updated.followUpStatus })
  } catch (err) {
    console.error('[follow-up-status]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update follow-up status' },
      { status: 500 },
    )
  }
}
