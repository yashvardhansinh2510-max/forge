// GET   /api/quotations/[id]  — load single quotation revision with line items
// PATCH /api/quotations/[id]  — update draft (re-save line items)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

const LineItemSchema = z.object({
  sku: z.string().min(1),
  productName: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).default(18),
})

const PatchSchema = z.object({
  customerName: z.string().min(1).optional(),
  siteAddress: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(LineItemSchema).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const revision = await prisma.quotationRevision.findUnique({
      where: { id },
      include: {
        quotation: true,
        rooms: {
          orderBy: { order: 'asc' as const },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' as const },
              include: { product: { select: { sku: true, name: true, unit: true, gstRate: true } } },
            },
          },
        },
      },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    const lineItems = revision.rooms.flatMap((room) =>
      room.items.map((item) => ({
        id: item.id,
        sku: item.product.sku,
        productName: item.product.name,
        unit: item.product.unit,
        qty: item.quantity,
        unitPrice: item.offerRate,
        discount: item.discountPct,
        gstRate: item.product.gstRate,
      })),
    )

    return NextResponse.json({
      id: revision.quotationId,
      revisionId: revision.id,
      quotationNumber: revision.quotation.number,
      status: revision.status,
      isLocked: revision.isLocked,
      customerName: revision.quotation.customerName,
      siteAddress: revision.quotation.siteAddress,
      projectId: revision.quotation.projectId ?? null,
      lineItems,
    })
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = PatchSchema.parse(await req.json())

    const revision = await prisma.quotationRevision.findUnique({
      where: { id },
      include: { rooms: { select: { id: true } } },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    if (revision.isLocked) {
      return NextResponse.json({ message: 'Cannot update a locked revision' }, { status: 422 })
    }

    await prisma.$transaction(async (tx) => {
      // Update quotation metadata
      if (body.customerName !== undefined || body.siteAddress !== undefined || body.projectId !== undefined) {
        await tx.quotation.update({
          where: { id: revision.quotationId },
          data: {
            ...(body.customerName !== undefined && { customerName: body.customerName }),
            ...(body.siteAddress !== undefined && { siteAddress: body.siteAddress }),
            ...(body.projectId !== undefined && { projectId: body.projectId }),
          },
        })
      }

      // Update revision notes
      if (body.notes !== undefined || body.projectName !== undefined) {
        await tx.quotationRevision.update({
          where: { id },
          data: { ...(body.notes !== undefined && { notes: body.notes }) },
        })
      }

      // Re-sync line items if provided
      if (body.lineItems !== undefined) {
        // Get or create room
        let roomId: string
        const firstRoom = revision.rooms[0]
        if (firstRoom) {
          roomId = firstRoom.id
          // Delete existing items
          await tx.quotationItem.deleteMany({ where: { roomId } })
          // Update room name if projectName changed
          if (body.projectName !== undefined) {
            await tx.quotationRoom.update({
              where: { id: roomId },
              data: { roomName: body.projectName },
            })
          }
        } else {
          const room = await tx.quotationRoom.create({
            data: {
              revisionId: id,
              roomName: body.projectName ?? 'General',
              order: 0,
            },
          })
          roomId = room.id
        }

        // Look up products by SKU
        const skus = body.lineItems.map((li) => li.sku)
        const products = await tx.product.findMany({
          where: { sku: { in: skus } },
          select: { id: true, sku: true, mrp: true },
        })
        const productBySku = new Map(products.map((p) => [p.sku, p]))

        let order = 0
        for (const li of body.lineItems) {
          const product = productBySku.get(li.sku)
          if (!product) continue
          const offerRate = li.unitPrice > 0 ? li.unitPrice : product.mrp * (1 - li.discount / 100)
          await tx.quotationItem.create({
            data: {
              roomId,
              productId: product.id,
              quantity: li.qty,
              mrp: product.mrp,
              discountPct: li.discount,
              offerRate,
              totalOffer: offerRate * li.qty,
              sortOrder: order++,
            },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  })
}
