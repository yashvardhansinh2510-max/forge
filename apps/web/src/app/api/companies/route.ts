import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

const CompanyCreateSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  website: z.string().url().optional(),
  address: z.string().optional(),
})

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'View')
    const search = req.nextUrl.searchParams.get('search')

    const companies = await prisma.company.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { contacts: true, projects: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(companies)
  })
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    await requirePermission('Contacts', 'Edit')
    const body = CompanyCreateSchema.parse(await req.json())

    const company = await prisma.company.create({ data: body })
    return NextResponse.json(company, { status: 201 })
  })
}
