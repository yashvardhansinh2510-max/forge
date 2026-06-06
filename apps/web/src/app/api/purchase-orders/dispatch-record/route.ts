import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export interface DispatchRecordEntry {
  id: string
  movedAt: string
  customerName: string | null
  productName: string
  productSku: string
  productBrand: string
  qty: number
  challan: string | null
  movedByName: string
  poNumber: string
}

export async function GET() {
  return withErrorHandling(async () => {
    const movements = await prisma.stageMovement.findMany({
      where: { toStage: 'DISPATCHED' },
      orderBy: { movedAt: 'desc' },
      take: 500,
      include: {
        movedBy: { select: { name: true } },
        poLineItem: {
          include: {
            product: { select: { name: true, sku: true, brand: true } },
            po: {
              select: {
                poNumber: true,
                customerName: true,
                project: { select: { clientName: true } },
              },
            },
          },
        },
      },
    })

    const entries: DispatchRecordEntry[] = movements.map((m) => {
      const customerName =
        m.poLineItem.po.project?.clientName ??
        m.poLineItem.po.customerName ??
        null

      // Extract challan from note field — stored as "Challan: BCH-DC-2026-089"
      const challan = m.note ? m.note.replace(/^Challan:\s*/i, '').replace(/\s*\|.*$/, '').trim() || null : null

      return {
        id: m.id,
        movedAt: m.movedAt.toISOString(),
        customerName,
        productName: m.poLineItem.product.name,
        productSku: m.poLineItem.product.sku,
        productBrand: m.poLineItem.product.brand,
        qty: m.qty,
        challan,
        movedByName: m.movedBy.name,
        poNumber: m.poLineItem.po.poNumber,
      }
    })

    return NextResponse.json({ entries })
  })
}
