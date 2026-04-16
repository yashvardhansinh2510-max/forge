import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'

const patchSchema = z.object({
  status: z.enum(['PENDING', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'WON', 'LOST']).optional(),
  nextFollowUpDate: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  // Add a response in the same PATCH
  response: z.object({
    date: z.string(),
    method: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'VISIT']),
    outcome: z.string(),
    nextAction: z.string().optional(),
    staffMember: z.string(),
  }).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = await req.json() as unknown
    const data = patchSchema.parse(body)

    const existing = await prisma.followUp.findUnique({ where: { id } })
    if (!existing) throw new AppError('NOT_FOUND', 'Follow-up not found', 404)

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.nextFollowUpDate !== undefined && { nextFollowUpDate: new Date(data.nextFollowUpDate) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.response !== undefined && {
          lastContactedAt: new Date(data.response.date),
          responses: {
            create: {
              date: new Date(data.response.date),
              method: data.response.method,
              outcome: data.response.outcome,
              nextAction: data.response.nextAction ?? null,
              staffMember: data.response.staffMember,
            },
          },
        }),
      },
      include: { responses: { orderBy: { date: 'desc' } } },
    })

    return NextResponse.json({ followUp: updated })
  })
}
