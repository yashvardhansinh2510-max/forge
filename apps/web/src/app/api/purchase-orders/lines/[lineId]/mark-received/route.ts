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
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
}>): HeaderCounts {
  return lines.reduce((acc, line) => {
    const next = countsFromDbLine(line)
    return {
      NEEDS_PO:   acc.NEEDS_PO   + next.NEEDS_PO,
      ORDERED:    acc.ORDERED    + next.ORDERED,
      AT_GODOWN:  acc.AT_GODOWN  + next.AT_GODOWN,
      IN_BOX:     acc.IN_BOX     + next.IN_BOX,
      DISPATCHED: acc.DISPATCHED + next.DISPATCHED,
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
        id:            true,
        qtyOrdered:    true,
        qtyPendingCo:  true,
        qtyAtGodown:   true,
        qtyInBox:      true,
        qtyDispatched: true,
      },
    })

    if (!line) {
      throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found`, 404)
    }

    const needsPo = countsFromDbLine(line).NEEDS_PO
    if (qty > needsPo) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${needsPo} unallocated unit(s) available.`,
        422,
        { available: needsPo, requested: qty },
      )
    }

    // Move NEEDS_PO → AT_GODOWN by incrementing qtyAtGodown.
    // NEEDS_PO is derived (qtyOrdered - staged), so no field to decrement.
    await prisma.pOLineItem.update({
      where: { id: lineId },
      data: { qtyAtGodown: { increment: qty } },
    })

    const allLines = await prisma.pOLineItem.findMany({
      select: {
        qtyOrdered:    true,
        qtyPendingCo:  true,
        qtyAtGodown:   true,
        qtyInBox:      true,
        qtyDispatched: true,
      },
    })

    const stageTotals = buildStageTotals(allLines)

    return NextResponse.json({ stageTotals })
  })
}
