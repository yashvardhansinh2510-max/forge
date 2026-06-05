// POST /api/quotations/[id]/revise
// Creates a new DRAFT revision from an existing revision (usually a locked one).
// Copies all rooms + items. Increments revisionNumber.
// [id] = revisionId to fork from (the source revision).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const actor = await getCurrentUser()

    // Load source revision with all rooms + items
    const source = await prisma.quotationRevision.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { order: 'asc' },
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    if (!source) {
      return NextResponse.json({ message: 'Source revision not found' }, { status: 404 })
    }

    // Determine next revision number
    const maxRev = await prisma.quotationRevision.aggregate({
      where: { quotationId: source.quotationId },
      _max: { revisionNumber: true },
    })
    const nextRevNumber = (maxRev._max.revisionNumber ?? 0) + 1

    // Create the new revision + copy rooms + items in a transaction
    const newRevision = await prisma.$transaction(async (tx) => {
      const rev = await tx.quotationRevision.create({
        data: {
          quotationId:       source.quotationId,
          revisionNumber:    nextRevNumber,
          status:            'DRAFT',
          isLocked:          false,
          globalDiscountPct: source.globalDiscountPct,
          notes:             source.notes ? `Rev ${nextRevNumber} — copied from Rev ${source.revisionNumber}` : undefined,
        },
      })

      for (const room of source.rooms) {
        const newRoom = await tx.quotationRoom.create({
          data: {
            revisionId: rev.id,
            roomName:   room.roomName,
            order:      room.order,
          },
        })
        for (const item of room.items) {
          await tx.quotationItem.create({
            data: {
              roomId:         newRoom.id,
              productId:      item.productId,
              quantity:       item.quantity,
              mrp:            item.mrp,
              discountPct:    item.discountPct,
              offerRate:      item.offerRate,
              totalOffer:     item.totalOffer,
              selectedFinish: item.selectedFinish,
              selectedColor:  item.selectedColor,
              sortOrder:      item.sortOrder,
            },
          })
        }
      }

      return rev
    })

    await writeAuditLog({
      actorId:       actor?.id ?? null,
      action:        'QUOTATION_REVISED',
      category:      'QUOTATIONS',
      entityType:    'QuotationRevision',
      entityId:      newRevision.id,
      afterSnapshot: {
        quotationId:    source.quotationId,
        sourceRevId:    source.id,
        sourceRevNo:    source.revisionNumber,
        newRevId:       newRevision.id,
        newRevNo:       nextRevNumber,
      },
    })

    return NextResponse.json(
      {
        revisionId:     newRevision.id,
        revisionNumber: nextRevNumber,
        quotationId:    source.quotationId,
      },
      { status: 201 },
    )
  })
}
