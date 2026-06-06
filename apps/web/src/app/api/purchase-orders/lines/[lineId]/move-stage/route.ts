import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import { AppError } from '@/lib/errors'

import { logActivity } from '@/lib/activity-log'
import { writeAuditLog } from '@/lib/auth'
import {
  BRAND_TABS,
  normalizeBrandTab,
  createEmptyHeaderCounts,
  countsFromDbLine,
  stageToDbField,
} from '@/lib/purchases-tracker'
import { getStageTotalsForScope } from '@/lib/server/purchase-stage-totals'

// Canonical stage vocabulary — must match purchases-tracker.ts
const FROM_STAGES = ['UNALLOCATED', 'PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED'] as const
const TO_STAGES = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED'] as const

type MoveFromStage = typeof FROM_STAGES[number]
type MoveToStage = typeof TO_STAGES[number]

// Any-to-any: warehouse staff can move stock to any stage.
// The UI presents the 4 user-facing choices; the server just validates qty.
const ALL_TO_STAGES = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED'] as const satisfies MoveToStage[]
const LEGAL_TRANSITIONS: Record<MoveFromStage, MoveToStage[]> = {
  UNALLOCATED:   ALL_TO_STAGES,
  PENDING_CO:    ALL_TO_STAGES,
  PENDING_DIST:  ALL_TO_STAGES,
  GODOWN:        ALL_TO_STAGES,
  IN_BOX:        ALL_TO_STAGES,
  DISPATCHED:    ALL_TO_STAGES,
  NOT_DISPLAYED: ALL_TO_STAGES,
}

const MoveStageSchema = z.object({
  fromStage: z.enum(FROM_STAGES),
  toStage: z.enum(TO_STAGES),
  qty: z.number().int().min(1),
  customerId: z.string().optional(),
  note: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  brand: z.enum(BRAND_TABS).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Inventory', 'Transfer')
    const { lineId } = await params
    const body = MoveStageSchema.parse(await req.json())
    const { fromStage, toStage, qty, customerId, note, location } = body

    const allowedTargets = LEGAL_TRANSITIONS[fromStage] ?? []
    if (!allowedTargets.includes(toStage)) {
      throw new AppError(
        'ILLEGAL_STAGE_TRANSITION',
        `Cannot move from ${fromStage} to ${toStage}.`,
        422,
      )
    }

    const line = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      select: {
        id: true,
        qtyOrdered: true,
        qtyTransferredIn: true,
        qtyTransferredOut: true,
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

    const availableQty = countsFromDbLine(line)[fromStage]
    if (qty > availableQty) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${availableQty} unit(s) are available at ${fromStage}.`,
        422,
        { available: availableQty, requested: qty },
      )
    }

    // Build Prisma update: decrement source field, increment target field.
    // UNALLOCATED is derived (qtyOrdered - staged), so no source field to decrement.
    const dataToUpdate: Record<string, { increment?: number; decrement?: number }> = {}

    if (fromStage !== 'UNALLOCATED') {
      const srcField = stageToDbField(fromStage)
      dataToUpdate[srcField] = { decrement: qty }
    }

    const dstField = stageToDbField(toStage)
    if (dataToUpdate[dstField]) {
      // Same field (shouldn't happen given legal transitions, but guard it)
      dataToUpdate[dstField] = { increment: qty, decrement: dataToUpdate[dstField].decrement }
    } else {
      dataToUpdate[dstField] = { increment: qty }
    }

    await prisma.$transaction([
      prisma.pOLineItem.update({
        where: { id: lineId },
        data: dataToUpdate,
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: lineId,
          fromStage,
          toStage,
          qty,
          movedById: user.id,
          note: customerId
            ? `${note ? `${note} | ` : ''}customer:${customerId}`
            : note ?? null,
          location: location ?? null,
        },
      }),
    ])

    // Fire-and-forget side effects — failures must never surface as 500s
    // after the main transaction already succeeded.
    await logActivity({
      type: 'NOTE',
      userId: user.id,
      description: `Moved ${qty} unit(s) from ${fromStage} to ${toStage} in purchase pipeline`,
    })

    await writeAuditLog({
      actorId: user.id,
      action: 'PURCHASE_STAGE_MOVED',
      category: 'PURCHASES',
      entityType: 'POLineItem',
      entityId: lineId,
      beforeSnapshot: { stage: fromStage, qty: availableQty },
      afterSnapshot: { stage: toStage, qty },
      metadata: { note: note ?? null, customerId: customerId ?? null },
    })

    // Post-transaction reads — wrap individually so a transient DB hiccup after
    // a successful write doesn't turn into a 500.
    let lineItem = null
    try {
      lineItem = await prisma.pOLineItem.findUnique({
        where: { id: lineId },
        include: {
          product: {
            select: { id: true, sku: true, name: true, brand: true, imageUrl: true },
          },
          po: {
            select: {
              id: true,
              poNumber: true,
              vendorName: true,
              project: { select: { id: true, clientName: true, siteAddress: true } },
            },
          },
        },
      })
    } catch (e) {
      console.error('[move-stage] post-transaction findUnique failed', e)
    }

    let stageTotals = createEmptyHeaderCounts()
    try {
      stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))
    } catch (e) {
      console.error('[move-stage] getStageTotalsForScope failed — returning empty counts', e)
    }

    return NextResponse.json({ lineItem, stageTotals })
  })
}
