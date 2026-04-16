// GET /api/purchase-orders/search?sku={code}
// Scans all PO line items for a matching SKU and returns per-PO rows + aggregated totals.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export interface SKUSearchMatch {
  poId: string
  poNumber: string
  projectName: string | null
  vendorName: string | null
  status: string
  lineItemId: string
  qtyOrdered: number
  qtyReceived: number
  qtyPending: number
}

export interface SKUSearchResult {
  sku: string
  productName: string
  productBrand: string
  productImage: string
  matches: SKUSearchMatch[]
  totals: {
    qtyOrdered: number
    qtyReceived: number
    qtyPending: number
  }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const sku = req.nextUrl.searchParams.get('sku')?.trim() ?? ''

    if (!sku) {
      return NextResponse.json(
        { error: 'MISSING_PARAM', message: 'sku query param is required' },
        { status: 400 },
      )
    }

    const lineItems = await prisma.pOLineItem.findMany({
      where: {
        product: { sku: { contains: sku, mode: 'insensitive' } },
      },
      include: {
        product: {
          select: { sku: true, name: true, brand: true, imageUrl: true },
        },
        po: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            vendorName: true,
            project: { select: { clientName: true } },
          },
        },
      },
    })

    const matches: SKUSearchMatch[] = lineItems.map((li) => ({
      poId:        li.po.id,
      poNumber:    li.po.poNumber,
      projectName: li.po.project?.clientName ?? null,
      vendorName:  li.po.vendorName,
      status:      li.po.status,
      lineItemId:  li.id,
      qtyOrdered:  li.qtyOrdered,
      qtyReceived: li.qtyReceived,
      qtyPending:  li.qtyOrdered - li.qtyReceived,
    }))

    const firstLine = lineItems[0]
    const productName  = firstLine?.product.name  ?? ''
    const productBrand = firstLine?.product.brand ?? ''
    const productImage = firstLine?.product.imageUrl ?? ''

    const totals = matches.reduce(
      (acc, m) => ({
        qtyOrdered:  acc.qtyOrdered  + m.qtyOrdered,
        qtyReceived: acc.qtyReceived + m.qtyReceived,
        qtyPending:  acc.qtyPending  + m.qtyPending,
      }),
      { qtyOrdered: 0, qtyReceived: 0, qtyPending: 0 },
    )

    const result: SKUSearchResult = {
      sku,
      productName,
      productBrand,
      productImage,
      matches,
      totals,
    }

    return NextResponse.json(result)
  })
}
