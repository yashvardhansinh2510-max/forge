import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params

    const movements = await prisma.stageMovement.findMany({
      where: { poLineItemId: lineId },
      select: {
        id: true,
        fromStage: true,
        toStage: true,
        qty: true,
        note: true,
        location: true,
        movedAt: true,
        movedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { movedAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({ movements })
  })
}
