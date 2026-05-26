// GET   /api/quotations/[id]  — load quotation revision with rooms + items
// PATCH /api/quotations/[id]  — replace rooms + update metadata

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { type Prisma } from '@forge/db'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

const RoomItemSchema = z.object({
  sku:       z.string().min(1),
  qty:       z.number().int().positive(),
  offerRate: z.number().min(0),
})

const RoomSchema = z.object({
  name:  z.string().min(1),
  items: z.array(RoomItemSchema),
})

// Catalog line item for the legacy slide-over builder path
const LegacyCatalogItemSchema = z.object({
  isCustom:     z.literal(false).optional(),
  sku:          z.string().min(1),
  productName:  z.string().optional(),
  articleNumber: z.string().optional(),
  qty:          z.number().int().positive(),
  unitPrice:    z.number().min(0),
  discount:     z.number().min(0).max(100).default(0),
  gstRate:      z.number().min(0).default(18),
  section:      z.string().optional(),
  imageUrl:     z.string().optional(),
  finishName:   z.string().optional(),
  seriesName:   z.string().optional(),
})

// Custom (non-catalog) line item for the legacy slide-over builder path
const LegacyCustomItemSchema = z.object({
  isCustom:          z.literal(true),
  customDescription: z.string().min(1),
  customBrand:       z.string().optional(),
  customUnit:        z.string().optional(),
  customHsnCode:     z.string().optional(),
  customNotes:       z.string().optional(),
  qty:               z.number().int().positive(),
  unitPrice:         z.number().min(0),
  discount:          z.number().min(0).max(100).default(0),
  gstRate:           z.number().min(0).default(18),
  section:           z.string().optional(),
})

const AnyLegacyItemSchema = z.union([LegacyCustomItemSchema, LegacyCatalogItemSchema])

