// GET  /api/quotations       — list all quotations
// POST /api/quotations       — create quotation + first revision + rooms + items
//
// Accepts two formats:
//   rooms[]  — multi-room (POS path): each room has name, order, items with finish data
//   lineItems[] — flat list (Sales builder path, backward-compatible): single room created

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
  showers: 'SHOWERS',
  bathtubs: 'BATHTUBS',
  'basins & vanities': 'BASINS', basins: 'BASINS',
  'wc & bidets': 'WCS', wcs: 'WCS', wc: 'WCS',
  accessories: 'ACCESSORIES',
  tiles: 'ACCESSORIES',
  kitchen: 'KITCHEN',
  other: 'ACCESSORIES',
}

const ItemSchema = z.object({
  sku: z.string().min(1),
  productName: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).default(18),
  // Finish metadata (POS path)
  finishCode:  z.string().optional(),
  finishName:  z.string().optional(),
  finishSku:   z.string().optional(),
  finishColor: z.string().optional(),
  // Custom product metadata
  isCustom:  z.boolean().optional(),
  brand:     z.string().optional(),
  category:  z.string().optional(),
  // Section/room grouping (Sales builder path)
  section:   z.string().optional(),
})

const RoomSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().default(0),
  items: z.array(ItemSchema),
})

const CreateSchema = z.object({
  customerName: z.string().min(1),
  clientPhone: z.string().optional(),
  referenceBy: z.string().optional(),
  siteAddress: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  globalDiscount: z.number().min(0).max(60).default(0),
  notes: z.string().optional(),
  // Multi-room POS format
  rooms: z.array(RoomSchema).optional(),
  // Flat backward-compat format (Sales builder)
  lineItems: z.array(ItemSchema).optional(),
  // Full POS snapshot stored for "reopen in builder" feature
  snapshot: z.unknown().optional(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      isActive: opts?.isCustom ? false : true,  // custom products hidden from catalog
    },
    select: { id: true },
  })
  return product.id
}

// ─── GET ─────────────────────────────────────────────────────────────────────

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
      const grandTotal = allItems.reduce(
        (sum, item) => sum + item.offerRate * item.quantity * 1.28,
        0,
      )
      return {
        id: rev.quotationId,
        revisionId: rev.id,
        quotationNumber: rev.quotation.number,
        revisionNumber: rev.revisionNumber,
        status: rev.status,
        customerName: rev.quotation.customerName,
        siteAddress: rev.quotation.siteAddress,
        projectId: rev.quotation.projectId ?? null,
        grandTotal,
        createdAt: rev.createdAt,
        lineItemCount,
        isLocked: rev.isLocked,
        globalDiscountPct: rev.globalDiscountPct,
      }
    })

    return NextResponse.json(list)
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = CreateSchema.parse(await req.json())
    const userId = getDevUserId()

    // Auto-generate quotation number: Q-YYYY-NNNN
    const year  = new Date().getFullYear()
    const count = await prisma.quotation.count()
    const quotationNumber = `Q-${year}-${String(count + 1).padStart(4, '0')}`

    // Normalise to rooms array regardless of which format was sent
    let rooms: Array<{ name: string; order: number; items: z.infer<typeof ItemSchema>[] }>
    if (body.rooms && body.rooms.length > 0) {
      rooms = body.rooms
    } else if (body.lineItems && body.lineItems.length > 0) {
      // Group lineItems by section (bathroom/room)
      const roomMap = new Map<string, z.infer<typeof ItemSchema>[]>()
      const roomOrder = new Map<string, number>()
      let orderCounter = 0

      for (const item of body.lineItems) {
        const sectionName = item.section?.trim() || 'General'
        if (!roomMap.has(sectionName)) {
          roomMap.set(sectionName, [])
          roomOrder.set(sectionName, orderCounter++)
        }
        roomMap.get(sectionName)!.push(item)
      }

      rooms = Array.from(roomMap.entries()).map(([name, items]) => ({
        name,
        order: roomOrder.get(name) ?? 0,
        items,
      }))
    } else {
      rooms = [{ name: body.projectName ?? 'General', order: 0, items: [] }]
    }

    // Pre-resolve all product IDs OUTSIDE the transaction to avoid timeout
    type ResolvedItem = z.infer<typeof ItemSchema> & { productId: string }
    const resolvedRooms: Array<{ name: string; order: number; items: ResolvedItem[] }> = []
    for (const room of rooms) {
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

    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          number:        quotationNumber,
          customerName:  body.customerName,
          siteAddress:   body.siteAddress,
          projectId:     body.projectId ?? null,
          createdById:   userId,
          currentStatus: 'DRAFT',
        },
      })

      const revision = await tx.quotationRevision.create({
        data: {
          quotationId:       quotation.id,
          revisionNumber:    0,
          status:            'DRAFT',
          globalDiscountPct: body.globalDiscount,
          notes:             body.notes,
          snapshot:          body.snapshot ? (body.snapshot as object) : undefined,
        },
      })

      // Create each room and its items using pre-resolved product IDs
      for (const room of resolvedRooms) {
        const dbRoom = await tx.quotationRoom.create({
          data: {
            revisionId: revision.id,
            roomName:   room.name,
            order:      room.order,
          },
        })

        let order = 0
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
              sortOrder:      order++,
            },
          })
        }
      }

      return { quotation, revision }
    }, { timeout: 20000 })

    await writeAuditLog({
      actorId:       userId,
      action:        'QUOTATION_CREATED',
      category:      'QUOTATIONS',
      entityType:    'Quotation',
      entityId:      result.quotation.id,
      afterSnapshot: {
        number:       quotationNumber,
        customerName: body.customerName,
        projectId:    body.projectId ?? null,
        roomCount:    rooms.length,
      },
    })

    return NextResponse.json(
      {
        id:              result.quotation.id,
        quotationNumber,
        revisionId:      result.revision.id,
      },
      { status: 201 },
    )
  })
}
