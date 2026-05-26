// GET /api/purchase-orders/by-stage
//
// Returns all PO line items that have qty > 0 at a given stage.
// Used by stat card drill-down panels.
//
// Query params:
//   stage      (required) NEEDS_PO | ORDERED | AT_GODOWN | IN_BOX | DISPATCHED | ALL
//   brand      (optional) tab key — GROHE | HANSGROHE | VITRA | GEBERIT | ALL (default)
//              HANSGROHE matches HANSGROHE + AXOR (via BRAND_GROUPS)
//   customerId (optional) filter to a single customer's allocations

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { BRAND_GROUPS } from '@/lib/mock/procurement-data'
import { prisma } from '@forge/db'

const STAGES = ['ALL', 'NEEDS_PO', 'ORDERED', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED'] as const
type StageParam = typeof STAGES[number]

const QuerySchema = z.object({
  stage:      z.enum(STAGES),
  brand:      z.string().optional(),
  customerId: z.string().optional(),
})

// Stage → Prisma field mapping (NEEDS_PO is derived, handled separately)
const STAGE_FIELD_MAP: Partial<Record<StageParam, string>> = {
  ORDERED:    'qtyPendingCo',
  AT_GODOWN:  'qtyAtGodown',
  IN_BOX:     'qtyInBox',
  DISPATCHED: 'qtyDispatched',
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = req.nextUrl
    const { stage, brand, customerId } = QuerySchema.parse({
      stage:      searchParams.get('stage') ?? undefined,
      brand:      searchParams.get('brand') ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
    })

    const brandValues: string[] | undefined =
      !brand || brand === 'ALL'
        ? undefined
        : (BRAND_GROUPS[brand] ?? [brand])

    // NEEDS_PO is derived — items where (qtyOrdered - staged) > 0
    const stageFilter = stage === 'ALL' || stage === 'NEEDS_PO'
      ? undefined
      : { [STAGE_FIELD_MAP[stage]!]: { gt: 0 } }

    const lines = await prisma.pOLineItem.findMany({
      where: {
        ...stageFilter,
        product: brandValues ? { brand: { in: brandValues as never[] } } : undefined,
      },
      include: {
        product: { select: { sku: true, name: true, brand: true, imageUrl: true, mrp: true } },
        po:      { select: { id: true, poNumber: true, projectId: true, vendorName: true } },
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
      // For NEEDS_PO, filter out lines where derived qty = 0
      .filter((line) => stage !== 'NEEDS_PO' || line.qtyAtStage > 0)

    return NextResponse.json({ lines: result, total: result.reduce((s, l) => s + l.qtyAtStage, 0) })
  })
}
