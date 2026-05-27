import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { getDevUserId, withErrorHandling } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'

const CreateTransferSchema = z.object({
  poLineItemId:     z.string(),
  productId:        z.string(),
  productName:      z.string().default(''),
  fromCustomerId:   z.string(),
  fromCustomerName: z.string(),
  toCustomerId:     z.string(),
  toCustomerName:   z.string(),
  qty:              z.number().int().min(1),
  stage:            z.enum(['INBOX', 'DISPATCHED', 'COMPLETED']),
  notes:            z.string().max(500).optional(),
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

    const lineItem = await prisma.pOLineItem.findUnique({
      where: { id: body.poLineItemId },
      select: { id: true },
    })
    if (!lineItem) {
      throw new AppError('NOT_FOUND', `POLineItem '${body.poLineItemId}' not found`, 404)
    }

    const transfer = await prisma.transfer.create({
      data: {
        poLineItemId:     body.poLineItemId,
        productId:        body.productId,
        productName:      body.productName,
        fromCustomerId:   body.fromCustomerId,
        fromCustomerName: body.fromCustomerName,
        toCustomerId:     body.toCustomerId,
        toCustomerName:   body.toCustomerName,
        qty:              body.qty,
        stage:            body.stage,
        notes:            body.notes ?? null,
        transferredById:  getDevUserId(),
      },
    })

    return NextResponse.json({ transfer }, { status: 201 })
  })
}
