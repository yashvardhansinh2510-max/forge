// POST /api/purchase-orders/from-pos
//
// POS direct path — line items arrive from the client-side builder.
// No QuotationRevision is required. Products are upserted by SKU so
// a pre-seeded catalogue entry is not a prerequisite.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import { generatePONumber } from '@/lib/poNumberGenerator'
import type { ProductBrand, ProductCategory } from '@forge/db'

const BRAND_MAP: Record<string, ProductBrand> = {
  grohe: 'GROHE', hansgrohe: 'HANSGROHE', axor: 'AXOR',
  vitra: 'VITRA', geberit: 'GEBERIT', kajaria: 'OTHER', other: 'OTHER',
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  'faucets & mixers': 'FAUCETS', faucets: 'FAUCETS',
  showers: 'SHOWERS', thermostats: 'THERMOSTATS',
  bathtubs: 'BATHTUBS',
  'basins & vanities': 'BASINS', basins: 'BASINS',
  'wc & bidets': 'WCS', wcs: 'WCS', wc: 'WCS',
  accessories: 'ACCESSORIES', tiles: 'ACCESSORIES',
  'concealed parts': 'CONCEALED', concealed: 'CONCEALED',
  kitchen: 'KITCHEN', other: 'ACCESSORIES',
}

const LineItemSchema = z.object({
  sku:            z.string().min(1),
  productName:    z.string().min(1),
  brand:          z.string(),
  category:       z.string(),
  mrp:            z.number().positive(),
  gstRate:        z.number().default(18),
  qty:            z.number().int().positive(),
  clientOfferRate: z.number().nonnegative(),
  isCustom:       z.boolean().optional(),
})

const BodySchema = z.object({
  lineItems:    z.array(LineItemSchema).min(1, 'At least one line item is required'),
  customerName: z.string().optional(),
  projectName:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Purchases', 'Create')
    const body = BodySchema.parse(await req.json())

    // Upsert each product by SKU — POS items may not yet exist in the catalogue.
    // update:{} means we never overwrite existing DB pricing/fields.
    const productIds: string[] = []
    for (const line of body.lineItems) {
      const brand    = BRAND_MAP[line.brand.toLowerCase()]    ?? 'OTHER'
      const category = CATEGORY_MAP[line.category.toLowerCase()] ?? 'ACCESSORIES'
      const product = await prisma.product.upsert({
        where:  { sku: line.sku },
        update: {},
        create: {
          sku:      line.sku,
          name:     line.productName,
          brand,
          category,
          mrp:      line.mrp,
          gstRate:  line.gstRate,
          isCustom: line.isCustom ?? false,
          isActive: line.isCustom ? false : true,
        },
        select: { id: true },
      })
      productIds.push(product.id)
    }

    const poNumber = await generatePONumber()

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        mode:         'BULK_COMPANY',
        status:       'DRAFT',
        createdById:  user.id,
        customerName: body.customerName ?? null,
        lineItems: {
          create: body.lineItems.map((line, i) => ({
            productId:       productIds[i]!,
            qtyOrdered:      line.qty,
            clientOfferRate: line.clientOfferRate,
            status:          'PENDING',
          })),
        },
      },
      select: {
        poNumber: true,
        _count:   { select: { lineItems: true } },
      },
    })

    return NextResponse.json(
      { poNumber: po.poNumber, lineItemCount: po._count.lineItems },
      { status: 201 },
    )
  })
}
