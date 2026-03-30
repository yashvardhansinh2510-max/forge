// GET /api/inventory-boxes — list all boxes with per-item status

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const projectId = req.nextUrl.searchParams.get('projectId')

    const boxes = await prisma.inventoryBox.findMany({
      where: projectId ? { projectId } : {},
      include: {
        project: { select: { id: true, clientName: true, siteAddress: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true, brand: true,
                imageUrl: true, unit: true,
              },
            },
          },
          orderBy: { lastUpdated: 'desc' },
        },
        po: { select: { id: true, poNumber: true, vendorName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(boxes)
  })
}
