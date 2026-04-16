// PATCH /api/purchase-orders/lines/[lineId]/followup-status
// Body: { status: "AWAITING" | "INSTALLED" | "SNAGGING" }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

const BodySchema = z.object({
  status: z.enum(['AWAITING', 'INSTALLED', 'SNAGGING']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params
    const body = BodySchema.parse(await req.json())

    const updated = await prisma.pOLineItem.update({
      where: { id: lineId },
      data: { followUpStatus: body.status },
      select: { id: true, followUpStatus: true },
    })

    return NextResponse.json(updated)
  })
}
