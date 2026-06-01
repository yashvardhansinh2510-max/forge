import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

const ContactPatchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  companyId: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['ARCHITECT', 'INTERIOR_DESIGNER', 'BUILDER', 'CONTRACTOR', 'RETAIL', 'INSTITUTIONAL']).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'View')
    const { id } = await params

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { company: true },
    })

    if (!contact) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(contact)
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'Edit')
    const { id } = await params
    const body = ContactPatchSchema.parse(await req.json())

    const contact = await prisma.contact.update({ where: { id }, data: body })
    return NextResponse.json(contact)
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'Delete')
    const { id } = await params

    await prisma.contact.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  })
}
