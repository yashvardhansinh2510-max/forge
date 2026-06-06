import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import { AppError } from '@/lib/errors'

import { logActivity } from '@/lib/activity-log'
import { writeAuditLog } from '@/lib/auth'
import {
  BRAND_TABS,
  normalizeBrandTab,
  createEmptyHeaderCounts,
  stageToDbField,
  type PurchaseStage,
} from '@/lib/purchases-tracker'
import { getStageTotalsForScope } from '@/lib/server/purchase-stage-totals'
import { generatePONumber } from '@/lib/poNumberGenerator'

// Canonical stage vocabulary — must match purchases-tracker.ts
const TRANSFERABLE_STAGES = [
  'PENDING_CO',
  'PENDING_DIST',
  'GODOWN',
  'IN_BOX',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const satisfies ReadonlyArray<Exclude<PurchaseStage, 'UNALLOCATED'>>

type TransferStage = typeof TRANSFERABLE_STAGES[number]

const TransferSchema = z.discriminatedUnion('mode', [
  // Legacy: source and target line IDs both known
  z.object({
    mode: z.literal('line'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    targetLineId: z.string(),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
  // New: existing project, auto-find or create line for this product
  z.object({
    mode: z.literal('project'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    targetProjectId: z.string(),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
  // New: create a new customer on the fly
  z.object({
    mode: z.literal('new'),
    stage: z.enum(TRANSFERABLE_STAGES),
    qty: z.number().int().min(1),
    newCustomerName: z.string().min(1).max(200),
    reason: z.string().min(1).max(500),
    brand: z.enum(BRAND_TABS).optional(),
  }),
])

async function resolveTargetLineId(
  sourceLine: { id: string; productId: string; poId: string },
  body: z.infer<typeof TransferSchema>,
  userId: string,
): Promise<string> {
  if (body.mode === 'line') return body.targetLineId

  let projectId: string

  if (body.mode === 'new') {
    const project = await prisma.project.create({
      data: {
        clientName: body.newCustomerName,
        projectName: body.newCustomerName,
      },
    })
    projectId = project.id
  } else {
    projectId = body.targetProjectId
  }

  // Find existing line for this project + product
  const existing = await prisma.pOLineItem.findFirst({
    where: {
      productId: sourceLine.productId,
      po: { projectId },
    },
    select: { id: true },
  })

  if (existing) return existing.id

  // Create a new PO + line for this project
  const poNumber = await generatePONumber()
  const newPo = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      mode: 'PROJECT_LINKED',
      projectId,
      createdById: userId,
    },
  })

  const newLine = await prisma.pOLineItem.create({
    data: {
      poId: newPo.id,
      productId: sourceLine.productId,
      qtyOrdered: 0,
    },
  })

  return newLine.id
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const user = await requirePermission('Inventory', 'Transfer')
    const { lineId } = await params
    const body = TransferSchema.parse(await req.json())
    const { stage, qty, reason } = body

    const sourceLine = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      include: { po: { include: { project: true } } },
    })

    if (!sourceLine) {
      throw new AppError('NOT_FOUND', `POLineItem not found`, 404)
    }

    const targetLineId = await resolveTargetLineId(sourceLine, body, user.id)

    if (lineId === targetLineId) {
      throw new AppError('INVALID_TARGET', 'Cannot transfer to the same line', 422)
    }

    const targetLine = await prisma.pOLineItem.findUnique({
      where: { id: targetLineId },
      include: { po: { include: { project: true } } },
    })

    if (!targetLine) {
      throw new AppError('NOT_FOUND', `Target POLineItem not found`, 404)
    }

    if (sourceLine.productId !== targetLine.productId) {
      throw new AppError('MISMATCH', `Product mismatch in transfer`, 422)
    }

    const field = stageToDbField(stage)
    const availableQty = sourceLine[field] as number
    if (qty > availableQty) {
      throw new AppError(
        'INSUFFICIENT_QTY',
        `Only ${availableQty} unit(s) are available at ${stage}.`,
        422,
        { available: availableQty, requested: qty },
      )
    }

    const sourceCustomerName = sourceLine.po.project?.clientName ?? sourceLine.po.customerName ?? 'Unknown'
    const targetCustomerName = targetLine.po.project?.clientName ?? targetLine.po.customerName ?? 'Unknown'
    const auditNote = `TRANSFER: ${qty} units from ${sourceCustomerName} to ${targetCustomerName}. Reason: ${reason}`

    await prisma.$transaction([
      prisma.pOLineItem.update({
        where: { id: lineId },
        data: {
          qtyTransferredOut: { increment: qty },
          [field]: { decrement: qty },
        },
      }),
      prisma.pOLineItem.update({
        where: { id: targetLineId },
        data: {
          qtyTransferredIn: { increment: qty },
          [field]: { increment: qty },
        },
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: lineId,
          fromStage: stage,
          toStage: 'TRANSFERRED_OUT',
          qty,
          movedById: user.id,
          note: auditNote,
        },
      }),
      prisma.stageMovement.create({
        data: {
          poLineItemId: targetLineId,
          fromStage: 'TRANSFERRED_IN',
          toStage: stage,
          qty,
          movedById: user.id,
          note: auditNote,
        },
      }),
    ])

    // Fire-and-forget side effects
    await logActivity({
      type: 'NOTE',
      userId: user.id,
      description: auditNote,
    })

    await writeAuditLog({
      actorId: user.id,
      action: 'PURCHASE_TRANSFER',
      category: 'PURCHASES',
      entityType: 'POLineItem',
      entityId: lineId,
      beforeSnapshot: { lineId, stage, qty },
      afterSnapshot: { targetLineId, stage, qty },
      metadata: { reason, sourceCustomer: sourceCustomerName, targetCustomer: targetCustomerName },
    })

    // Post-transaction read — failure must not mask a successful transfer
    let stageTotals = createEmptyHeaderCounts()
    try {
      stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))
    } catch (e) {
      console.error('[transfer] getStageTotalsForScope failed — returning empty counts', e)
    }

    return NextResponse.json({ success: true, stageTotals })
  })
}
