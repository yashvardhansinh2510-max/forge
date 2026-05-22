import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'
import {
  countsFromDbLine,
  createEmptyHeaderCounts,
  normalizeBrandTab,
} from '@/lib/purchases-tracker'
import type { HeaderCounts } from '@/lib/purchases-tracker'

const MarkReceivedSchema = z.object({
  qty: z.number().int().min(1),
  brand: z.string().optional(),
})

function buildStageTotals(lines: Array<{
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}>): HeaderCounts {
  return lines.reduce((acc, line) => {
    const next = countsFromDbLine(line)
    return {
      UNALLOCATED: acc.UNALLOCATED + next.UNALLOCATED,
      PENDING_CO: acc.PENDING_CO + next.PENDING_CO,
      PENDING_DIST: acc.PENDING_DIST + next.PENDING_DIST,
      GODOWN: acc.GODOWN + next.GODOWN,
      IN_BOX: acc.IN_BOX + next.IN_BOX,
      DISPATCHED: acc.DISPATCHED + next.DISPATCHED,
      NOT_DISPLAYED: acc.NOT_DISPLAYED + next.NOT_DISPLAYED,
    }
  }, createEmptyHeaderCounts())
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params
    const body = MarkReceivedSchema.parse(await req.json())
    const { qty } = body

    const line = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      select: {
        id: true,
        qtyOrdered: true,
        qtyPendingCo: true,
        qtyPendingDist: true,
        qtyAtGodown: true,
        qtyInBox: true,
        qtyDispatched: true,
        qtyNotDisplayed: true,
      },
    })

    if (!line) {
      throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found`, 404)
    }

    const unallocated = countsFromDbLine(line).UNALLOCATED
    if (qty > unallocated) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${unallocated} unallocated unit(s) available.`,
        422,
        { available: unallocated, requested: qty },
      )
    }

    // Move UNALLOCATED → GODOWN by incrementing qtyAtGodown
    // UNALLOCATED is derived (qtyOrdered - staged), so no field to decrement
    await prisma.pOLineItem.update({
      where: { id: lineId },
      data: { qtyAtGodown: { increment: qty } },
    })

    const allLines = await prisma.pOLineItem.findMany({
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

    const stageTotals = buildStageTotals(allLines)

    return NextResponse.json({ stageTotals })
  })
}
