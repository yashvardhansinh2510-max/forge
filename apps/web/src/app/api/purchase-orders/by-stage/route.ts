// GET /api/purchase-orders/by-stage
//
// Returns all PO line items that have qty > 0 at a given stage.
// Used by stat card drill-down panels.
//
// Query params:
//   stage      (required) PENDING_CO | PENDING_DIST | AT_GODOWN | IN_BOX | DISPATCHED | NOT_DISPLAYED | ALL
//   brand      (optional) tab key — GROHE | HANSGROHE | VITRA | GEBERIT | ALL (default)
//              HANSGROHE matches HANSGROHE + AXOR (via BRAND_GROUPS)
//   customerId (optional) filter to a single customer's allocations

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { BRAND_GROUPS } from '@/lib/mock/procurement-data'
import { prisma } from '@forge/db'

// ─── Validation ───────────────────────────────────────────────────────────────

const STAGES = ['ALL', 'PENDING_CO', 'PENDING_DIST', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED'] as const
type StageParam = typeof STAGES[number]

const QuerySchema = z.object({
  stage:      z.enum(STAGES),
  brand:      z.string().optional(),
  customerId: z.string().optional(),
})

// ─── Stage → Prisma field mapping ────────────────────────────────────────────

const STAGE_FIELD_MAP: Partial<Record<StageParam, string>> = {
  PENDING_CO:    'qtyPendingCo',
  PENDING_DIST:  'qtyPendingDist',
  AT_GODOWN:     'qtyAtGodown',
  IN_BOX:        'qtyInBox',
  DISPATCHED:    'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = req.nextUrl
    const { stage, brand, customerId } = QuerySchema.parse({
      stage:      searchParams.get('stage') ?? undefined,
      brand:      searchParams.get('brand') ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
    })

    // Resolve brand tab → individual brand values
    const brandValues: string[] | undefined =
      !brand || brand === 'ALL'
        ? undefined
        : (BRAND_GROUPS[brand] ?? [brand])

    // Build stage qty filter
    const stageFilter = stage === 'ALL'
      ? undefined
      : { [STAGE_FIELD_MAP[stage]!]: { gt: 0 } }

    const lines = await prisma.pOLineItem.findMany({
      where: {
        ...stageFilter,
        product: brandValues ? { brand: { in: brandValues as never[] } } : undefined,
      },
      include: {
        product:  { select: { sku: true, name: true, brand: true, imageUrl: true, mrp: true } },
        po:       { select: { id: true, poNumber: true, projectId: true, vendorName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Attach the qty at the requested stage to each line for convenience
    const result = lines.map((line) => ({
      ...line,
      qtyAtStage: stage === 'ALL'
        ? line.qtyOrdered
        : (line[STAGE_FIELD_MAP[stage] as keyof typeof line] as number),
    }))

    return NextResponse.json({ lines: result, total: result.reduce((s, l) => s + l.qtyAtStage, 0) })
  })
}
