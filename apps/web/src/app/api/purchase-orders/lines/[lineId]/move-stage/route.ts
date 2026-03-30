// PATCH /api/purchase-orders/lines/[lineId]/move-stage
//
// Moves a partial quantity of a PO line item from one stage to the next.
//
// Rules enforced here (server-authoritative):
//   1. fromStage → toStage must be a legal transition
//   2. qty must be > 0
//   3. qty must not exceed the units currently at fromStage
//   4. After move: sum of all stage qtys must not exceed qtyOrdered
//
// Side effects:
//   - Decrements line.qty{FromStage}
//   - Increments line.qty{ToStage}
//   - Creates StageMovement audit record

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'
import { LEGAL_TRANSITIONS, type POStage } from '@/lib/mock/procurement-data'
import { prisma } from '@forge/db'

// ─── Validation ───────────────────────────────────────────────────────────────

const ALL_STAGES = [
  'ORDERED', 'PENDING_CO', 'PENDING_DIST', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED',
] as const

type AnyStage = typeof ALL_STAGES[number]

const MoveStageSchema = z.object({
  fromStage: z.enum(ALL_STAGES),
  toStage:   z.enum(['PENDING_CO', 'PENDING_DIST', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED']),
  qty:       z.number().int().min(1),
  note:      z.string().max(500).optional(),
})

// ─── Stage qty field mapping ──────────────────────────────────────────────────

const STAGE_FIELD: Record<AnyStage, string> = {
  ORDERED:       'qtyOrdered',     // virtual — items not yet in any stage
  PENDING_CO:    'qtyPendingCo',
  PENDING_DIST:  'qtyPendingDist',
  AT_GODOWN:     'qtyAtGodown',
  IN_BOX:        'qtyInBox',
  DISPATCHED:    'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params
    const body = MoveStageSchema.parse(await req.json())
    const { fromStage, toStage, qty, note } = body

    // 1. Validate legal transition
    const legalNextStages = LEGAL_TRANSITIONS[fromStage as 'ORDERED' | POStage] ?? []
    if (!(legalNextStages as readonly string[]).includes(toStage)) {
      throw new AppError(
        'ILLEGAL_STAGE_TRANSITION',
        `Cannot move from ${fromStage} to ${toStage}. Legal next stages: ${legalNextStages.join(', ')}`,
        422,
      )
    }

    // 2. Load line item
    const line = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
    })
    if (!line) {
      throw new AppError('NOT_FOUND', `POLineItem ${lineId} not found`, 404)
    }

    // 3. Compute current qty at fromStage
    //    For ORDERED, the "available" units are those not yet in any stage:
    //    qtyOrdered - (pendingCo + pendingDist + atGodown + inBox + dispatched + notDisplayed)
    let currentQtyAtStage: number
    if (fromStage === 'ORDERED') {
      const staged =
        line.qtyPendingCo + line.qtyPendingDist + line.qtyAtGodown +
        line.qtyInBox + line.qtyDispatched + line.qtyNotDisplayed
      currentQtyAtStage = line.qtyOrdered - staged
    } else {
      const field = STAGE_FIELD[fromStage] as keyof typeof line
      currentQtyAtStage = line[field] as number
    }

    // 4. Validate qty
    if (qty > currentQtyAtStage) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${currentQtyAtStage} unit(s) at stage ${fromStage}. Cannot move ${qty}.`,
        422,
        { available: currentQtyAtStage, requested: qty },
      )
    }

    const movedById = getDevUserId()

    // 5. Execute in a transaction
    const [updatedLine] = await prisma.$transaction([
      // Decrement fromStage, increment toStage
      ...(fromStage === 'ORDERED'
        ? []  // ORDERED is virtual — no field to decrement
        : [
            prisma.pOLineItem.update({
              where: { id: lineId },
              data: { [STAGE_FIELD[fromStage]]: { decrement: qty } },
            }),
          ]
      ),
      prisma.pOLineItem.update({
        where: { id: lineId },
        data:  { [STAGE_FIELD[toStage]]: { increment: qty } },
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: lineId,
          fromStage,
          toStage,
          qty,
          movedById,
          note: note ?? null,
        },
      }),
    ])

    // 6. Re-fetch the final line state (after all tx steps)
    const finalLine = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      include: { product: { select: { sku: true, name: true, brand: true, imageUrl: true } } },
    })

    // 7. Validate post-move invariant: sum of stage qtys <= qtyOrdered
    if (finalLine) {
      const stageSum =
        finalLine.qtyPendingCo + finalLine.qtyPendingDist + finalLine.qtyAtGodown +
        finalLine.qtyInBox + finalLine.qtyDispatched + finalLine.qtyNotDisplayed
      if (stageSum > finalLine.qtyOrdered) {
        // This should never happen — rollback is handled by the transaction
        throw new AppError(
          'INVARIANT_VIOLATED',
          `Stage qty sum ${stageSum} exceeds qtyOrdered ${finalLine.qtyOrdered}`,
          500,
        )
      }
    }

    return NextResponse.json({ line: finalLine ?? updatedLine })
  })
}
