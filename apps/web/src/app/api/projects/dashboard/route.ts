import { NextResponse } from 'next/server'
import { prisma, ProjectStatus } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser } from '@/lib/auth'

export async function GET() {
  return withErrorHandling(async () => {
    await requireUser()

    const [activeProjects, completedProjects, salesAgg] = await Promise.all([
      prisma.project.count({
        where: {
          status: {
            in: ['LEAD', 'QUOTED', 'NEGOTIATION', 'ORDERED', 'IN_PROGRESS', 'DISPATCHED']
          }
        }
      }),
      prisma.project.count({
        where: { status: 'COMPLETED' }
      }),
      // Compute pipeline value live from SalesOrders linked to active projects
      prisma.salesOrder.aggregate({
        _sum: { offerTotal: true },
        where: {
          project: {
            status: { notIn: ['CLOSED', 'COMPLETED'] }
          },
          projectId: { not: null }
        }
      })
    ])

    const pipelineValue = (salesAgg._sum.offerTotal as number | null) ?? 0

    return NextResponse.json({
      activeProjects,
      completedProjects,
      pipelineValue
    })
  })
}
