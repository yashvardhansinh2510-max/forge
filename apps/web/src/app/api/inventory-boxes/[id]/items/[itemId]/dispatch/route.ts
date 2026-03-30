// PATCH /api/inventory-boxes/[id]/items/[itemId]/dispatch

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { dispatchFromBox } from '@/lib/boxDispatcher'

const DispatchSchema = z.object({
  qtyDispatched: z.number().int().min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return withErrorHandling(async () => {
    const { itemId } = await params
    const { qtyDispatched } = DispatchSchema.parse(await req.json())

    const updated = await dispatchFromBox(itemId, qtyDispatched)
    return NextResponse.json(updated)
  })
}
