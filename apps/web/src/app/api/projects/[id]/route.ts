import { NextResponse } from 'next/server'
import { prisma, ProjectStatus, ProjectHealth } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    await requireUser()

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        quotations: {
          select: { id: true, number: true, currentStatus: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        purchaseOrders: {
          select: { id: true, poNumber: true, status: true, expectedDelivery: true, vendorName: true },
          orderBy: { createdAt: 'desc' }
        },
        salesOrders: {
          include: { payments: true },
          orderBy: { createdAt: 'desc' }
        },
        inventoryBoxes: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' }
        },
        stockMovements: {
          include: { product: true, fromWarehouse: true },
          orderBy: { createdAt: 'desc' }
        },
        followUps: {
          select: { id: true, status: true, nextFollowUpDate: true, type: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  })
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const user = await requireUser()
    const body = await request.json()

    // Map body attributes to only what's allowed to update
    const updateData: any = {}
    if (body.projectName !== undefined) updateData.projectName = body.projectName
    if (body.clientName !== undefined) updateData.clientName = body.clientName
    if (body.clientPhone !== undefined) updateData.clientPhone = body.clientPhone
    if (body.clientEmail !== undefined) updateData.clientEmail = body.clientEmail
    if (body.siteAddress !== undefined) updateData.siteAddress = body.siteAddress
    if (body.architectName !== undefined) updateData.architectName = body.architectName
    if (body.plumberName !== undefined) updateData.plumberName = body.plumberName
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status as ProjectStatus
    if (body.health !== undefined) updateData.health = body.health as ProjectHealth

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...updateData,
        activities: {
          create: {
            type: 'NOTE', // Using NOTE for manual update
            description: `Project details updated`,
            source: 'USER',
            userId: user.id
          }
        }
      }
    })

    return NextResponse.json(project)
  })
}
