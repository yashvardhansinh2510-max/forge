// POST /api/purchase-orders/bulk-action — perform a bulk operation on multiple line items

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'
import { z } from 'zod'

const STAGE_FIELD = {
  CO_BILLING: 'qtyPendingCo',
  INBOX:      'qtyAtGodown',
  DISPATCHED: 'qtyInBox',
  COMPLETED:  'qtyDispatched',
} as const

type ToStage = keyof typeof STAGE_FIELD

const BulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    action:       z.literal('assign'),
    lineIds:      z.array(z.string()).min(1).max(200),
    assignedToId: z.string().nullable(),
  }),
  z.object({
    action:   z.literal('priority'),
    lineIds:  z.array(z.string()).min(1).max(200),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  }),
  z.object({
    action:    z.literal('move_stage'),
    lineIds:   z.array(z.string()).min(1).max(200),
    fromStage: z.enum(['ORDER_IN_CO', 'CO_BILLING', 'INBOX', 'DISPATCHED']),
    toStage:   z.enum(['CO_BILLING', 'INBOX', 'DISPATCHED', 'COMPLETED']),
    qty:       z.number().int().min(1),
  }),
])

const FROM_STAGE_FIELD: Partial<Record<string, string>> = {
  CO_BILLING: 'qtyPendingCo',
  INBOX:      'qtyAtGodown',
  DISPATCHED: 'qtyInBox',
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const role = await getCurrentRole().catch(() => 'READ_ONLY' as const)
    if (!hasPermission(role, 'can_bulk_action')) {
      return NextResponse.json({ error: 'Forbidden', required: 'can_bulk_action' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = BulkActionSchema.parse(body)

    switch (parsed.action) {
      case 'assign': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.pOLineItem as any).updateMany({
          where: { id: { in: parsed.lineIds } },
          data:  { assignedToId: parsed.assignedToId },
        })
        return NextResponse.json({ updated: parsed.lineIds.length })
      }

      case 'priority': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.pOLineItem as any).updateMany({
          where: { id: { in: parsed.lineIds } },
          data:  { priority: parsed.priority },
        })
        return NextResponse.json({ updated: parsed.lineIds.length })
      }

      case 'move_stage': {
        if (parsed.fromStage === parsed.toStage) {
          return NextResponse.json({ error: 'Cannot move to same stage' }, { status: 400 })
        }
        const destField = STAGE_FIELD[parsed.toStage as ToStage]
        const srcField  = FROM_STAGE_FIELD[parsed.fromStage]

        // Individual updates: safe ORM calls, no dynamic SQL
        await prisma.$transaction(
          parsed.lineIds.flatMap((lineId) => {
            const ops: ReturnType<typeof prisma.pOLineItem.update>[] = []
            if (srcField) {
              ops.push(prisma.pOLineItem.update({
                where: { id: lineId },
                data:  { [srcField]: { decrement: parsed.qty } },
              }))
            }
            ops.push(prisma.pOLineItem.update({
              where: { id: lineId },
              data:  { [destField]: { increment: parsed.qty } },
            }))
            return ops
          })
        )

        return NextResponse.json({ updated: parsed.lineIds.length })
      }
    }
  })
}
