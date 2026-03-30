// PATCH /api/inventory-boxes/items/[itemId]/dispatch
//
// Creates a per-unit dispatch record for an inventory box item.
// Once saved, custom notes are immutable (append-only audit log).
//
// Body: {
//   qty:            number            — how many units to dispatch (usually 1)
//   recipientName?: string            — defaults to project client name
//   recipientRole?: RecipientRole     — 'CLIENT' | 'PLUMBER' | 'CONTRACTOR' | 'ARCHITECT' | 'OTHER'
//   customNote?:    string            — free text, max 500 chars, immutable once saved
// }
//
// TODO (when DB is ready):
//   await prisma.dispatchRecord.createMany({
//     data: Array.from({ length: body.qty }, (_, i) => ({
//       boxItemId:         itemId,
//       unitIndex:         currentQtyDispatched + i + 1,
//       recipientName:     body.recipientName ?? project.clientName,
//       recipientRole:     body.recipientRole ?? 'CLIENT',
//       customNote:        body.customNote ?? null,
//       isCustomRecipient: !!body.recipientName,
//       dispatchedAt:      new Date(),
//       dispatchedById:    userId,
//     }))
//   })
//   await prisma.boxItem.update({
//     where: { id: itemId },
//     data: {
//       qtyDispatched: { increment: body.qty },
//       status: newQtyDispatched >= item.qtyTotal ? 'FULLY_DISPATCHED' : 'PARTIALLY_DISPATCHED',
//     }
//   })

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { ValidationError } from '@/lib/errors'

const DispatchSchema = z.object({
  qty:           z.number().int().min(1).max(50),
  recipientName: z.string().min(1).max(200).optional(),
  recipientRole: z.enum(['CLIENT', 'PLUMBER', 'CONTRACTOR', 'ARCHITECT', 'OTHER']).optional(),
  customNote:    z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  return withErrorHandling(async () => {
    const { itemId } = await params
    const body = DispatchSchema.safeParse(await req.json())

    if (!body.success) {
      throw new ValidationError(body.error.errors[0]?.message ?? 'Invalid body')
    }

    const userId = getDevUserId()
    const now    = new Date().toISOString()

    // Optimistic: client-side Zustand store handles the UI update.
    // This route validates + would write to DB in production.
    // Returns the dispatch records that were created so client can merge them.

    const records = Array.from({ length: body.data.qty }, (_, i) => ({
      id:                `dr-${Date.now()}-${i}`,
      // unitIndex is computed client-side from current qtyDispatched
      recipientName:     body.data.recipientName ?? 'Client',
      recipientRole:     body.data.recipientRole ?? 'CLIENT',
      customNote:        body.data.customNote ?? null,
      isCustomRecipient: !!(body.data.recipientName),
      dispatchedAt:      now,
      dispatchedBy:      userId,
    }))

    return NextResponse.json({
      ok:       true,
      itemId,
      qty:      body.data.qty,
      records,
      dispatchedAt: now,
    })
  })
}
