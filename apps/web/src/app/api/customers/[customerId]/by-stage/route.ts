// GET /api/customers/[customerId]/by-stage
//
// Returns all PO line items allocated to a specific customer,
// filtered by stage and optionally by brand tab.
//
// Query params:
//   stage  (required) PENDING_CO | PENDING_DIST | AT_GODOWN | IN_BOX | DISPATCHED | NOT_DISPLAYED | ALL
//   brand  (optional) tab key — GROHE | HANSGROHE | VITRA | GEBERIT | ALL (default)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { BRAND_GROUPS } from '@/lib/mock/procurement-data'
import { prisma } from '@forge/db'

// ─── Validation ───────────────────────────────────────────────────────────────

const STAGES = ['ALL', 'PENDING_CO', 'PENDING_DIST', 'AT_GODOWN', 'IN_BOX', 'DISPATCHED', 'NOT_DISPLAYED'] as const

const QuerySchema = z.object({
  stage: z.enum(STAGES),
  brand: z.string().optional(),
})

// ─── Stage → Prisma field ─────────────────────────────────────────────────────

const STAGE_FIELD_MAP: Partial<Record<typeof STAGES[number], string>> = {
  PENDING_CO:    'qtyPendingCo',
  PENDING_DIST:  'qtyPendingDist',
  AT_GODOWN:     'qtyAtGodown',
  IN_BOX:        'qtyInBox',
  DISPATCHED:    'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

    const stageFilter = stage === 'ALL'
      ? undefined
      : { [STAGE_FIELD_MAP[stage]!]: { gt: 0 } }

    // Line items linked to quotation items for this project/customer
    const lines = await prisma.pOLineItem.findMany({
      where: {
        ...stageFilter,
        quotationItem: {
          room: {
            revision: {
              quotation: {
                projectId: customerId,
              },
            },
          },
        },
        product: brandValues ? { brand: { in: brandValues as never[] } } : undefined,
      },
      include: {
        product:  { select: { sku: true, name: true, brand: true, imageUrl: true, mrp: true } },
        po:       { select: { id: true, poNumber: true, vendorName: true, expectedDelivery: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = lines.map((line) => ({
      ...line,
      qtyAtStage: stage === 'ALL'
        ? line.qtyOrdered
        : (line[STAGE_FIELD_MAP[stage] as keyof typeof line] as number),
    }))

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
        qtyOrdered:     true,
        qtyPendingCo:   true,
        qtyPendingDist: true,
        qtyAtGodown:    true,
        qtyInBox:       true,
        qtyDispatched:  true,
        qtyNotDisplayed: true,
      },
    })

    const summary = allLines.reduce(
      (acc, l) => {
        acc.totalOrdered    += l.qtyOrdered
        acc.pendingFromCo   += l.qtyPendingCo
        acc.pendingFromDist += l.qtyPendingDist
        acc.atGodown        += l.qtyAtGodown
        acc.inBox           += l.qtyInBox
        acc.dispatched      += l.qtyDispatched
        acc.notDisplayed    += l.qtyNotDisplayed
        return acc
      },
      { totalOrdered: 0, pendingFromCo: 0, pendingFromDist: 0, atGodown: 0, inBox: 0, dispatched: 0, notDisplayed: 0 },
    )

    return NextResponse.json({ lines: result, summary })
  })
}
