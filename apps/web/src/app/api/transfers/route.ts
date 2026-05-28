import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { getDevUserId, withErrorHandling } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'

const CreateTransferSchema = z.object({
  poLineItemId:       z.string(),
  targetPoLineItemId: z.string().optional(),
  productId:          z.string(),
  productName:        z.string().default(''),
  fromCustomerId:     z.string(),
  fromCustomerName:   z.string(),
  toCustomerId:       z.string(),
  toCustomerName:     z.string(),
  qty:                z.number().int().min(1),
  sourceStage:        z.enum(['AT_GODOWN', 'INBOX', 'DISPATCHED']),
  targetStage:        z.enum(['AT_GODOWN', 'INBOX', 'DISPATCHED']),
  urgency:            z.string().default('NORMAL'),
  reason:             z.string().optional(),
  notes:              z.string().max(500).optional(),
})

export type CreateTransferBody = z.infer<typeof CreateTransferSchema>

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const customerId = req.nextUrl.searchParams.get('customerId')
    const lineId     = req.nextUrl.searchParams.get('lineId')

    if (!customerId && !lineId) {
      throw new AppError('VALIDATION_ERROR', 'customerId or lineId query param required', 400)
    }

    const where = customerId
      ? { OR: [{ fromCustomerId: customerId }, { toCustomerId: customerId }] }
      : { poLineItemId: lineId! }

    const transfers = await prisma.transfer.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ transfers })
  })
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = CreateTransferSchema.parse(await req.json())
    const userId = getDevUserId()

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Source Line
      const sourceLine = await tx.pOLineItem.findUnique({
        where: { id: body.poLineItemId },
      })
      if (!sourceLine) {
        throw new AppError('NOT_FOUND', `Source POLineItem '${body.poLineItemId}' not found`, 404)
      }

      // 2. Validate Source Qty
      const qtyFieldMap = {
        'AT_GODOWN': 'qtyAtGodown',
        'INBOX': 'qtyInBox',
        'DISPATCHED': 'qtyDispatched',
      } as const
      const sourceField = qtyFieldMap[body.sourceStage]
      if ((sourceLine[sourceField] as number) < body.qty) {
        throw new AppError('VALIDATION_ERROR', `Not enough quantity in ${body.sourceStage}. Has ${sourceLine[sourceField]}, needs ${body.qty}`, 400)
      }

      // 3. Resolve Target Line
      let targetLineId = body.targetPoLineItemId
      if (!targetLineId) {
        // If no target line is provided, we must create a direct allocation PO
        // For operational simplicity, we create a generic PO for this customer
        const po = await tx.purchaseOrder.create({
          data: {
            poNumber: `TRF-${Date.now()}`,
            mode: 'PROJECT_LINKED',
            status: 'SUBMITTED',
            createdById: userId,
            customerName: body.toCustomerName,
            notes: `Auto-generated for Priority Transfer from ${body.fromCustomerName}`,
          },
        })
        const newLine = await tx.pOLineItem.create({
          data: {
            poId: po.id,
            productId: body.productId,
            qtyOrdered: body.qty,
            qtyReceived: body.qty,
            status: 'FULLY_RECEIVED',
            priority: body.urgency,
          },
        })
        targetLineId = newLine.id
      }

      // 4. Update Source Line (deduct from sourceStage, add to pending Co so it gets reordered)
      await tx.pOLineItem.update({
        where: { id: body.poLineItemId },
        data: {
          [sourceField]: { decrement: body.qty },
          qtyPendingCo: { increment: body.qty },
          allocationStatus: 'AWAITING_REPLACEMENT',
        },
      })

      // 5. Update Target Line (deduct from pending Co if possible, add to targetStage)
      const targetField = qtyFieldMap[body.targetStage]
      
      const targetLine = await tx.pOLineItem.findUnique({ where: { id: targetLineId } })
      if (targetLine) {
        // We only decrement pending if it's > 0, to avoid negative
        const pendingDecr = Math.min(targetLine.qtyPendingCo, body.qty)
        await tx.pOLineItem.update({
          where: { id: targetLineId },
          data: {
            qtyPendingCo: { decrement: pendingDecr },
            [targetField]: { increment: body.qty },
            allocationStatus: body.urgency === 'URGENT' ? 'URGENT_ALLOCATION' : 'REALLOCATED',
            priority: body.urgency === 'URGENT' ? 'HIGH' : undefined,
          },
        })
      }

      // 6. Record Transfer
      const transfer = await tx.transfer.create({
        data: {
          poLineItemId:     body.poLineItemId,
          targetPoLineItemId: targetLineId,
          productId:        body.productId,
          productName:      body.productName,
          fromCustomerId:   body.fromCustomerId,
          fromCustomerName: body.fromCustomerName,
          toCustomerId:     body.toCustomerId,
          toCustomerName:   body.toCustomerName,
          qty:              body.qty,
          stage:            body.targetStage, // Where it landed
          urgency:          body.urgency,
          reason:           body.reason,
          notes:            body.notes ?? null,
          transferredById:  userId,
        },
      })

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PRIORITY_TRANSFER',
          entityType: 'POLineItem',
          entityId: body.poLineItemId,
          payload: { 
            qty: body.qty, 
            toLineId: targetLineId, 
            toCustomer: body.toCustomerName, 
            urgency: body.urgency, 
            reason: body.reason 
          },
        }
      })

      return NextResponse.json({ transfer }, { status: 201 })
    })
  })
}
