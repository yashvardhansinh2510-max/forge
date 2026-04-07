// GET /api/quotations/pending-po
// Returns LOCKED/FINALIZED revisions that have no purchase order yet.
// Used by the quotations page "Ready to Order" banner.

import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET() {
  try {
    const revisions = await prisma.quotationRevision.findMany({
      where: {
        status: { in: ['LOCKED', 'FINALIZED'] },
        purchaseOrders: { none: {} },
      },
      include: {
        quotation: {
          include: {
            project: {
              include: { company: { select: { name: true } } },
            },
          },
        },
        rooms: {
          include: { items: { select: { id: true } } },
        },
      },
      orderBy: { lockedAt: 'desc' },
    })

    return NextResponse.json(
      revisions.map((r) => ({
        id:             r.id,
        number:         r.quotation.number,
        revisionNumber: r.revisionNumber,
        clientName:     r.quotation.project.company?.name ?? r.quotation.project.clientName,
        itemCount:      r.rooms.flatMap((room) => room.items).length,
        lockedAt:       r.lockedAt,
      })),
    )
  } catch (err) {
    console.error('[pending-po]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch pending PO revisions' },
      { status: 500 },
    )
  }
}
