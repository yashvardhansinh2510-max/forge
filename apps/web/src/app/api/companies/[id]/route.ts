import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

const CompanyPatchSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  website: z.string().url().nullable().optional(),
  address: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'View')
    const { id } = await params

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        contacts: { where: { isActive: true } },
        projects: { select: { id: true, projectName: true, status: true } },
      },
    })

    if (!company) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(company)
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'Edit')
    const { id } = await params
    const body = CompanyPatchSchema.parse(await req.json())

    const company = await prisma.company.update({ where: { id }, data: body })
    return NextResponse.json(company)
  })
}
