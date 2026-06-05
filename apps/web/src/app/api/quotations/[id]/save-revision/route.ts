// POST /api/quotations/[id]/save-revision
// Creates a new DRAFT revision on an existing quotation, populated with
// the provided rooms + items (current POS builder state).
// [id] = quotationId (not revisionId).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import type { ProductBrand, ProductCategory } from '@forge/db'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { writeAuditLog } from '@/lib/auth'

const BRAND_MAP: Record<string, ProductBrand> = {
  grohe: 'GROHE', hansgrohe: 'HANSGROHE', axor: 'AXOR',
  vitra: 'VITRA', geberit: 'GEBERIT', kajaria: 'OTHER', other: 'OTHER',
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  'faucets & mixers': 'FAUCETS', faucets: 'FAUCETS',
  showers: 'SHOWERS', bathtubs: 'BATHTUBS',
  'basins & vanities': 'BASINS', basins: 'BASINS',
  'wc & bidets': 'WCS', wcs: 'WCS', wc: 'WCS',
  accessories: 'ACCESSORIES', tiles: 'ACCESSORIES',
  kitchen: 'KITCHEN', other: 'ACCESSORIES',
}

const ItemSchema = z.object({
  sku:         z.string().min(1),
  productName: z.string(),
  qty:         z.number().int().positive(),
  unitPrice:   z.number().min(0),
  discount:    z.number().min(0).max(100).default(0),
  gstRate:     z.number().min(0).default(18),
  finishCode:  z.string().optional(),
  finishName:  z.string().optional(),
  finishSku:   z.string().optional(),
  finishColor: z.string().optional(),
  isCustom:    z.boolean().optional(),
  brand:       z.string().optional(),
  category:    z.string().optional(),
})

const RoomSchema = z.object({
  name:  z.string().min(1),
  order: z.number().int().default(0),
  items: z.array(ItemSchema),
})

const BodySchema = z.object({
  customerName:   z.string().min(1),
  clientPhone:    z.string().optional(),
  referenceBy:    z.string().optional(),
  siteAddress:    z.string().optional(),
  projectName:    z.string().optional(),
  globalDiscount: z.number().min(0).max(60).default(0),
  notes:          z.string().optional(),
  rooms:          z.array(RoomSchema),
  snapshot:       z.unknown().optional(),
})

async function resolveProductId(
  sku: string, productName: string, mrp: number, gstRate: number,
  opts?: { isCustom?: boolean; brand?: string; category?: string },
): Promise<string> {
  let product = await prisma.product.findUnique({ where: { sku }, select: { id: true } })
  if (product) return product.id

  const dashIdx = sku.lastIndexOf('-')
  if (dashIdx > 0) {
    const baseSku = sku.slice(0, dashIdx)
    product = await prisma.product.findUnique({ where: { sku: baseSku }, select: { id: true } })
    if (product) return product.id
  }

  const brand    = BRAND_MAP[opts?.brand?.toLowerCase() ?? '']    ?? 'OTHER'
  const category = CATEGORY_MAP[opts?.category?.toLowerCase() ?? ''] ?? 'ACCESSORIES'

  product = await prisma.product.upsert({
    where:  { sku },
    update: {},
    create: {
      sku, name: productName, brand, category, mrp, gstRate,
      isCustom: opts?.isCustom ?? false,
      isActive: opts?.isCustom ? false : true,
    },
    select: { id: true },
  })
  return product.id
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id: quotationId } = await params
    const body = BodySchema.parse(await req.json())
    const userId = getDevUserId()

    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } })
    if (!quotation) {
      return NextResponse.json({ message: 'Quotation not found' }, { status: 404 })
    }

    // Next revision number
    const maxRev = await prisma.quotationRevision.aggregate({
      where: { quotationId },
      _max:  { revisionNumber: true },
    })
    const nextRevNumber = (maxRev._max.revisionNumber ?? 0) + 1

    // Pre-resolve product IDs outside transaction
    type ResolvedItem = z.infer<typeof ItemSchema> & { productId: string }
    const resolvedRooms: Array<{ name: string; order: number; items: ResolvedItem[] }> = []
    for (const room of body.rooms) {
      const resolvedItems: ResolvedItem[] = []
      for (const item of room.items) {
        const productId = await resolveProductId(
          item.sku, item.productName, item.unitPrice, item.gstRate,
          { isCustom: item.isCustom, brand: item.brand, category: item.category },
        )
        resolvedItems.push({ ...item, productId })
      }
      resolvedRooms.push({ name: room.name, order: room.order, items: resolvedItems })
    }

    const newRevision = await prisma.$transaction(async (tx) => {
      // Update quotation metadata with latest client info
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          customerName: body.customerName,
          ...(body.siteAddress !== undefined && { siteAddress: body.siteAddress }),
        },
      })

      const rev = await tx.quotationRevision.create({
        data: {
          quotationId,
          revisionNumber:    nextRevNumber,
          status:            'DRAFT',
          isLocked:          false,
          globalDiscountPct: body.globalDiscount,
          notes:             body.notes,
          snapshot:          body.snapshot ? (body.snapshot as object) : undefined,
        },
      })

      for (const room of resolvedRooms) {
        const dbRoom = await tx.quotationRoom.create({
          data: { revisionId: rev.id, roomName: room.name, order: room.order },
        })

        let sortOrder = 0
        for (const item of room.items) {
          const offerRate = item.unitPrice * (1 - item.discount / 100)
          await tx.quotationItem.create({
            data: {
              roomId:         dbRoom.id,
              productId:      item.productId,
              quantity:       item.qty,
              mrp:            item.unitPrice,
              discountPct:    item.discount,
              offerRate,
              totalOffer:     offerRate * item.qty,
              selectedFinish:     item.finishCode  ?? null,
              selectedFinishName: item.finishName  ?? null,
              selectedFinishSku:  item.finishSku   ?? null,
              selectedColor:      item.finishColor ?? null,
              sortOrder:      sortOrder++,
            },
          })
        }
      }

      return rev
    }, { timeout: 20000 })

    await writeAuditLog({
      actorId:       userId,
      action:        'QUOTATION_REVISED',
      category:      'QUOTATIONS',
      entityType:    'QuotationRevision',
      entityId:      newRevision.id,
      afterSnapshot: {
        quotationId,
        newRevId:    newRevision.id,
        newRevNo:    nextRevNumber,
        source:      'pos-builder',
      },
    })

    return NextResponse.json(
      {
        quotationId,
        quotationNumber:  quotation.number,
        revisionId:       newRevision.id,
        revisionNumber:   nextRevNumber,
        status:           'DRAFT',
      },
      { status: 201 },
    )
  })
}
