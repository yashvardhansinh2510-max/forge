import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import {
  computeBrandCounts,
  countsFromDbLine,
  getBrandsForTab,
  normalizeBrandTab,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function mapLine(line: {
  id: string
  poId: string
  createdAt: Date
  qtyOrdered: number
  qtyReceived: number
  qtyPendingCo: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  followUpStatus: string | null
  landingCost: number | null
  product: {
    id: string
    sku: string
    name: string
    brand: string
    imageUrl: string | null
  }
  po: {
    id: string
    poNumber: string
    vendorName: string | null
    customerName: string | null
    customerSiteAddress: string | null
    project: {
      id: string
      clientName: string
      siteAddress: string | null
    } | null
  }
}): PurchaseTrackerLine {
  const customer = line.po.project
    ? { id: line.po.project.id, name: line.po.project.clientName, siteAddress: line.po.project.siteAddress }
    : line.po.customerName
    ? { id: line.poId, name: line.po.customerName, siteAddress: line.po.customerSiteAddress }
    : null
  return {
    id: line.id,
    poId: line.poId,
    poNumber: line.po.poNumber,
    vendorName: line.po.vendorName,
    projectId: line.po.project?.id ?? null,
    customer,
    product: {
      id: line.product.id,
      sku: line.product.sku,
      name: line.product.name,
      brand: line.product.brand,
      imageUrl: line.product.imageUrl,
    },
    qtyOrdered: line.qtyOrdered,
    qtyReceived: line.qtyReceived,
    stages: countsFromDbLine(line),
    followUpStatus: line.followUpStatus,
    createdAt: line.createdAt.toISOString(),
    landingCost: line.landingCost,
  }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const activeBrand = normalizeBrandTab(req.nextUrl.searchParams.get('brand'))
    const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '', 10) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10) || 100))
    const skip  = (page - 1) * limit

    const brandsForTab = activeBrand === 'ALL' ? null : getBrandsForTab(activeBrand)
    const brandWhere: Prisma.POLineItemWhereInput | undefined = brandsForTab
      ? ({ product: { is: { brand: { in: brandsForTab as any[] } } } } as Prisma.POLineItemWhereInput)
      : undefined

    const [dbLines, total] = await Promise.all([
      prisma.pOLineItem.findMany({
        skip,
        take: limit,
        where: brandWhere,
        include: {
          product: {
            select: { id: true, sku: true, name: true, brand: true, imageUrl: true },
          },
          po: {
            select: {
              id: true,
              poNumber: true,
              vendorName: true,
              customerName: true,
              customerSiteAddress: true,
              project: {
                select: { id: true, clientName: true, siteAddress: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.pOLineItem.count({ where: brandWhere }),
    ])

    const baseLines = dbLines.map(mapLine)

    // Fetch new fields (priority, assignedTo, stageEnteredAt) via raw query —
    // Prisma client regeneration not yet run, so these columns aren't in the generated types.
    const lineIds = baseLines.map((l) => l.id)
    const extraFields = lineIds.length > 0
      ? await prisma.$queryRaw<Array<{
          id: string
          priority: string
          assignedToId: string | null
          assignedName: string | null
          stageEnteredAt: Date | null
        }>>`
          SELECT l.id, l.priority, l."assignedToId", u.name AS "assignedName", l."stageEnteredAt"
          FROM "POLineItem" l
          LEFT JOIN "User" u ON u.id = l."assignedToId"
          WHERE l.id = ANY(${lineIds}::text[])
        `.catch(() => [] as Array<{ id: string; priority: string; assignedToId: string | null; assignedName: string | null; stageEnteredAt: Date | null }>)
      : []

    const extraMap = new Map(extraFields.map((e) => [e.id, e]))

    const allLines = baseLines.map((line) => {
      const extra = extraMap.get(line.id)
      return {
        ...line,
        priority: extra?.priority ?? 'MEDIUM',
        assignedTo: extra?.assignedToId && extra.assignedName
          ? { id: extra.assignedToId, name: extra.assignedName }
          : null,
        stageEnteredAt: extra?.stageEnteredAt
          ? new Date(extra.stageEnteredAt).toISOString()
          : null,
      }
    })

    const agg = await prisma.pOLineItem.aggregate({
      _sum: {
        qtyOrdered:    true,
        qtyPendingCo:  true,
        qtyAtGodown:   true,
        qtyInBox:      true,
        qtyDispatched: true,
      },
    })

    const s = agg._sum
    const headerCounts = {
      ORDER_IN_CO: Math.max(0,
        (s.qtyOrdered ?? 0) -
        (s.qtyPendingCo ?? 0) -
        (s.qtyAtGodown ?? 0) -
        (s.qtyInBox ?? 0) -
        (s.qtyDispatched ?? 0),
      ),
      CO_BILLING:  s.qtyPendingCo  ?? 0,
      INBOX:       s.qtyAtGodown   ?? 0,
      DISPATCHED:  s.qtyInBox      ?? 0,
      COMPLETED:   s.qtyDispatched ?? 0,
    }

    return NextResponse.json({
      lines: allLines,
      headerCounts,
      brandCounts: computeBrandCounts(allLines),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })
}
