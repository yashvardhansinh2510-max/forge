// GET /api/purchase-orders/search?sku={code}
// Scans all PO line items for a matching SKU and returns per-PO rows + aggregated totals.
//
// Mock mode: searches MOCK_PURCHASE_ORDERS (client-side store may have diverged due to
// in-session mutations — replace with prisma query when DB is connected).

import { NextRequest, NextResponse } from 'next/server'
import { MOCK_PURCHASE_ORDERS } from '@/lib/mock/procurement-data'
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

    const skuLower = sku.toLowerCase()
    const matches: SKUSearchMatch[] = []
    let productName  = ''
    let productBrand = ''
    let productImage = ''

    for (const po of MOCK_PURCHASE_ORDERS) {
      for (const line of po.lineItems) {
        if (!line.productSku.toLowerCase().includes(skuLower)) continue

        // Capture product metadata from the first match
        if (!productName) {
          productName  = line.productName
          productBrand = line.productBrand
          productImage = line.productImage
        }

        matches.push({
          poId:        po.id,
          poNumber:    po.poNumber,
          projectName: po.projectName,
          vendorName:  po.vendorName,
          status:      po.status,
          lineItemId:  line.id,
          qtyOrdered:  line.qtyOrdered,
          qtyReceived: line.qtyReceived,
          qtyPending:  line.qtyOrdered - line.qtyReceived,
        })
      }
    }

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
