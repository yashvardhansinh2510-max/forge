// PATCH /api/purchase-orders/[id]/lines/[lineId]/receive

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { receivePOLine } from '@/lib/poReceiver'
import { refreshStockOnOrder } from '@/lib/stockIntelligence'

const ReceiveSchema = z.object({
  qtyReceived: z.number().int().min(1),
  projectId:   z.string().cuid().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params
    const { qtyReceived, projectId } = ReceiveSchema.parse(await req.json())

    const result = await receivePOLine(lineId, qtyReceived, projectId)

    // Refresh denormalized stockOnOrder
    await refreshStockOnOrder(result.updatedLine.productId)

    return NextResponse.json(result)
  })
}
