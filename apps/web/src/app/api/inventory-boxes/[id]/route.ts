// GET /api/inventory-boxes/[id] — box detail with all items + dispatch status

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { NotFoundError } from '@/lib/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const box = await prisma.inventoryBox.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, clientName: true, siteAddress: true } },
        po: { select: { id: true, poNumber: true, vendorName: true, status: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true, brand: true,
                category: true, imageUrl: true, unit: true,
              },
            },
            quotationItem: {
              select: { id: true, quantity: true, selectedFinish: true, offerRate: true },
            },
          },
          orderBy: { lastUpdated: 'desc' },
        },
      },
    })

    if (!box) throw new NotFoundError('InventoryBox', id)

    return NextResponse.json(box)
  })
}
