// POST /api/purchase-orders/from-revision/[revisionId]
//
// Two paths:
//   A) revisionId is a real DB QuotationRevision (LOCKED/FINALIZED)
//      → delegates to buildPOFromRevision() in lib/quotationToPO.ts
//      → if revision exists but has no DB items (products not seeded), falls through to Path B
//   B) revisionId is a mock quotation ID (not in DB) OR Path A fallback
//      → body must contain { lineItems: [{ sku, productName, qty, clientOfferRate? }] }
//      → upserts products by SKU, creates a BULK_COMPANY draft PO

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { buildPOFromRevision } from '@/lib/quotationToPO'
import { generatePONumber } from '@/lib/poNumberGenerator'

const MockLineItemSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  qty: z.number().int().positive(),
  clientOfferRate: z.number().optional(),
})

const BodySchema = z.object({
  vendorFilter: z.string().optional(),
  lineItems: z.array(MockLineItemSchema).optional(),
  customerName: z.string().optional(),
  projectName: z.string().optional(),
}).optional()

function brandFromSku(sku: string): 'GROHE' | 'HANSGROHE' | 'AXOR' | 'VITRA' | 'GEBERIT' | 'OTHER' {
  const prefix = (sku.split('-')[0] ?? '').toUpperCase()
  if (prefix === 'GRH') return 'GROHE'
  if (prefix === 'HG') return 'HANSGROHE'
  if (prefix === 'AX') return 'AXOR'
  if (prefix === 'VT' || prefix === 'VTR') return 'VITRA'
  if (prefix === 'GEB') return 'GEBERIT'
  return 'OTHER'
}

async function createPOFromLineItems(
  lineItems: z.infer<typeof MockLineItemSchema>[],
  userId: string,
  opts: { vendorFilter?: string; customerName?: string; projectName?: string },
) {
  // Upsert products so PO creation works even without a pre-seeded catalogue
  const resolvedItems = await Promise.all(
    lineItems.map(async (li) => {
      const product = await prisma.product.upsert({
        where: { sku: li.sku },
        update: {},
        create: {
          sku: li.sku,
          name: li.productName,
          brand: brandFromSku(li.sku),
          category: 'ACCESSORIES',
          mrp: li.clientOfferRate ?? 0,
          gstRate: 18,
          unit: 'pcs',
        },
      })
      return { li, product }
    }),
  )

  const poNumber = await generatePONumber()

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      mode: 'BULK_COMPANY',
      status: 'DRAFT',
      createdById: userId,
      vendorName: opts.vendorFilter ?? null,
      customerName: opts.customerName ?? null,
      notes: opts.projectName ? `From quotation: ${opts.projectName}` : null,
    },
  })

  await prisma.pOLineItem.createMany({
    data: resolvedItems.map(({ li, product }) => ({
      poId: po.id,
      productId: product.id,
      qtyOrdered: li.qty,
      clientOfferRate: li.clientOfferRate ?? null,
    })),
  })

  // Create companion SalesOrder so this PO appears on the Payments page
  const offerTotal = resolvedItems.reduce(
    (sum, { li }) => sum + (li.clientOfferRate ?? 0) * li.qty,
    0,
  )

  await prisma.salesOrder.create({
    data: {
      number: po.poNumber,
      customerId: `po-${po.id}`,
      customerName: opts.customerName ?? 'Walk-in Customer',
      customerPhone: null,
      status: 'CONFIRMED',
      projectName: opts.projectName ?? null,
      mrpTotal: offerTotal,
      offerTotal,
      lineItems: {
        create: resolvedItems.map(({ li, product }) => ({
          sku: li.sku,
          name: li.productName,
          brand: product.brand,
          qty: li.qty,
          mrp: product.mrp,
          offerRate: li.clientOfferRate ?? product.mrp,
        })),
      },
    },
  })

  return { poNumber, lineItemCount: resolvedItems.length }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  return withErrorHandling(async () => {
    const { revisionId } = await params
    let rawBody: unknown
    try { rawBody = await req.json() } catch { rawBody = undefined }
    const body = BodySchema.parse(rawBody)
    const userId = getDevUserId()

    // Path A: real DB revision
    const revision = await prisma.quotationRevision.findUnique({
      where: { id: revisionId },
    })

    if (revision) {
      try {
        const po = await buildPOFromRevision(revisionId, userId, {
          vendorFilter: body?.vendorFilter,
        })
        return NextResponse.json(po, { status: 201 })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        // If the revision exists but has no DB items (products not seeded),
        // fall through to Path B using lineItems from the request body.
        const noItems = msg.toLowerCase().includes('no line items')
        if (!noItems || !body?.lineItems?.length) {
          const message = e instanceof Error ? e.message : 'Failed to build PO from revision'
          return NextResponse.json({ message }, { status: 422 })
        }
        console.warn('[from-revision] Path A: revision has no items, falling back to Path B')
      }
    }

    // Path B: mock quotation ID OR Path A fallback — requires lineItems in body
    if (!body?.lineItems?.length) {
      return NextResponse.json(
        { message: `Revision "${revisionId}" not found. For mock quotations, include lineItems in the request body.` },
        { status: 422 },
      )
    }

    try {
      const result = await createPOFromLineItems(body.lineItems, userId, {
        vendorFilter: body.vendorFilter,
        customerName: body.customerName,
        projectName: body.projectName,
      })
      return NextResponse.json(result, { status: 201 })
    } catch (e) {
      console.error('[from-revision] PO creation failed', e)
      const message = e instanceof Error ? e.message : 'Database error creating PO'
      return NextResponse.json({ message }, { status: 500 })
    }
  })
}
