import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

const ContactCreateSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  companyId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['ARCHITECT', 'INTERIOR_DESIGNER', 'BUILDER', 'CONTRACTOR', 'RETAIL', 'INSTITUTIONAL']).default('ARCHITECT'),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'View')
    const search = req.nextUrl.searchParams.get('search')
    const type = req.nextUrl.searchParams.get('type')

    const contacts = await prisma.contact.findMany({
      where: {
        isActive: true,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(type && { type: type as any }),
      },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contacts)
  })
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'Edit')
    const body = ContactCreateSchema.parse(await req.json())

    const contact = await prisma.contact.create({ data: body })
    return NextResponse.json(contact, { status: 201 })
  })
}
