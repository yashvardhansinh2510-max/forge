import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { getFallbackLines, shouldUseFallback } from '@/lib/purchases-fallback'
import {
  computeBrandCounts,
  computeHeaderCounts,
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
    project: {
      id: string
      clientName: string
      siteAddress: string | null
    } | null
  }
}): PurchaseTrackerLine {
  return {
    id: line.id,
    poId: line.poId,
    poNumber: line.po.poNumber,
    vendorName: line.po.vendorName,
    projectId: line.po.project?.id ?? null,
    customer: line.po.project
      ? {
          id: line.po.project.id,
          name: line.po.project.clientName,
          siteAddress: line.po.project.siteAddress,
        }
      : null,
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
  }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const activeBrand = normalizeBrandTab(req.nextUrl.searchParams.get('brand'))

    try {
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
        orderBy: [
          { createdAt: 'desc' },
        ],
      })

      const allLines = dbLines.map(mapLine)
      const filteredLines = activeBrand === 'ALL'
        ? allLines
        : allLines.filter((line) => matchesBrandTab(line.product.brand, activeBrand))

      return NextResponse.json({
        lines: filteredLines,
        headerCounts: computeHeaderCounts(filteredLines),
        brandCounts: computeBrandCounts(allLines),
      })
    } catch (error) {
      if (shouldUseFallback(error)) {
        return NextResponse.json(getFallbackLines(activeBrand))
      }

      throw error
    }
  })
}
