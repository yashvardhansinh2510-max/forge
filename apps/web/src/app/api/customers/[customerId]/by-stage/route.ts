// GET /api/customers/[customerId]/by-stage
//
// Returns all PO line items allocated to a specific customer,
// filtered by stage and optionally by brand tab.
//
// Query params:
//   stage  (required) NEEDS_PO | ORDERED | AT_GODOWN | IN_BOX | DISPATCHED | ALL
//   brand  (optional) tab key — GROHE | HANSGROHE | VITRA | GEBERIT | ALL (default)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { BRAND_GROUPS } from '@/lib/mock/procurement-data'
import { prisma } from '@forge/db'

const STAGES = ['ALL', 'NEEDS_PO', 'ORDERED', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED'] as const

const QuerySchema = z.object({
  stage: z.enum(STAGES),
  brand: z.string().optional(),
})

const STAGE_FIELD_MAP: Partial<Record<typeof STAGES[number], string>> = {
  ORDERED:    'qtyPendingCo',
  AT_GODOWN:  'qtyAtGodown',
  IN_BOX:     'qtyInBox',
  DISPATCHED: 'qtyDispatched',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  return withErrorHandling(async () => {
    const { customerId } = await params
    const { searchParams } = req.nextUrl
    const { stage, brand } = QuerySchema.parse({
      stage: searchParams.get('stage') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
    })

    const brandValues: string[] | undefined =
      !brand || brand === 'ALL'
        ? undefined
        : (BRAND_GROUPS[brand] ?? [brand])

    const stageFilter = stage === 'ALL' || stage === 'NEEDS_PO'
      ? undefined
      : { [STAGE_FIELD_MAP[stage]!]: { gt: 0 } }

    const lines = await prisma.pOLineItem.findMany({
      where: {
        ...stageFilter,
        quotationItem: {
          room: {
            revision: {
              quotation: { projectId: customerId },
            },
          },
        },
        product: brandValues ? { brand: { in: brandValues as never[] } } : undefined,
      },
      include: {
        product: { select: { sku: true, name: true, brand: true, imageUrl: true, mrp: true } },
        po:      { select: { id: true, poNumber: true, vendorName: true, expectedDelivery: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = lines
      .map((line) => {
        let qtyAtStage: number
        if (stage === 'ALL') {
          qtyAtStage = line.qtyOrdered
        } else if (stage === 'NEEDS_PO') {
          const staged = line.qtyPendingCo + line.qtyAtGodown + line.qtyInBox + line.qtyDispatched
          qtyAtStage = Math.max(0, line.qtyOrdered - staged)
        } else {
          qtyAtStage = line[STAGE_FIELD_MAP[stage] as keyof typeof line] as number
        }
        return { ...line, qtyAtStage }
      })
      .filter((line) => stage !== 'NEEDS_PO' || line.qtyAtStage > 0)

    // Stage summary counts for the customer (all brands, all stages)
    const allLines = await prisma.pOLineItem.findMany({
      where: {
        quotationItem: {
          room: {
            revision: {
              quotation: { projectId: customerId },
            },
          },
        },
      },
      select: {
        qtyOrdered:    true,
        qtyPendingCo:  true,
        qtyAtGodown:   true,
        qtyInBox:      true,
        qtyDispatched: true,
      },
    })

    const summary = allLines.reduce(
      (acc, l) => {
        const staged = l.qtyPendingCo + l.qtyAtGodown + l.qtyInBox + l.qtyDispatched
        acc.totalOrdered += l.qtyOrdered
        acc.needsPo      += Math.max(0, l.qtyOrdered - staged)
        acc.ordered      += l.qtyPendingCo
        acc.atGodown     += l.qtyAtGodown
        acc.inBox        += l.qtyInBox
        acc.dispatched   += l.qtyDispatched
        return acc
      },
      { totalOrdered: 0, needsPo: 0, ordered: 0, atGodown: 0, inBox: 0, dispatched: 0 },
    )

    return NextResponse.json({ lines: result, summary })
  })
}
