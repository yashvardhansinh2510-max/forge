// GET   /api/quotations/[id]  — load single revision with room structure + finish + snapshot
// PATCH /api/quotations/[id]  — update draft revision (rooms or lineItems format)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import type { ProductBrand, ProductCategory } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'

const ItemSchema = z.object({
  sku: z.string().min(1),
  productName: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).default(18),
  finishCode:  z.string().optional(),
  finishName:  z.string().optional(),
  finishSku:   z.string().optional(),
  finishColor: z.string().optional(),
  isCustom:    z.boolean().optional(),
  brand:       z.string().optional(),
  category:    z.string().optional(),
  section:     z.string().optional(),
})

const RoomSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().default(0),
  items: z.array(ItemSchema),
})

const PatchSchema = z.object({
  customerName:   z.string().min(1).optional(),
  siteAddress:    z.string().optional(),
  projectId:      z.string().optional(),
  projectName:    z.string().optional(),
  globalDiscount: z.number().min(0).max(60).optional(),
  notes:          z.string().optional(),
  rooms:          z.array(RoomSchema).optional(),
  lineItems:      z.array(ItemSchema).optional(),
  snapshot:       z.unknown().optional(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND_MAP: Record<string, ProductBrand> = {
  grohe: 'GROHE', axor: 'AXOR', hansgrohe: 'HANSGROHE',
  vitra: 'VITRA', geberit: 'GEBERIT', kajaria: 'OTHER', other: 'OTHER',
}
const CATEGORY_MAP: Record<string, ProductCategory> = {
  'faucets & mixers': 'FAUCETS', faucets: 'FAUCETS',
  showers: 'SHOWERS', bathtubs: 'BATHTUBS',
  'basins & vanities': 'BASINS', basins: 'BASINS',
  'wc & bidets': 'WCS', wcs: 'WCS',
  accessories: 'ACCESSORIES', tiles: 'ACCESSORIES', other: 'ACCESSORIES',
}

async function resolveProductId(
  sku: string,
  productName: string,
  mrp: number,
  gstRate: number,
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

// ─── GET ─────────────────────────────────────────────────────────────────────

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
              include: {
                product: {
                  select: { sku: true, name: true, unit: true, gstRate: true },
                },
              },
            },
          },
        },
      },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    // Return full room structure so the POS builder can reconstruct state
    const rooms = revision.rooms.map((room) => ({
      id:       room.id,
      roomName: room.roomName,
      order:    room.order,
      items:    room.items.map((item) => ({
        id:            item.id,
        sku:           item.product.sku,
        productName:   item.product.name,
        unit:          item.product.unit,
        qty:           item.quantity,
        unitPrice:     item.offerRate,
        discount:      item.discountPct,
        gstRate:       item.product.gstRate,
        finishCode:    item.selectedFinish     ?? undefined,
        finishName:    item.selectedFinishName ?? undefined,
        finishSku:     item.selectedFinishSku  ?? undefined,
        finishColor:   item.selectedColor      ?? undefined,
      })),
    }))

    // Flat lineItems kept for backward compat (restore section field from room name)
    const lineItems = rooms.flatMap((room) =>
      room.items.map((item) => ({
        id:          item.id,
        sku:         item.sku,
        productName: item.productName,
        unit:        item.unit,
        qty:         item.qty,
        unitPrice:   item.unitPrice,
        discount:    item.discount,
        gstRate:     item.gstRate,
        section:     room.roomName,
        finishCode:  item.finishCode ?? undefined,
        finishName:  item.finishName ?? undefined,
        finishSku:   item.finishSku ?? undefined,
        finishColor: item.finishColor ?? undefined,
      })),
    )

    return NextResponse.json({
      id:               revision.quotationId,
      revisionId:       revision.id,
      quotationNumber:  revision.quotation.number,
      status:           revision.status,
      isLocked:         revision.isLocked,
      globalDiscountPct: revision.globalDiscountPct,
      customerName:     revision.quotation.customerName,
      siteAddress:      revision.quotation.siteAddress,
      projectId:        revision.quotation.projectId ?? null,
      snapshot:         revision.snapshot ?? null,
      rooms,
      lineItems,
    })
  })
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = PatchSchema.parse(await req.json())

    const revision = await prisma.quotationRevision.findUnique({
      where:   { id },
      include: { rooms: { select: { id: true } } },
    })

    if (!revision) {
      return NextResponse.json({ message: 'Revision not found' }, { status: 404 })
    }

    if (revision.isLocked) {
      return NextResponse.json({ message: 'Cannot update a locked revision' }, { status: 422 })
    }

    const actor = await getCurrentUser()

    // Normalise incoming rooms
    let incomingRooms: Array<{ name: string; order: number; items: z.infer<typeof ItemSchema>[] }> | null
    if (body.rooms && body.rooms.length > 0) {
      incomingRooms = body.rooms
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

      incomingRooms = Array.from(roomMap.entries()).map(([name, items]) => ({
        name,
        order: roomOrder.get(name) ?? 0,
        items,
      }))
    } else {
      incomingRooms = null
    }

    // Pre-resolve product IDs OUTSIDE transaction to avoid timeout
    type ResolvedItem = z.infer<typeof ItemSchema> & { productId: string }
    type ResolvedRoom = { name: string; order: number; items: ResolvedItem[] }
    let resolvedRooms: ResolvedRoom[] | null = null
    if (incomingRooms) {
      resolvedRooms = []
      for (const room of incomingRooms) {
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
    }

    await prisma.$transaction(async (tx) => {
      // Update quotation metadata
      if (body.customerName !== undefined || body.siteAddress !== undefined || body.projectId !== undefined) {
        await tx.quotation.update({
          where: { id: revision.quotationId },
          data: {
            ...(body.customerName !== undefined && { customerName: body.customerName }),
            ...(body.siteAddress  !== undefined && { siteAddress:  body.siteAddress  }),
            ...(body.projectId    !== undefined && { projectId:    body.projectId    }),
          },
        })
      }

      // Update revision metadata
      const revUpdate: Record<string, unknown> = {}
      if (body.notes            !== undefined) revUpdate.notes            = body.notes
      if (body.globalDiscount   !== undefined) revUpdate.globalDiscountPct = body.globalDiscount
      if (body.snapshot         !== undefined) revUpdate.snapshot          = body.snapshot as object
      if (Object.keys(revUpdate).length > 0) {
        await tx.quotationRevision.update({ where: { id }, data: revUpdate })
      }

      // Re-sync rooms + items if provided (use pre-resolved IDs passed in)
      if (resolvedRooms) {
        // Delete all existing rooms (cascade deletes items)
        await tx.quotationRoom.deleteMany({ where: { revisionId: id } })

        // Recreate rooms + items
        for (const room of resolvedRooms) {
          const dbRoom = await tx.quotationRoom.create({
            data: { revisionId: id, roomName: room.name, order: room.order },
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
      }
    })

    await writeAuditLog({
      actorId:       actor?.id ?? null,
      action:        'QUOTATION_EDITED',
      category:      'QUOTATIONS',
      entityType:    'Quotation',
      entityId:      revision.quotationId,
      afterSnapshot: { updatedFields: Object.keys(body) },
    })

    return NextResponse.json({ success: true })
  })
}
