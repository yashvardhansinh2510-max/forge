// POST /api/purchase-orders/from-revision/[revisionId]
//
// Creates a new PurchaseOrder from a locked QuotationRevision.
// Delegates to buildPOFromRevision() in lib/quotationToPO.ts (already built).
//
// Optional body:
//   { vendorFilter?: string }   — only include items from a specific brand

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { buildPOFromRevision } from '@/lib/quotationToPO'

const BodySchema = z.object({
  vendorFilter: z.string().optional(),
}).optional()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  return withErrorHandling(async () => {
    const { revisionId } = await params
    const body = BodySchema.parse(
      req.headers.get('content-length') !== '0' ? await req.json() : undefined,
    )

    const userId = getDevUserId()
    const po = await buildPOFromRevision(revisionId, userId, {
      vendorFilter: body?.vendorFilter,
    })

    return NextResponse.json(po, { status: 201 })
  })
}
