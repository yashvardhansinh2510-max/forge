// GET  /api/quotations       — list all quotations
// POST /api/quotations       — create quotation + first revision + rooms (by section) + items

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

const LineItemSchema = z.object({
  sku:           z.string().min(1),
  productName:   z.string(),
  articleNumber: z.string().optional(),
  qty:           z.number().int().positive(),
  unitPrice:     z.number().min(0),
  discount:      z.number().min(0).max(100).default(0),
  gstRate:       z.number().min(0).default(18),
  section:       z.string().optional(),
  imageUrl:      z.string().optional(),
  finishName:    z.string().optional(),
  seriesName:    z.string().optional(),
})

const CreateSchema = z.object({
  customerName:   z.string().min(1),
  customerPhone:  z.string().optional(),
  customerGST:    z.string().optional(),
  billingAddress: z.string().optional(),
  siteAddress:    z.string().optional(),
  projectName:    z.string().optional(),
  notes:          z.string().optional(),
  validDays:      z.number().int().positive().default(30),
  lineItems:      z.array(LineItemSchema),
})

export async function GET() {
  return withErrorHandling(async () => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const revisions = await prisma.quotationRevision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: true,
        rooms: {
          include: {
            items: {
              select: {
                id: true,
                offerRate: true,
                quantity: true,
                product: { select: { gstRate: true } },
              },
            },
          },
        },
      },
    })

    const list = revisions.map((rev) => {
      const allItems = rev.rooms.flatMap((r) => r.items)
      const lineItemCount = allItems.length
      const grandTotal = allItems.reduce(
        (sum, item) => sum + item.offerRate * item.quantity * (1 + item.product.gstRate / 100),
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

    const { userId: clerkId } = await auth()
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId ?? '' } })
    const userId = user?.id ?? 'unknown'

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

    // Group line items by section (each unique section → one QuotationRoom)
    const sectionMap = new Map<string, typeof body.lineItems>()
    for (const li of body.lineItems) {
      const key = li.section?.trim() || body.projectName || 'General'
      if (!sectionMap.has(key)) sectionMap.set(key, [])
      sectionMap.get(key)!.push(li)
    }

    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          number: quotationNumber,
          customerName: body.customerName,
          siteAddress: body.siteAddress,
          customerGST: body.customerGST,
          billingAddress: body.billingAddress,
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
          customerPhone: body.customerPhone,
          validDays: body.validDays,
        },
      })

      const sections = Array.from(sectionMap.entries())
      const rooms = await Promise.all(
        sections.map(([sectionName, _], idx) =>
          tx.quotationRoom.create({
            data: { revisionId: revision.id, roomName: sectionName, order: idx },
          })
        )
      )

      const allItems = sections.flatMap(([, items], sIdx) => {
        const roomId = rooms[sIdx]!.id
        return items.flatMap((li, itemIdx) => {
          const product = productBySku.get(li.sku)
          if (!product) return []
          const discountFraction = li.discount / 100
          const offerRate = li.unitPrice > 0 ? li.unitPrice : product.mrp * (1 - discountFraction)
          return [{
            roomId,
            productId: product.id,
            quantity: li.qty,
            mrp: product.mrp,
            discountPct: li.discount,
            offerRate,
            totalOffer: offerRate * li.qty,
            sortOrder: itemIdx,
            imageUrl: li.imageUrl ?? null,
            finishName: li.finishName ?? null,
            seriesName: li.seriesName ?? null,
            articleNumber: li.articleNumber ?? null,
          }]
        })
      })

      if (allItems.length > 0) {
        await tx.quotationItem.createMany({ data: allItems })
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
