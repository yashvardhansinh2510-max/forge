// PATCH /api/purchase-orders/lines/[lineId]/assign — set assignedToId and/or priority

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'
import { z } from 'zod'

const AssignSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const role = await getCurrentRole().catch(() => 'READ_ONLY' as const)
    if (!hasPermission(role, 'can_assign')) {
      return NextResponse.json({ error: 'Forbidden', required: 'can_assign' }, { status: 403 })
    }

    const { lineId } = await params
    const body = await req.json()
    const parsed = AssignSchema.parse(body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.pOLineItem as any).update({
      where: { id: lineId },
      data: {
        ...(parsed.assignedToId !== undefined && { assignedToId: parsed.assignedToId }),
        ...(parsed.priority !== undefined && { priority: parsed.priority }),
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma.pOLineItem as any).findUnique({
      where: { id: lineId },
      select: {
        id: true,
        priority: true,
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ line: updated })
  })
}
