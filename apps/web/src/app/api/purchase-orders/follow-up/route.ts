// GET /api/purchase-orders/follow-up
// Returns all POLineItems where qtyDispatched > 0, enriched with customer + dispatch info.

import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET() {
  try {
    const lines = await prisma.pOLineItem.findMany({
      where: { qtyDispatched: { gt: 0 } },
      include: {
        product: { select: { sku: true, name: true, brand: true } },
        po: {
          include: {
            project: {
              include: { company: { select: { id: true, name: true } } },
            },
          },
        },
        stageMovements: {
          where: { toStage: 'DISPATCHED' },
          orderBy: { movedAt: 'desc' },
          take: 1,
          select: { movedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      lines.map((l) => ({
        id:             l.id,
        sku:            l.product.sku,
        productName:    l.product.name,
        brand:          l.product.brand,
        qtyDispatched:  l.qtyDispatched,
        followUpStatus: l.followUpStatus ?? 'AWAITING',
        dispatchedAt:   l.stageMovements[0]?.movedAt ?? null,
        customerId:     l.po.project?.company?.id    ?? l.po.project?.id    ?? null,
        customerName:   l.po.project?.company?.name  ?? l.po.project?.clientName ?? 'Bulk / Unassigned',
        poNumber:       l.po.poNumber,
      })),
    )
  } catch (err) {
    console.error('[follow-up]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch follow-up items' },
      { status: 500 },
    )
  }
}
