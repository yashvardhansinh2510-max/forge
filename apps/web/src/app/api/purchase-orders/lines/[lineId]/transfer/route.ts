import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import { AppError } from '@/lib/errors'

import { logActivity } from '@/lib/activity-log'
import {
  BRAND_TABS,
  countsFromDbLine,
  normalizeBrandTab,
  type PurchaseStage,
} from '@/lib/purchases-tracker'
import { getStageTotalsForScope } from '@/lib/server/purchase-stage-totals'

const STAGES = [
  'ORDER_IN_COMPANY',
  'COMPANY_BILLING',
  'INBOX',
  'DISPATCHED',
  'COMPLETED',
] as const

const TransferSchema = z.object({
  stage: z.enum(STAGES),
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

      const availableQty = countsFromDbLine(sourceLine)[stage]
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

      const sourceDataToUpdate: Record<string, any> = { qtyOrdered: { decrement: qty } }
      const targetDataToUpdate: Record<string, any> = { qtyOrdered: { increment: qty } }
      
      let remainingToDeduct = qty
      
      if (stage === 'ORDER_IN_COMPANY') {
        if (sourceLine.qtyPendingCo > 0) {
          const deductCo = Math.min(remainingToDeduct, sourceLine.qtyPendingCo)
          sourceDataToUpdate.qtyPendingCo = { decrement: deductCo }
          targetDataToUpdate.qtyPendingCo = { increment: deductCo }
          remainingToDeduct -= deductCo
        }
      } else if (stage === 'COMPANY_BILLING') {
        sourceDataToUpdate.qtyPendingDist = { decrement: qty }
        targetDataToUpdate.qtyPendingDist = { increment: qty }
      } else if (stage === 'INBOX') {
        if (sourceLine.qtyInBox > 0) {
          const deductInBox = Math.min(remainingToDeduct, sourceLine.qtyInBox)
          sourceDataToUpdate.qtyInBox = { decrement: deductInBox }
          targetDataToUpdate.qtyInBox = { increment: deductInBox }
          remainingToDeduct -= deductInBox
        }
        if (remainingToDeduct > 0 && sourceLine.qtyAtGodown > 0) {
          sourceDataToUpdate.qtyAtGodown = { decrement: remainingToDeduct }
          targetDataToUpdate.qtyAtGodown = { increment: remainingToDeduct }
        }
      } else if (stage === 'DISPATCHED') {
        sourceDataToUpdate.qtyDispatched = { decrement: qty }
        targetDataToUpdate.qtyDispatched = { increment: qty }
      } else if (stage === 'COMPLETED') {
        sourceDataToUpdate.qtyNotDisplayed = { decrement: qty }
        targetDataToUpdate.qtyNotDisplayed = { increment: qty }
      }

      const updates: any[] = [
        prisma.pOLineItem.update({
          where: { id: lineId },
          data: sourceDataToUpdate,
        }),
        prisma.pOLineItem.update({
          where: { id: targetLineId },
          data: targetDataToUpdate,
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
      ]

      await prisma.$transaction(updates)

      await logActivity({
        type: 'NOTE',
        userId: user.id,
        description: auditNote,
      })

      const stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))

      return NextResponse.json({
        success: true,
        stageTotals,
      })
  })
}
