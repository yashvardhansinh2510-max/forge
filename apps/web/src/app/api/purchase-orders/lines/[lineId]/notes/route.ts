// POST /api/purchase-orders/lines/[lineId]/notes — add a note to a line item
// GET  /api/purchase-orders/lines/[lineId]/notes — list notes for a line item

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { auth } from '@clerk/nextjs/server'
import { getDevUserId } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'
import { z } from 'zod'

const CreateNoteSchema = z.object({
  content: z.string().min(1).max(2000),
})

async function resolveUserId(): Promise<string> {
  try {
    const { userId } = await auth()
    if (!userId) return getDevUserId()
    const user = await prisma.user.findFirst({ where: { clerkId: userId }, select: { id: true } })
    return user?.id ?? getDevUserId()
  } catch {
    return getDevUserId()
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    // Auth required — notes may contain sensitive business context
    const role = await getCurrentRole().catch(() => 'READ_ONLY' as const)
    if (!hasPermission(role, 'can_add_notes') && role === 'READ_ONLY') {
      return NextResponse.json({ notes: [] })
    }

    const { lineId } = await params

    const notes = await prisma.$queryRaw<Array<{
      id: string
      content: string
      createdAt: Date
      userId: string
      userName: string
    }>>`
      SELECT n.id, n.content, n."createdAt", n."userId", u.name AS "userName"
      FROM "POLineItemNote" n
      JOIN "User" u ON u.id = n."userId"
      WHERE n."lineItemId" = ${lineId}
      ORDER BY n."createdAt" DESC
    `.catch(() => [] as Array<{ id: string; content: string; createdAt: Date; userId: string; userName: string }>)

    return NextResponse.json({
      notes: notes.map((n) => ({
        ...n,
        createdAt: new Date(n.createdAt).toISOString(),
      })),
    })
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const role = await getCurrentRole().catch(() => 'READ_ONLY' as const)
    if (!hasPermission(role, 'can_add_notes')) {
      return NextResponse.json({ error: 'Forbidden', required: 'can_add_notes' }, { status: 403 })
    }

    const { lineId } = await params
    const body = await req.json()
    const { content } = CreateNoteSchema.parse(body)

    const userId = await resolveUserId()

    // Insert and return the new row's id atomically via RETURNING
    const [inserted] = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "POLineItemNote" (id, "lineItemId", "userId", content, "createdAt")
      VALUES (gen_random_uuid(), ${lineId}, ${userId}, ${content}, NOW())
      RETURNING id
    `

    const [note] = await prisma.$queryRaw<Array<{
      id: string
      content: string
      createdAt: Date
      userName: string
    }>>`
      SELECT n.id, n.content, n."createdAt", u.name AS "userName"
      FROM "POLineItemNote" n
      JOIN "User" u ON u.id = n."userId"
      WHERE n.id = ${inserted?.id}
    `

    return NextResponse.json({
      note: note ? { ...note, createdAt: new Date(note.createdAt).toISOString() } : null,
    }, { status: 201 })
  })
}
