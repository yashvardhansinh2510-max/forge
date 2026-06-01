import { NextResponse } from 'next/server'
import { prisma, ProjectStatus } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser } from '@/lib/auth'

export async function GET() {
  return withErrorHandling(async () => {
    await requireUser()

    const [activeProjects, completedProjects, projects] = await Promise.all([
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
      prisma.project.findMany({
        where: {
          status: {
            notIn: ['CLOSED', 'COMPLETED']
          }
        },
        select: {
          quotationValue: true,
          purchaseValue: true,
          paymentReceived: true,
          outstandingAmount: true
        }
      })
    ])

    const pipelineValue = projects.reduce((acc, p) => acc + (p.quotationValue || 0), 0)

    return NextResponse.json({
      activeProjects,
      completedProjects,
      pipelineValue
    })
  })
}
