import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import type { CustomerOption } from '@/lib/purchases-tracker'

// Returns every POLineItem for this product (excluding the calling line) with
// the customer name and lineId so TransferPopover can pick a destination.
// Supports both PROJECT_LINKED (project.clientName) and BULK_COMPANY (po.customerName).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id: productId } = await params
    const excludeLineId = req.nextUrl.searchParams.get('excludeLineId') ?? ''

    const lines = await prisma.pOLineItem.findMany({
      where: { productId },
      select: {
        id: true,
        po: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
            project: {
              select: { id: true, clientName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result: CustomerOption[] = []

    for (const line of lines) {
      if (line.id === excludeLineId) continue

      const customerName = line.po.project?.clientName ?? line.po.customerName
      if (!customerName) continue

      // Use project ID for PROJECT_LINKED, PO ID for BULK_COMPANY (stable per PO)
      const customerId = line.po.project?.id ?? line.po.id

      result.push({
        id: customerId,
        name: customerName,
        lineId: line.id,
      })
    }

    result.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(result)
  })
}
