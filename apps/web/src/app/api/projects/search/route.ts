import { NextResponse } from 'next/server'
import { prisma, ProjectStatus } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser } from '@/lib/auth'

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    await requireUser()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    
    if (q.length < 2) {
      return NextResponse.json([])
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { projectName: { contains: q, mode: 'insensitive' } },
          { clientName: { contains: q, mode: 'insensitive' } },
          { siteAddress: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        projectName: true,
        clientName: true,
        status: true,
        health: true
      },
      take: 10,
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(projects)
  })
}
