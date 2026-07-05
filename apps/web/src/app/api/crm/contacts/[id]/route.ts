import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { AppError } from '@/lib/errors'
import { withErrorHandling } from '@/lib/api-helpers'
import type { ApiContact } from '../route'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContactFollowUp = {
  id: string
  type: string
  status: string
  customerName: string
  customerPhone: string
  projectName: string | null
  quotationNumber: string | null
  estimatedBudget: number | null
  nextFollowUpDate: string
  notes: string | null
  createdAt: string
}

export type ContactActivity = {
  id: string
  type: string
  description: string
  createdAt: string
}

export type ContactDetailResponse = {
  contact: ApiContact
  followUps: ContactFollowUp[]
  activities: ContactActivity[]
  deals: never[]
}

// ── GET /api/crm/contacts/[id] ─────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    const raw = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    if (!raw) {
      throw new AppError('NOT_FOUND', 'Contact not found', 404)
    }

    const contact: ApiContact = {
      id: raw.id,
      name: raw.name,
      title: raw.title,
      type: raw.type,
      email: raw.email,
      phone: raw.phone,
      whatsapp: raw.whatsapp,
      city: raw.city,
      area: raw.area,
      tags: raw.tags,
      isActive: raw.isActive,
      createdAt: raw.createdAt.toISOString(),
      lastActivityAt: raw.lastActivityAt?.toISOString() ?? null,
      notes: raw.notes,
      companyId: raw.companyId,
      company: raw.company ? { id: raw.company.id, name: raw.company.name } : null,
      owner: raw.owner ? { id: raw.owner.id, name: raw.owner.name } : null,
    }

    const [rawActivities, rawFollowUps] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      raw.phone
        ? prisma.followUp.findMany({
            where: { customerPhone: raw.phone },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),
    ])

    const activities: ContactActivity[] = rawActivities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    }))

    const followUps: ContactFollowUp[] = rawFollowUps.map((f) => ({
      id: f.id,
      type: f.type,
      status: f.status,
      customerName: f.customerName,
      customerPhone: f.customerPhone,
      projectName: f.projectName,
      quotationNumber: f.quotationNumber,
      estimatedBudget: f.estimatedBudget,
      nextFollowUpDate: f.nextFollowUpDate.toISOString(),
      notes: f.notes,
      createdAt: f.createdAt.toISOString(),
    }))

    return NextResponse.json({
      contact,
      activities,
      followUps,
      deals: [],
    } satisfies ContactDetailResponse)
  })
}
