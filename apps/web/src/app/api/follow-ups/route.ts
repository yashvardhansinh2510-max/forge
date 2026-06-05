import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { followUps as mockFollowUps } from '@/lib/mock/followup-data'
import { getCurrentUser, writeAuditLog } from '@/lib/auth'

// ── Types ──────────────────────────────────────────────────────────────────────

export type FollowUpResponseItem = {
  id: string
  date: string
  method: string
  outcome: string
  nextAction: string | null
  staffMember: string
}

export type FollowUpItem = {
  id: string
  type: string
  customerName: string
  customerPhone: string
  customerType: string
  brandsInterested: string[]
  productsNoted: string | null
  estimatedBudget: number | null
  projectName: string | null
  quotationId: string | null
  quotationNumber: string | null
  quotationValue: number | null
  status: string
  nextFollowUpDate: string
  lastContactedAt: string | null
  notes: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  responses: FollowUpResponseItem[]
}

export type FollowUpsListResponse = {
  followUps: FollowUpItem[]
  kpis: {
    active: number
    overdue: number
    wonThisMonth: number
    wonValueThisMonth: number
    lostThisMonth: number
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

const createFollowUpSchema = z.object({
  type: z.enum(['WALK_IN', 'QUOTATION']).default('WALK_IN'),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerType: z.enum(['ARCHITECT', 'INTERIOR_DESIGNER', 'BUILDER', 'RETAIL', 'OTHER']).default('RETAIL'),
  brandsInterested: z.array(z.string()).default([]),
  productsNoted: z.string().optional(),
  estimatedBudget: z.number().optional(),
  projectName: z.string().optional(),
  quotationId: z.string().optional(),
  quotationNumber: z.string().optional(),
  quotationValue: z.number().optional(),
  status: z.enum(['PENDING', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'WON', 'LOST']).default('PENDING'),
  nextFollowUpDate: z.string(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
})

// ── GET /api/follow-ups ────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  return withErrorHandling(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const all = await prisma.followUp.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        responses: { orderBy: { date: 'desc' } },
      },
    })

    // If DB is empty, serve mock data
    if (all.length === 0) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const mockActive = mockFollowUps.filter((f) => f.status !== 'won' && f.status !== 'lost')
      const mockOverdue = mockActive.filter((f) => f.nextFollowUpDate < now)
      const mockWonMonth = mockFollowUps.filter((f) => f.status === 'won' && f.updatedAt >= startOfMonth)
      const mockLostMonth = mockFollowUps.filter((f) => f.status === 'lost' && f.updatedAt >= startOfMonth)
      const mockWonValue = mockWonMonth.reduce((s, f) => s + (f.quotationValue ?? f.estimatedBudget ?? 0), 0)

      const followUps: FollowUpItem[] = mockFollowUps.map((f) => ({
        id: f.id,
        type: f.type.toUpperCase(),
        customerName: f.customerName,
        customerPhone: f.customerPhone,
        customerType: f.customerType.toUpperCase(),
        brandsInterested: f.brandsInterested as string[],
        productsNoted: f.productsNoted ?? null,
        estimatedBudget: f.estimatedBudget ?? null,
        projectName: f.projectName ?? null,
        quotationId: f.quotationId ?? null,
        quotationNumber: f.quotationNumber ?? null,
        quotationValue: f.quotationValue ?? null,
        status: f.status.toUpperCase(),
        nextFollowUpDate: f.nextFollowUpDate.toISOString(),
        lastContactedAt: f.lastContactedAt?.toISOString() ?? null,
        notes: f.notes ?? null,
        assignedTo: f.assignedTo ?? null,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        responses: f.responses.map((r) => ({
          id: r.id,
          date: r.date.toISOString(),
          method: r.method.toUpperCase(),
          outcome: r.outcome,
          nextAction: r.nextAction ?? null,
          staffMember: r.staffMember,
        })),
      }))

      return NextResponse.json({
        followUps,
        kpis: {
          active: mockActive.length,
          overdue: mockOverdue.length,
          wonThisMonth: mockWonMonth.length,
          wonValueThisMonth: mockWonValue,
          lostThisMonth: mockLostMonth.length,
        },
      } satisfies FollowUpsListResponse)
    }

    // KPI computation
    const active = all.filter((f) => f.status !== 'WON' && f.status !== 'LOST')
    const overdue = active.filter((f) => f.nextFollowUpDate < now)
    const wonMonth = all.filter((f) => f.status === 'WON' && f.updatedAt >= startOfMonth)
    const lostMonth = all.filter((f) => f.status === 'LOST' && f.updatedAt >= startOfMonth)
    const wonValue = wonMonth.reduce((s, f) => s + (f.quotationValue ?? f.estimatedBudget ?? 0), 0)

    const followUps: FollowUpItem[] = all.map((f) => ({
      id: f.id,
      type: f.type,
      customerName: f.customerName,
      customerPhone: f.customerPhone,
      customerType: f.customerType,
      brandsInterested: f.brandsInterested,
      productsNoted: f.productsNoted,
      estimatedBudget: f.estimatedBudget,
      projectName: f.projectName,
      quotationId: f.quotationId,
      quotationNumber: f.quotationNumber,
      quotationValue: f.quotationValue,
      status: f.status,
      nextFollowUpDate: f.nextFollowUpDate.toISOString(),
      lastContactedAt: f.lastContactedAt?.toISOString() ?? null,
      notes: f.notes,
      assignedTo: f.assignedTo,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      responses: f.responses.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        method: r.method,
        outcome: r.outcome,
        nextAction: r.nextAction,
        staffMember: r.staffMember,
      })),
    }))

    return NextResponse.json({
      followUps,
      kpis: {
        active: active.length,
        overdue: overdue.length,
        wonThisMonth: wonMonth.length,
        wonValueThisMonth: wonValue,
        lostThisMonth: lostMonth.length,
      },
    } satisfies FollowUpsListResponse)
  })
}

// ── POST /api/follow-ups ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const actor = await getCurrentUser()
    const body = await request.json() as unknown
    const data = createFollowUpSchema.parse(body)

    const followUp = await prisma.followUp.create({
      data: {
        type: data.type,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerType: data.customerType,
        brandsInterested: data.brandsInterested,
        productsNoted: data.productsNoted ?? null,
        estimatedBudget: data.estimatedBudget ?? null,
        projectName: data.projectName ?? null,
        quotationId: data.quotationId ?? null,
        quotationNumber: data.quotationNumber ?? null,
        quotationValue: data.quotationValue ?? null,
        status: data.status,
        nextFollowUpDate: new Date(data.nextFollowUpDate),
        notes: data.notes ?? null,
        assignedTo: data.assignedTo ?? null,
      },
      include: { responses: true },
    })

    await writeAuditLog({
      actorId: actor?.id ?? null,
      action: 'FOLLOWUP_CREATED',
      category: 'FOLLOWUPS',
      entityType: 'FollowUp',
      entityId: followUp.id,
      afterSnapshot: { customerName: data.customerName, status: data.status, type: data.type },
    })

    return NextResponse.json({ followUp }, { status: 201 })
  })
}
