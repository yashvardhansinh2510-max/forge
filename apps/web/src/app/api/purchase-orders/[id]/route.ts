// GET  /api/purchase-orders/[id]  — full PO detail
// PATCH /api/purchase-orders/[id] — update metadata

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { getDevUserId, withErrorHandling } from '@/lib/api-helpers'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { logActivity } from '@/lib/activity-log'

const UpdatePOSchema = z.object({
  status:           z.enum(['DRAFT','SUBMITTED','PARTIALLY_RECEIVED','FULLY_RECEIVED','CANCELLED']).optional(),
  vendorName:       z.string().optional(),
  expectedDelivery: z.string().datetime().optional().nullable(),
  notes:            z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        project:  { select: { id: true, clientName: true, siteAddress: true } },
        revision: { select: { id: true, revisionNumber: true, status: true } },
        lineItems: {
          include: {
            product: {
              select: {
                id: true, sku: true, name: true, brand: true,
                imageUrl: true, seriesName: true, finishName: true,
                articleNumber: true, mrp: true, unit: true, tier: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        inventoryBoxes: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true, imageUrl: true } },
              },
            },
          },
        },
      },
    })

    if (!po) throw new NotFoundError('PurchaseOrder', id)

    return NextResponse.json(po)
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = UpdatePOSchema.parse(await req.json())

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('PurchaseOrder', id)

    if (existing.status === 'FULLY_RECEIVED') {
      throw new ValidationError('Cannot edit a fully received PO')
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(body.status           !== undefined && { status: body.status }),
        ...(body.vendorName       !== undefined && { vendorName: body.vendorName }),
        ...(body.notes            !== undefined && { notes: body.notes }),
        ...(body.expectedDelivery !== undefined && {
          expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        }),
      },
      include: { lineItems: { include: { product: true } } },
    })

    await logActivity({
      type: 'NOTE',
      userId: getDevUserId(),
      description: `Updated purchase order ${updated.poNumber}`,
      projectId: updated.projectId,
    })

    return NextResponse.json(updated)
  })
}