const PatchSchema = z.object({
  customerName:       z.string().optional(),
  customerPhone:      z.string().optional(),
  billingAddress:     z.string().optional(),
  siteAddress:        z.string().optional(),
  salesRep:           z.string().optional(),
  brandLabel:         z.string().optional(),
  validUntil:         z.string().datetime({ offset: true }).optional(),
  notes:              z.string().optional(),
  termsAndConditions: z.string().optional(),
  rooms:              z.array(RoomSchema).optional(),
  // Legacy line-items path (kept for backwards compat with slide-over builder).
  // Accepts both catalog and custom items.
  lineItems:          z.array(AnyLegacyItemSchema).optional(),
  projectName:        z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

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
              include: {
                product: { select: { sku: true, name: true, mrp: true, unit: true, gstRate: true } },
              },
            },
          },
        },
      },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    return NextResponse.json({
      id:                 revision.quotationId,
      revisionId:         revision.id,
      quotationNumber:    revision.quotation.number,
      status:             revision.status,
      isLocked:           revision.isLocked,
      customerName:       revision.quotation.customerName ?? '',
      customerPhone:      revision.customerPhone ?? '',
      billingAddress:     revision.quotation.billingAddress ?? '',
      siteAddress:        revision.quotation.siteAddress ?? '',
      salesRep:           (revision.quotation as any).salesRep ?? '',
      brandLabel:         (revision.quotation as any).brandLabel ?? 'GROHE',
      createdAt:          revision.createdAt.toISOString(),
      validUntil:         (revision as any).validUntil?.toISOString() ?? null,
      notes:              revision.notes ?? '',
      termsAndConditions: (revision as any).termsAndConditions ?? '',
      rooms: revision.rooms.map((room) => ({
        id:    room.id,
        name:  room.roomName,
        order: room.order,
        items: room.items.map((item) => {
          // Custom item: reconstruct full LineItem shape from stored custom fields.
          // mrp stores the entered unitPrice; discountPct stores the discount %.
          // gstRate is not stored per-item — custom items are always 18%.
          if (item.isCustom) {
            return {
              id:          item.id,
              productId:   '',
              sku:         '',
              productName: item.customDescription ?? '',
              description: '',
              unit:        item.customUnit ?? 'Nos',
              qty:         item.quantity,
              unitPrice:   item.mrp,
              discount:    item.discountPct,
              gstRate:     18,
              offerRate:   item.offerRate,
              isCustom:    true,
              brand:       item.customBrand   ?? undefined,
              hsnCode:     item.customHsnCode ?? undefined,
              notes:       item.customNotes   ?? undefined,
            }
          }
          return {
            id:          item.id,
            productId:   item.productId,
            sku:         item.product?.sku ?? '',
            productName: item.product?.name ?? '',
            mrp:         item.mrp,
            qty:         item.quantity,
            offerRate:   item.offerRate,
          }
        }),
      })),
    })
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

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
      // Update Quotation metadata
      const quotationUpdate: Record<string, unknown> = {}
      if (body.customerName   !== undefined) quotationUpdate.customerName   = body.customerName
      if (body.siteAddress    !== undefined) quotationUpdate.siteAddress    = body.siteAddress
      if (body.billingAddress !== undefined) quotationUpdate.billingAddress = body.billingAddress
      if (body.salesRep       !== undefined) (quotationUpdate as any).salesRep   = body.salesRep
      if (body.brandLabel     !== undefined) (quotationUpdate as any).brandLabel = body.brandLabel
      if (Object.keys(quotationUpdate).length > 0) {
        await tx.quotation.update({ where: { id: revision.quotationId }, data: quotationUpdate })
      }

      // Update Revision metadata
      const revUpdate: Record<string, unknown> = {}
      if (body.notes              !== undefined) revUpdate.notes         = body.notes
      if (body.customerPhone      !== undefined) revUpdate.customerPhone = body.customerPhone
      if (body.validUntil         !== undefined) (revUpdate as any).validUntil         = new Date(body.validUntil)
      if (body.termsAndConditions !== undefined) (revUpdate as any).termsAndConditions = body.termsAndConditions
      if (Object.keys(revUpdate).length > 0) {
        await tx.quotationRevision.update({ where: { id }, data: revUpdate })
      }

      // --- Rooms-based sync (new full-page editor) ---
      if (body.rooms !== undefined) {
        const allSkus = body.rooms.flatMap((r) => r.items.map((i) => i.sku))
        const products = await tx.product.findMany({ where: { sku: { in: allSkus } }, select: { id: true, sku: true, mrp: true } })
        if (allSkus.length > 0 && products.length === 0) {
          throw new Error('No valid SKUs found in payload')
        }
        await tx.quotationRoom.deleteMany({ where: { revisionId: id } })
        const productBySku = new Map(products.map((p) => [p.sku, p]))

        const rooms = await Promise.all(
          body.rooms.map((roomPayload, idx) =>
            tx.quotationRoom.create({ data: { revisionId: id, roomName: roomPayload.name, order: idx } })
          )
        )
        const roomItems = body.rooms.flatMap((roomPayload, rIdx) =>
          roomPayload.items.flatMap((item, iIdx) => {
            const product = productBySku.get(item.sku)
            if (!product) return []
            return [{ roomId: rooms[rIdx]!.id, productId: product.id, quantity: item.qty, mrp: product.mrp, discountPct: 0, offerRate: item.offerRate, totalOffer: item.offerRate * item.qty, sortOrder: iIdx }]
          })
        )
        if (roomItems.length > 0) await tx.quotationItem.createMany({ data: roomItems })
        return
      }

      // --- Legacy line-items sync (slide-over builder) ---
      if (body.lineItems !== undefined) {
        const catalogLIs = body.lineItems.filter(
          (li): li is z.infer<typeof LegacyCatalogItemSchema> => !li.isCustom
        )
        const skus = catalogLIs.map((li) => li.sku)
        const products = await tx.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true, mrp: true } })
        // Only throw if there are catalog items but none resolve — custom-only quotations are fine
        if (skus.length > 0 && products.length === 0) {
          throw new Error('No valid SKUs found in payload')
        }
        await tx.quotationRoom.deleteMany({ where: { revisionId: id } })
        const productBySku = new Map(products.map((p) => [p.sku, p]))

        const sectionMap = new Map<string, typeof body.lineItems>()
        for (const li of body.lineItems) {
          const key = li.section?.trim() || body.projectName || 'General'
          if (!sectionMap.has(key)) sectionMap.set(key, [])
          sectionMap.get(key)!.push(li)
        }
        const sections = Array.from(sectionMap.entries())
        const rooms = await Promise.all(
          sections.map(([sectionName, _], idx) =>
            tx.quotationRoom.create({ data: { revisionId: id, roomName: sectionName, order: idx } })
          )
        )
        const legacyItems: Prisma.QuotationItemCreateManyInput[] = sections.flatMap(([, items], sIdx) =>
          items.flatMap((li, iIdx): Prisma.QuotationItemCreateManyInput[] => {
            if (li.isCustom) {
              const offerRate = li.unitPrice * (1 - li.discount / 100)
              return [{
                roomId:            rooms[sIdx]!.id,
                productId:         undefined,
                isCustom:          true,
                customDescription: li.customDescription,
                customBrand:  li.customBrand  ?? undefined,
                customUnit:   li.customUnit   ?? undefined,
                customHsnCode: li.customHsnCode ?? undefined,
                customNotes:  li.customNotes  ?? undefined,
                quantity:    li.qty,
                mrp:         li.unitPrice,
                discountPct: li.discount,
                offerRate,
                totalOffer:  offerRate * li.qty,
                sortOrder:   iIdx,
              }]
            }
            const product = productBySku.get(li.sku)
            if (!product) return []
            const offerRate = li.unitPrice > 0 ? li.unitPrice : product.mrp * (1 - li.discount / 100)
            return [{
              roomId:       rooms[sIdx]!.id,
              productId:    product.id,
              quantity:     li.qty,
              mrp:          product.mrp,
              discountPct:  li.discount,
              offerRate,
              totalOffer:   offerRate * li.qty,
              sortOrder:    iIdx,
              imageUrl:     li.imageUrl      ?? undefined,
              finishName:   li.finishName    ?? undefined,
              seriesName:   li.seriesName    ?? undefined,
              articleNumber: li.articleNumber ?? undefined,
            }]
          })
        )
        if (legacyItems.length > 0) await tx.quotationItem.createMany({ data: legacyItems })
      }
    })

    return NextResponse.json({ success: true })
  })
}
