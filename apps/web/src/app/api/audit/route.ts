import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { requirePermission } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    await requirePermission('Settings', 'View')

    const url = new URL(req.url)
    
    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Filters
    const userId = url.searchParams.get('userId')
    const category = url.searchParams.get('category')
    const entityType = url.searchParams.get('entityType')
    const entityId = url.searchParams.get('entityId')
    const action = url.searchParams.get('action')
    const status = url.searchParams.get('status')
    
    // Date Range
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')

    const where: any = {}

    if (userId) where.actorId = userId
    if (category) where.category = category
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action
    if (status) where.status = status

    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = new Date(fromDate)
      if (toDate) where.createdAt.lte = new Date(toDate)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('[Audit API Error]', error)
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
  }
}
