// POST /api/purchase-orders/from-revision/[revisionId]
//
// Path A only: revisionId is a real DB QuotationRevision (LOCKED/FINALIZED)
//   → delegates to buildPOFromRevision() in lib/quotationToPO.ts
//   → returns 404 if revision does not exist
//   → returns 422 if revision has no line items

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import { buildPOFromRevision } from '@/lib/quotationToPO'

const BodySchema = z.object({
  vendorFilter: z.string().optional(),
}).optional()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ revisionId: string }> },
) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Purchases', 'Create')
    const { revisionId } = await params
    let rawBody: unknown
    try { rawBody = await req.json() } catch { rawBody = undefined }
    const body = BodySchema.parse(rawBody)

    const revision = await prisma.quotationRevision.findUnique({
      where: { id: revisionId },
    })

    if (!revision) {
      return NextResponse.json(
        { message: `Revision "${revisionId}" not found` },
        { status: 404 },
      )
    }

    const po = await buildPOFromRevision(revisionId, user.id, {
      vendorFilter: body?.vendorFilter,
    })
    return NextResponse.json(po, { status: 201 })
  })
}
