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
      ORDER_IN_CO: acc.ORDER_IN_CO + next.ORDER_IN_CO,
      CO_BILLING:  acc.CO_BILLING  + next.CO_BILLING,
      INBOX:       acc.INBOX       + next.INBOX,
      DISPATCHED:  acc.DISPATCHED  + next.DISPATCHED,
      COMPLETED:   acc.COMPLETED   + next.COMPLETED,
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

    const orderInCo = countsFromDbLine(line).ORDER_IN_CO
    if (qty > orderInCo) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${orderInCo} unallocated unit(s) available.`,
        422,
        { available: orderInCo, requested: qty },
      )
    }

    // Move ORDER_IN_CO → INBOX by incrementing qtyAtGodown.
    // ORDER_IN_CO is derived (qtyOrdered - staged), so no field to decrement.
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
