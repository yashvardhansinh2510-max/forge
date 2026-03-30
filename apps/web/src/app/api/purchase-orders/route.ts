// POST /api/purchase-orders  — create a new PO
// GET  /api/purchase-orders  — list POs with filters

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'
import { buildPOFromRevision } from '@/lib/quotationToPO'
import { ValidationError } from '@/lib/errors'

const CreatePOSchema = z.object({
  mode:             z.enum(['PROJECT_LINKED', 'BULK_COMPANY']),
  projectId:        z.string().cuid().optional(),
  revisionId:       z.string().cuid().optional(),
  vendorName:       z.string().optional(),
  expectedDelivery: z.string().datetime().optional(),
  notes:            z.string().optional(),
})

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = CreatePOSchema.parse(await req.json())
    const userId = getDevUserId()

    let po

    if (body.mode === 'PROJECT_LINKED' && body.revisionId) {
      // Auto-build from locked revision
      po = await buildPOFromRevision(body.revisionId, userId, {
        vendorFilter: body.vendorName,
      })
    } else if (body.mode === 'BULK_COMPANY') {
      // Empty PO — sales team adds lines manually
      if (!body.vendorName) throw new ValidationError('vendorName is required for BULK_COMPANY mode')

      const { generatePONumber } = await import('@/lib/poNumberGenerator')
      const poNumber = await generatePONumber()

      po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          mode: 'BULK_COMPANY',
          status: 'DRAFT',
          projectId: body.projectId ?? null,
          createdById: userId,
          vendorName: body.vendorName,
          expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
          notes: body.notes ?? null,
        },
        include: { lineItems: { include: { product: true } } },
      })
    } else {
      throw new ValidationError(
        'PROJECT_LINKED mode requires revisionId, or use BULK_COMPANY mode',
      )
    }

    return NextResponse.json(po, { status: 201 })
  })
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = req.nextUrl
    const mode      = searchParams.get('mode') as 'PROJECT_LINKED' | 'BULK_COMPANY' | null
    const status    = searchParams.get('status') as string | null
    const projectId = searchParams.get('projectId')
    const brand     = searchParams.get('brand')

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        ...(mode      && { mode }),
        ...(status    && { status: status as never }),
        ...(projectId && { projectId }),
        ...(brand     && { vendorName: brand }),
      },
      include: {
        project: { select: { id: true, clientName: true } },
        _count: { select: { lineItems: true } },
        lineItems: {
          select: { qtyOrdered: true, landingCost: true, clientOfferRate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute total value per PO for list view
    const enriched = pos.map((po) => ({
      ...po,
      totalLandingCost: po.lineItems.reduce(
        (s, l) => s + (l.landingCost ?? 0) * l.qtyOrdered, 0,
      ),
      totalClientValue: po.lineItems.reduce(
        (s, l) => s + (l.clientOfferRate ?? 0) * l.qtyOrdered, 0,
      ),
      itemCount: po._count.lineItems,
    }))

    return NextResponse.json(enriched)
  })
}
