// GET  /api/quotations       — list all quotations
// POST /api/quotations       — create quotation + first revision + room + items

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'

const LineItemSchema = z.object({
  sku: z.string().min(1),
  productName: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).default(18),
})

const CreateSchema = z.object({
  customerName: z.string().min(1),
  siteAddress: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(LineItemSchema),
})

const UpdateSchema = z.object({
  customerName: z.string().min(1).optional(),
  siteAddress: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(LineItemSchema).optional(),
})

export async function GET() {
  return withErrorHandling(async () => {
    const revisions = await prisma.quotationRevision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: true,
        rooms: {
          include: {
            items: {
              select: { id: true, offerRate: true, quantity: true },
            },
          },
        },
      },
    })

    const list = revisions.map((rev) => {
      const allItems = rev.rooms.flatMap((r) => r.items)
      const lineItemCount = allItems.length
      // grandTotal = sum of (offerRate * quantity * (1 + gstRate/100))
      // offerRate already factors in discount; we add 18% GST (standard)
      const grandTotal = allItems.reduce(
        (sum, item) => sum + item.offerRate * item.quantity * 1.18,
        0,
      )
      return {
        id: rev.quotationId,
        revisionId: rev.id,
        quotationNumber: rev.quotation.number,
        status: rev.status,
        customerName: rev.quotation.customerName,
        siteAddress: rev.quotation.siteAddress,
        grandTotal,
        createdAt: rev.createdAt,
        lineItemCount,
        isLocked: rev.isLocked,
      }
    })

    return NextResponse.json(list)
  })
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = CreateSchema.parse(await req.json())
    const userId = getDevUserId()

    // Auto-generate quotation number: Q-YYYY-NNNN
    const year = new Date().getFullYear()
    const count = await prisma.quotation.count()
    const quotationNumber = `Q-${year}-${String(count + 1).padStart(4, '0')}`

    // Look up products by SKU for all line items
    const skus = body.lineItems.map((li) => li.sku)
    const products = await prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { id: true, sku: true, mrp: true },
    })
    const productBySku = new Map(products.map((p) => [p.sku, p]))

    // Create Quotation + Revision + Room + Items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          number: quotationNumber,
          customerName: body.customerName,
          siteAddress: body.siteAddress,
          createdById: userId,
          currentStatus: 'DRAFT',
        },
      })

      const revision = await tx.quotationRevision.create({
        data: {
          quotationId: quotation.id,
          revisionNumber: 0,
          status: 'DRAFT',
          notes: body.notes,
        },
      })

      const room = await tx.quotationRoom.create({
        data: {
          revisionId: revision.id,
          roomName: body.projectName ?? 'General',
          order: 0,
        },
      })

      // Create items for line items that have a matching product
      let order = 0
      for (const li of body.lineItems) {
        const product = productBySku.get(li.sku)
        if (!product) continue
        const discountFraction = li.discount / 100
        const offerRate = li.unitPrice > 0 ? li.unitPrice : product.mrp * (1 - discountFraction)
        await tx.quotationItem.create({
          data: {
            roomId: room.id,
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

      return { quotation, revision }
    })

    return NextResponse.json(
      {
        id: result.quotation.id,
        quotationNumber,
        revisionId: result.revision.id,
      },
      { status: 201 },
    )
  })
}
