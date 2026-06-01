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

const TO_STAGES = [
  'COMPANY_BILLING',
  'INBOX',
  'DISPATCHED',
  'COMPLETED',
] as const

const LEGAL_TRANSITIONS: Record<PurchaseStage, typeof TO_STAGES[number][]> = {
  ORDER_IN_COMPANY: ['COMPANY_BILLING', 'INBOX', 'DISPATCHED', 'COMPLETED'],
  COMPANY_BILLING: ['INBOX', 'DISPATCHED', 'COMPLETED'],
  INBOX: ['DISPATCHED', 'COMPLETED'],
  DISPATCHED: ['COMPLETED'],
  COMPLETED: [],
}

const MoveStageSchema = z.object({
  fromStage: z.enum(['ORDER_IN_COMPANY', ...TO_STAGES]),
  toStage: z.enum(TO_STAGES),
  qty: z.number().int().min(1),
  customerId: z.string().optional(),
  note: z.string().max(500).optional(),
  brand: z.enum(BRAND_TABS).optional(),
})

function getCurrentQtyAtStage(line: {
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}, stage: PurchaseStage): number {
  return countsFromDbLine(line)[stage]
}


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Inventory', 'Transfer')
    const { lineId } = await params
    const body = MoveStageSchema.parse(await req.json())
    const {
      fromStage,
      toStage,
      qty,
      customerId,
      note,
    } = body

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

      const availableQty = getCurrentQtyAtStage(line, fromStage)
      if (qty > availableQty) {
        throw new AppError(
          'INSUFFICIENT_QTY',
          `Only ${availableQty} unit(s) are available at ${fromStage}.`,
          422,
          { available: availableQty, requested: qty },
        )
      }

      const dataToUpdate: Record<string, any> = {}
      let remainingToDeduct = qty

      if (fromStage === 'ORDER_IN_COMPANY') {
        if (line.qtyPendingCo > 0) {
          const deductCo = Math.min(remainingToDeduct, line.qtyPendingCo)
          dataToUpdate.qtyPendingCo = { decrement: deductCo }
          remainingToDeduct -= deductCo
        }
      } else if (fromStage === 'COMPANY_BILLING') {
        dataToUpdate.qtyPendingDist = { decrement: qty }
      } else if (fromStage === 'INBOX') {
        if (line.qtyInBox > 0) {
          const deductInBox = Math.min(remainingToDeduct, line.qtyInBox)
          dataToUpdate.qtyInBox = { decrement: deductInBox }
          remainingToDeduct -= deductInBox
        }
        if (remainingToDeduct > 0 && line.qtyAtGodown > 0) {
          dataToUpdate.qtyAtGodown = { decrement: remainingToDeduct }
        }
      } else if (fromStage === 'DISPATCHED') {
        dataToUpdate.qtyDispatched = { decrement: qty }
      }

      if (toStage === 'ORDER_IN_COMPANY') {
        dataToUpdate.qtyPendingCo = { increment: (dataToUpdate.qtyPendingCo?.increment || 0) + qty, decrement: dataToUpdate.qtyPendingCo?.decrement }
      } else if (toStage === 'COMPANY_BILLING') {
        dataToUpdate.qtyPendingDist = { increment: qty, decrement: dataToUpdate.qtyPendingDist?.decrement }
      } else if (toStage === 'INBOX') {
        dataToUpdate.qtyInBox = { increment: qty, decrement: dataToUpdate.qtyInBox?.decrement }
      } else if (toStage === 'DISPATCHED') {
        dataToUpdate.qtyDispatched = { increment: qty, decrement: dataToUpdate.qtyDispatched?.decrement }
      } else if (toStage === 'COMPLETED') {
        dataToUpdate.qtyNotDisplayed = { increment: qty }
      }

      for (const k of Object.keys(dataToUpdate)) {
        if (dataToUpdate[k].increment === undefined) delete dataToUpdate[k].increment
        if (dataToUpdate[k].decrement === undefined) delete dataToUpdate[k].decrement
        if (Object.keys(dataToUpdate[k]).length === 0) delete dataToUpdate[k]
      }

      const updates: Array<ReturnType<typeof prisma.pOLineItem.update> | ReturnType<typeof prisma.stageMovement.create>> = [
        prisma.pOLineItem.update({
          where: { id: lineId },
          data: dataToUpdate,
        })
      ]

      updates.push(
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
          },
        }),
      )

      await prisma.$transaction(updates)

      await logActivity({
        type: 'NOTE',
        userId: user.id,
        description: `Moved ${qty} unit(s) from ${fromStage} to ${toStage} in purchase pipeline`,
      })

      const lineItem = await prisma.pOLineItem.findUnique({
        where: { id: lineId },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              brand: true,
              imageUrl: true,
            },
          },
          po: {
            select: {
              id: true,
              poNumber: true,
              vendorName: true,
              project: {
                select: {
                  id: true,
                  clientName: true,
                  siteAddress: true,
                },
              },
            },
          },
        },
      })

      if (!lineItem) {
        throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found after update`, 404)
      }

      const stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))

      return NextResponse.json({
        lineItem,
        stageTotals,
      })
  })
}
