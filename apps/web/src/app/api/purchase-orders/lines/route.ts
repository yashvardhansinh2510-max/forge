import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import fs from 'fs'
import path from 'path'
import {
  computeBrandCounts,
  computeHeaderCounts,
  countsFromDbLine,
  matchesBrandTab,
  normalizeBrandTab,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

let _imageMap: Map<string, string> | null = null
function getImageMap(): Map<string, string> {
  if (_imageMap) return _imageMap
  _imageMap = new Map()
  const files = [
    path.join(process.cwd(), '../../packages/db/data/catalog-import-2026-04-22.json'),
    path.join(process.cwd(), '../../packages/db/data/vitra-catalog-2026.json'),
  ]
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8')) as { products: { sku: string; image_url?: string | null }[] }
      for (const p of data.products) {
        if (p.image_url) _imageMap.set(p.sku, p.image_url)
      }
    } catch { /* ignore missing files */ }
  }
  return _imageMap
}

function mapLine(line: {
  id: string
  poId: string
  qtyOrdered: number
  qtyReceived: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
  followUpStatus: string | null
  product: {
    id: string
    sku: string
    name: string
    brand: string
    imageUrl: string | null
    seriesName: string | null
    finishName: string | null
    articleNumber: string | null
    mrp: number
    unit: string
    tier: string
  }
  po: {
    id: string
    poNumber: string
    vendorName: string | null
    customerName: string | null
    customerSiteAddress: string | null
    project: {
      id: string
      clientName: string
      siteAddress: string | null
    } | null
  }
}): PurchaseTrackerLine {
  const customer = line.po.project
    ? { id: line.po.project.id, name: line.po.project.clientName, siteAddress: line.po.project.siteAddress }
    : line.po.customerName
    ? { id: line.poId, name: line.po.customerName, siteAddress: line.po.customerSiteAddress }
    : null
  return {
    id: line.id,
    poId: line.poId,
    poNumber: line.po.poNumber,
    vendorName: line.po.vendorName,
    projectId: line.po.project?.id ?? null,
    customer,
    product: {
      id: line.product.id,
      sku: line.product.sku,
      name: line.product.name,
      brand: line.product.brand,
      imageUrl: line.product.imageUrl ?? getImageMap().get(line.product.sku) ?? null,
      seriesName: line.product.seriesName,
      finishName: line.product.finishName,
      articleNumber: line.product.articleNumber,
      mrp: line.product.mrp,
      unit: line.product.unit,
      tier: line.product.tier,
    },
    qtyOrdered: line.qtyOrdered,
    qtyReceived: line.qtyReceived,
    stages: countsFromDbLine(line),
    followUpStatus: line.followUpStatus,
  }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const activeBrand = normalizeBrandTab(req.nextUrl.searchParams.get('brand'))

    const dbLines = await prisma.pOLineItem.findMany({
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, brand: true,
            imageUrl: true, seriesName: true, finishName: true,
            articleNumber: true, mrp: true, unit: true, tier: true,
          },
        },
        po: {
          select: {
            id: true,
            poNumber: true,
            vendorName: true,
            customerName: true,
            customerSiteAddress: true,
            project: {
              select: {
                id: true,
                clientName: true,
                siteAddress: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    const allLines = dbLines.map(mapLine)
    const filteredLines = activeBrand === 'ALL'
      ? allLines
      : allLines.filter((line) => matchesBrandTab(line.product.brand, activeBrand))

    const headerCounts = computeHeaderCounts(allLines)
    return NextResponse.json({
      lines: filteredLines,
      headerCounts,
      brandCounts: computeBrandCounts(allLines),
      generatedAt: new Date().toISOString(),
    })
  })
}
