import { NextResponse } from 'next/server'
import { prisma, ProjectStatus, ProjectHealth } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser, writeAuditLog } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireUser()
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
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

    // Compute financial fields live (replaced stale denormalized fields)
    const allPayments = project.salesOrders.flatMap((so: any) => so.payments)
    const paymentReceived = allPayments.reduce((s: number, p: any) => s + p.amount, 0)
    const offerTotal = project.salesOrders.reduce((s: number, so: any) => s + so.offerTotal, 0)
    const outstandingAmount = Math.max(0, offerTotal - paymentReceived)

    // quotationValue: aggregate from linked quotation items
    const qAgg = await prisma.quotationItem.aggregate({
      _sum: { totalOffer: true },
      where: { room: { revision: { quotation: { projectId: id } } } }
    })
    const quotationValue = (qAgg._sum.totalOffer as number | null) ?? offerTotal

    // purchaseValue: aggregate from linked PO line items
    const poAgg = await prisma.pOLineItem.aggregate({
      _sum: { qtyOrdered: true },
      where: { po: { projectId: id } }
    })
    const purchaseValue = (poAgg._sum.qtyOrdered as number | null) ?? 0

    return NextResponse.json({
      ...project,
      quotationValue,
      purchaseValue,
      paymentReceived,
      outstandingAmount,
    })
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const user = await requireUser()
    const { id } = await params
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

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { status: true, health: true, projectName: true },
    })

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updateData,
        activities: {
          create: {
            type: 'NOTE',
            description: `Project details updated`,
            source: 'USER',
            userId: user.id
          }
        }
      }
    })

    const action = updateData.status !== undefined ? 'PROJECT_STATUS_CHANGED' : 'PROJECT_UPDATED'
    await writeAuditLog({
      actorId: user.id,
      action,
      category: 'PROJECTS',
      entityType: 'Project',
      entityId: id,
      beforeSnapshot: existing ?? undefined,
      afterSnapshot: { ...updateData },
    })

    return NextResponse.json(project)
  })
}
