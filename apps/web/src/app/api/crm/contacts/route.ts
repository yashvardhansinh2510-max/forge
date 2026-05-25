import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ApiContactOwner = { id: string; name: string }
export type ApiContactCompany = { id: string; name: string }

export type ApiContact = {
  id: string
  name: string
  title: string
  type: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  city: string | null
  area: string | null
  tags: string[]
  isActive: boolean
  createdAt: string
  lastActivityAt: string | null
  notes: string | null
  companyId: string | null
  company: ApiContactCompany | null
  owner: ApiContactOwner | null
}

export type ContactsListResponse = {
  contacts: ApiContact[]
  total: number
}

// ── Validation ─────────────────────────────────────────────────────────────────

const createContactSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['ARCHITECT', 'INTERIOR_DESIGNER', 'BUILDER', 'CONTRACTOR', 'RETAIL', 'INSTITUTIONAL']),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  title: z.string().optional().default(''),
  companyId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
})

// ── GET /api/crm/contacts ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const type = searchParams.get('type') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const skip = (page - 1) * limit

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(type && { type: type as never }),
    }

    const [raw, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    const contacts: ApiContact[] = raw.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      type: c.type,
      email: c.email,
      phone: c.phone,
      whatsapp: c.whatsapp,
      city: c.city,
      area: c.area,
      tags: c.tags,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
      notes: c.notes,
      companyId: c.companyId,
      company: c.company ? { id: c.company.id, name: c.company.name } : null,
      owner: c.owner ? { id: c.owner.id, name: c.owner.name } : null,
    }))

    return NextResponse.json({ contacts, total } satisfies ContactsListResponse)
  })
}

// ── POST /api/crm/contacts ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as unknown
    const data = createContactSchema.parse(body)

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        title: data.title,
        type: data.type,
        phone: data.phone,
        email: data.email ?? null,
        whatsapp: data.whatsapp ?? null,
        city: data.city ?? null,
        area: data.area ?? null,
        tags: data.tags,
        notes: data.notes ?? null,
        companyId: data.companyId ?? null,
        ownerId: data.ownerId ?? null,
        isActive: true,
      },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    const result: ApiContact = {
      id: contact.id,
      name: contact.name,
      title: contact.title,
      type: contact.type,
      email: contact.email,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      city: contact.city,
      area: contact.area,
      tags: contact.tags,
      isActive: contact.isActive,
      createdAt: contact.createdAt.toISOString(),
      lastActivityAt: contact.lastActivityAt?.toISOString() ?? null,
      notes: contact.notes,
      companyId: contact.companyId,
      company: contact.company ? { id: contact.company.id, name: contact.company.name } : null,
      owner: contact.owner ? { id: contact.owner.id, name: contact.owner.name } : null,
    }

    return NextResponse.json({ contact: result }, { status: 201 })
  })
}
