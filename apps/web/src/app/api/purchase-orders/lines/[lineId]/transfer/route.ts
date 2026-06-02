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
} from '@/lib/purchases-tracker'
import { getStageTotalsForScope } from '@/lib/server/purchase-stage-totals'

// Canonical stage vocabulary — must match purchases-tracker.ts
const TRANSFERABLE_STAGES = [
  'PENDING_CO',
  'PENDING_DIST',
  'GODOWN',
  'IN_BOX',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const

type TransferStage = typeof TRANSFERABLE_STAGES[number]

type LineFields = {
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}

function stageToDbField(stage: TransferStage): keyof Omit<LineFields, 'qtyOrdered'> {
  switch (stage) {
    case 'PENDING_CO':    return 'qtyPendingCo'
    case 'PENDING_DIST':  return 'qtyPendingDist'
    case 'GODOWN':        return 'qtyAtGodown'
    case 'IN_BOX':        return 'qtyInBox'
    case 'DISPATCHED':    return 'qtyDispatched'
    case 'NOT_DISPLAYED': return 'qtyNotDisplayed'
  }
}

function getQtyAtStage(line: LineFields, stage: TransferStage): number {
  return line[stageToDbField(stage)]
}

const TransferSchema = z.object({
  stage: z.enum(TRANSFERABLE_STAGES),
  qty: z.number().int().min(1),
  targetLineId: z.string(),
  reason: z.string().max(500),
  brand: z.enum(BRAND_TABS).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Inventory', 'Transfer')
    const { lineId } = await params
    const body = TransferSchema.parse(await req.json())
    const { stage, qty, targetLineId, reason } = body

    if (lineId === targetLineId) {
      throw new AppError('INVALID_TARGET', 'Cannot transfer to the same line', 422)
    }

    const sourceLine = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      include: { po: { include: { project: true } } },
    })
    const targetLine = await prisma.pOLineItem.findUnique({
      where: { id: targetLineId },
      include: { po: { include: { project: true } } },
    })

    if (!sourceLine || !targetLine) {
      throw new AppError('NOT_FOUND', `POLineItem not found`, 404)
    }

    if (sourceLine.productId !== targetLine.productId) {
      throw new AppError('MISMATCH', `Product mismatch in transfer`, 422)
    }

    const availableQty = getQtyAtStage(sourceLine, stage)
    if (qty > availableQty) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${availableQty} unit(s) are available at ${stage}.`,
        422,
        { available: availableQty, requested: qty },
      )
    }

    const sourceCustomerName = sourceLine.po.project?.clientName ?? sourceLine.po.customerName ?? 'Unknown'
    const targetCustomerName = targetLine.po.project?.clientName ?? targetLine.po.customerName ?? 'Unknown'
    const auditNote = `TRANSFER: ${qty} units from ${sourceCustomerName} to ${targetCustomerName}. Reason: ${reason}`

    const field = stageToDbField(stage)

    await prisma.$transaction([
      prisma.pOLineItem.update({
        where: { id: lineId },
        data: {
          qtyTransferredOut: { increment: qty },
          [field]: { decrement: qty },
        },
      }),
      prisma.pOLineItem.update({
        where: { id: targetLineId },
        data: {
          qtyTransferredIn: { increment: qty },
          [field]: { increment: qty },
        },
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: lineId,
          fromStage: stage,
          toStage: 'TRANSFERRED_OUT',
          qty,
          movedById: user.id,
          note: auditNote,
        },
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: targetLineId,
          fromStage: 'TRANSFERRED_IN',
          toStage: stage,
          qty,
          movedById: user.id,
          note: auditNote,
        },
      }),
    ])

    // Fire-and-forget side effects
    await logActivity({
      type: 'NOTE',
      userId: user.id,
      description: auditNote,
    })

    await writeAuditLog({
      actorId: user.id,
      action: 'PURCHASE_TRANSFER',
      category: 'PURCHASES',
      entityType: 'POLineItem',
      entityId: lineId,
      beforeSnapshot: { lineId, stage, qty },
      afterSnapshot: { targetLineId, stage, qty },
      metadata: { reason, sourceCustomer: sourceCustomerName, targetCustomer: targetCustomerName },
    })

    // Post-transaction read — failure must not mask a successful transfer
    let stageTotals = createEmptyHeaderCounts()
    try {
      stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))
    } catch (e) {
      console.error('[transfer] getStageTotalsForScope failed — returning empty counts', e)
    }

    return NextResponse.json({ success: true, stageTotals })
  })
}
