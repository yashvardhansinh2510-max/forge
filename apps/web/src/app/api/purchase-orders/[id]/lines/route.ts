// POST /api/purchase-orders/[id]/lines — add a line to a DRAFT BULK_COMPANY PO

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { NotFoundError, ValidationError } from '@/lib/errors'

const AddLineSchema = z.object({
  productId:   z.string().cuid(),
  qtyOrdered:  z.number().int().min(1),
  landingCost: z.number().positive().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = AddLineSchema.parse(await req.json())

    const po = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!po) throw new NotFoundError('PurchaseOrder', id)

    if (po.status !== 'DRAFT') {
      throw new ValidationError(`Lines can only be added to DRAFT POs — current status: ${po.status}`)
    }
    if (po.mode !== 'BULK_COMPANY') {
      throw new ValidationError('Manual line addition is only allowed for BULK_COMPANY POs')
    }

    const product = await prisma.product.findUnique({ where: { id: body.productId } })
    if (!product) throw new NotFoundError('Product', body.productId)

    const line = await prisma.pOLineItem.create({
      data: {
        poId:        id,
        productId:   body.productId,
        qtyOrdered:  body.qtyOrdered,
        landingCost: body.landingCost ?? null,
        status:      'PENDING',
      },
      include: { product: { select: { id: true, name: true, sku: true, brand: true, imageUrl: true, mrp: true } } },
    })

    // Increment stockOnOrder
    await prisma.product.update({
      where: { id: body.productId },
      data: { stockOnOrder: { increment: body.qtyOrdered } },
    })

    return NextResponse.json(line, { status: 201 })
  })
}
