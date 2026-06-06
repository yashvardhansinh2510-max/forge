// POST /api/follow-ups/from-quotation
//
// Upsert a follow-up record when a POS quotation is saved or revised.
// - If no follow-up exists for quotationId → create with status QUOTATION_SENT.
// - If one exists (not won/lost) → update value, revision number, updatedAt.
// - Never creates duplicates.
//
// POST /api/follow-ups/from-quotation/convert
// Handled in the nested [action] route below — or call PATCH /api/follow-ups/[id].

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { writeAuditLog, getCurrentUser } from '@/lib/auth'
import {
  upsertFollowUpFromQuotation,
  convertFollowUpByQuotationId,
} from '@/lib/mock/followup-data'

const UpsertSchema = z.object({
  quotationId:      z.string().min(1),
  quotationNumber:  z.string().min(1),
  quotationValue:   z.number().nonnegative(),
  revisionNumber:   z.number().int().min(0),
  customerName:     z.string().min(1),
  customerPhone:    z.string().default(''),
  projectName:      z.string().optional(),
  brandsInterested: z.array(z.string()).default([]),
  assignedTo:       z.string().optional(),
})

const ConvertSchema = z.object({
  quotationId: z.string().min(1),
})

// ── POST /api/follow-ups/from-quotation ───────────────────────────────────────
// Body: UpsertSchema  — creates or updates follow-up

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const actor = await getCurrentUser()
    const body = await req.json() as unknown

    // Detect convert action
    if ((body as Record<string, unknown>).action === 'convert') {
      const { quotationId } = ConvertSchema.parse(body)

      // Try DB first
      const existing = await prisma.followUp.findFirst({
        where: { quotationId },
        select: { id: true, status: true },
      })
      if (existing) {
        const updated = await prisma.followUp.update({
          where: { id: existing.id },
          data:  { status: 'WON', updatedAt: new Date() },
          include: { responses: true },
        })
        await writeAuditLog({
          actorId:       actor?.id ?? null,
          action:        'FOLLOWUP_CLOSED',
          category:      'FOLLOWUPS',
          entityType:    'FollowUp',
          entityId:      updated.id,
          beforeSnapshot: { status: existing.status },
          afterSnapshot:  { status: 'WON', source: 'place-order' },
        })
        return NextResponse.json({ followUp: updated })
      }

      // Fall back to mock
      const fu = convertFollowUpByQuotationId(quotationId)
      return NextResponse.json({ followUp: fu ?? null })
    }

    // Upsert path
    const data = UpsertSchema.parse(body)

    // Try DB first
    const existing = await prisma.followUp.findFirst({
      where: { quotationId: data.quotationId },
      select: { id: true, status: true },
    })

    if (existing) {
      // Don't touch closed follow-ups
      if (existing.status === 'WON' || existing.status === 'LOST') {
        return NextResponse.json({ followUp: existing })
      }

      const updated = await prisma.followUp.update({
        where: { id: existing.id },
        data: {
          quotationValue:  data.quotationValue,
          quotationNumber: data.quotationNumber,
          revisionNumber:  data.revisionNumber,
          updatedAt:       new Date(),
        },
        include: { responses: true },
      })

      await writeAuditLog({
        actorId:       actor?.id ?? null,
        action:        'FOLLOWUP_UPDATED',
        category:      'FOLLOWUPS',
        entityType:    'FollowUp',
        entityId:      updated.id,
        afterSnapshot: { quotationValue: data.quotationValue, revisionNumber: data.revisionNumber, source: 'pos-save' },
      })

      return NextResponse.json({ followUp: updated }, { status: 200 })
    }

    // Create new follow-up in DB
    try {
      const fu = await prisma.followUp.create({
        data: {
          type:             'QUOTATION',
          customerName:     data.customerName,
          customerPhone:    data.customerPhone,
          customerType:     'BUILDER',
          brandsInterested: data.brandsInterested,
          projectName:      data.projectName ?? null,
          quotationId:      data.quotationId,
          quotationNumber:  data.quotationNumber,
          quotationValue:   data.quotationValue,
          revisionNumber:   data.revisionNumber,
          status:           'PENDING',
          nextFollowUpDate: new Date(Date.now() + 3 * 86_400_000),
          assignedTo:       data.assignedTo ?? null,
        },
        include: { responses: true },
      })

      await writeAuditLog({
        actorId:       actor?.id ?? null,
        action:        'FOLLOWUP_CREATED',
        category:      'FOLLOWUPS',
        entityType:    'FollowUp',
        entityId:      fu.id,
        afterSnapshot: { source: 'pos-save', quotationNumber: data.quotationNumber },
      })

      return NextResponse.json({ followUp: fu }, { status: 201 })
    } catch {
      // DB not available — fall back to mock in-memory store
      const fu = upsertFollowUpFromQuotation({
        quotationId:      data.quotationId,
        quotationNumber:  data.quotationNumber,
        quotationValue:   data.quotationValue,
        revisionNumber:   data.revisionNumber,
        customerName:     data.customerName,
        customerPhone:    data.customerPhone,
        projectName:      data.projectName,
        brandsInterested: data.brandsInterested,
        assignedTo:       data.assignedTo,
      })
      return NextResponse.json({ followUp: fu }, { status: 201 })
    }
  })
}
