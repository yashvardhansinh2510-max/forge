// GET /api/purchase-orders/lines/[lineId]/timeline
// Merges StageMovement + Transfer + POLineItemNote into a unified timeline.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export type TimelineEventType =
  | 'stage_move'
  | 'transfer'
  | 'note'
  | 'followup_change'
  | 'assignment'
  | 'priority_change'

export interface TimelineEvent {
  id:        string
  type:      TimelineEventType
  timestamp: string
  userName:  string
  title:     string
  body?:     string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params

    const [movements, transfers, notesRaw] = await Promise.all([
      prisma.stageMovement.findMany({
        where: { poLineItemId: lineId },
        orderBy: { movedAt: 'desc' },
        select: {
          id: true,
          fromStage: true,
          toStage: true,
          qty: true,
          note: true,
          movedAt: true,
          movedBy: { select: { name: true } },
        },
      }),

      prisma.transfer.findMany({
        where: { poLineItemId: lineId },
        orderBy: { transferredAt: 'desc' },
        select: {
          id: true,
          fromCustomerName: true,
          toCustomerName: true,
          qty: true,
          stage: true,
          notes: true,
          transferredAt: true,
          transferredBy: { select: { name: true } },
        },
      }),

      // Notes via raw query (new model — may not exist in generated client yet)
      prisma.$queryRaw<Array<{
        id: string
        content: string
        createdAt: Date
        userName: string
      }>>`
        SELECT n.id, n.content, n."createdAt", u.name AS "userName"
        FROM "POLineItemNote" n
        JOIN "User" u ON u.id = n."userId"
        WHERE n."lineItemId" = ${lineId}
        ORDER BY n."createdAt" DESC
      `.catch(() => [] as Array<{ id: string; content: string; createdAt: Date; userName: string }>),
    ])

    const events: TimelineEvent[] = [
      ...movements.map((m) => ({
        id:        `move-${m.id}`,
        type:      'stage_move' as const,
        timestamp: m.movedAt.toISOString(),
        userName:  m.movedBy.name,
        title:     `Moved ${m.qty} unit${m.qty !== 1 ? 's' : ''} → ${m.toStage.replace(/_/g, ' ')}`,
        body:      m.note ?? undefined,
      })),

      ...transfers.map((t) => ({
        id:        `xfer-${t.id}`,
        type:      'transfer' as const,
        timestamp: t.transferredAt.toISOString(),
        userName:  t.transferredBy.name,
        title:     `Transferred ${t.qty} unit${t.qty !== 1 ? 's' : ''} → ${t.toCustomerName}`,
        body:      t.notes ?? undefined,
      })),

      ...notesRaw.map((n) => ({
        id:        `note-${n.id}`,
        type:      'note' as const,
        timestamp: new Date(n.createdAt).toISOString(),
        userName:  n.userName,
        title:     'Note added',
        body:      n.content,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ events })
  })
}
