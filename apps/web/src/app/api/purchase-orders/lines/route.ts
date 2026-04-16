import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import {
  computeBrandCounts,
  countsFromDbLine,
  matchesBrandTab,
  normalizeBrandTab,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

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
      imageUrl: line.product.imageUrl,
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
            id: true,
            sku: true,
            name: true,
            brand: true,
            imageUrl: true,
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

    const agg = await prisma.pOLineItem.aggregate({
      _sum: {
        qtyOrdered: true,
        qtyPendingCo: true,
        qtyPendingDist: true,
        qtyAtGodown: true,
        qtyInBox: true,
        qtyDispatched: true,
        qtyNotDisplayed: true,
      },
    })
    const headerCounts = {
      UNALLOCATED:   agg._sum.qtyOrdered      ?? 0,
      PENDING_CO:    agg._sum.qtyPendingCo    ?? 0,
      PENDING_DIST:  agg._sum.qtyPendingDist  ?? 0,
      GODOWN:        agg._sum.qtyAtGodown     ?? 0,
      IN_BOX:        agg._sum.qtyInBox        ?? 0,
      DISPATCHED:    agg._sum.qtyDispatched   ?? 0,
      NOT_DISPLAYED: agg._sum.qtyNotDisplayed ?? 0,
    }
    return NextResponse.json({ lines: filteredLines, headerCounts, brandCounts: computeBrandCounts(allLines) })
  })
}
