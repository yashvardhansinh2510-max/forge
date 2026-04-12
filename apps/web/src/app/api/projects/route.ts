import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export async function GET() {
  return withErrorHandling(async () => {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        clientName: true,
        siteAddress: true,
        architectName: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  })
}
