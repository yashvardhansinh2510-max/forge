import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import { getDevUserId, withErrorHandling } from '@/lib/api-helpers'
import { AppError } from '@/lib/errors'
import { moveFallbackLine, shouldUseFallback } from '@/lib/purchases-fallback'
import { allowDevFallback } from '@/lib/runtime-mode'
import { logActivity } from '@/lib/activity-log'
import {
  BRAND_TABS,
  countsFromDbLine,
  createEmptyHeaderCounts,
  getBrandsForTab,
  normalizeBrandTab,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
} from '@/lib/purchases-tracker'

const TO_STAGES = [
  'PENDING_CO',
  'PENDING_DIST',
  'GODOWN',
  'IN_BOX',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const

const LEGAL_TRANSITIONS: Record<PurchaseStage, typeof TO_STAGES[number][]> = {
  UNALLOCATED: ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO: ['PENDING_DIST', 'GODOWN'],
  PENDING_DIST: ['GODOWN'],
  GODOWN: ['IN_BOX'],
  IN_BOX: ['DISPATCHED'],
  DISPATCHED: ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}

const DB_FIELD_BY_STAGE = {
  PENDING_CO: 'qtyPendingCo',
  PENDING_DIST: 'qtyPendingDist',
  GODOWN: 'qtyAtGodown',
  IN_BOX: 'qtyInBox',
  DISPATCHED: 'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
} as const

type PersistedStage = keyof typeof DB_FIELD_BY_STAGE
type QtyField = typeof DB_FIELD_BY_STAGE[PersistedStage]

const MoveStageSchema = z.object({
  fromStage: z.enum(['UNALLOCATED', ...TO_STAGES]),
  toStage: z.enum(TO_STAGES),
  qty: z.number().int().min(1),
  customerId: z.string().optional(),
  note: z.string().max(500).optional(),
  brand: z.enum(BRAND_TABS).optional(),
})

function getCurrentQtyAtStage(line: {
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}, stage: PurchaseStage): number {
  if (stage === 'UNALLOCATED') {
    return countsFromDbLine(line).UNALLOCATED
  }

  return line[DB_FIELD_BY_STAGE[stage]]
}

function buildStageTotals(lines: Array<{
  qtyOrdered: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}>): HeaderCounts {
  return lines.reduce((acc, line) => {
    const next = countsFromDbLine(line)
    return {
      UNALLOCATED: acc.UNALLOCATED + next.UNALLOCATED,
      PENDING_CO: acc.PENDING_CO + next.PENDING_CO,
      PENDING_DIST: acc.PENDING_DIST + next.PENDING_DIST,
      GODOWN: acc.GODOWN + next.GODOWN,
      IN_BOX: acc.IN_BOX + next.IN_BOX,
      DISPATCHED: acc.DISPATCHED + next.DISPATCHED,
      NOT_DISPLAYED: acc.NOT_DISPLAYED + next.NOT_DISPLAYED,
    }
  }, createEmptyHeaderCounts())
}

async function getStageTotalsForScope(scope: BrandTab): Promise<HeaderCounts> {
  const brands = getBrandsForTab(scope)
  const lines = await prisma.pOLineItem.findMany({
    where: brands
      ? {
          product: {
            brand: {
              in: brands as never[],
            },
          },
        }
      : undefined,
    select: {
      qtyOrdered: true,
      qtyPendingCo: true,
      qtyPendingDist: true,
      qtyAtGodown: true,
      qtyInBox: true,
      qtyDispatched: true,
      qtyNotDisplayed: true,
    },
  })

  return buildStageTotals(lines)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  return withErrorHandling(async () => {
    const { lineId } = await params
    const body = MoveStageSchema.parse(await req.json())
    const {
      fromStage,
      toStage,
      qty,
      customerId,
      note,
    } = body

    const allowedTargets = LEGAL_TRANSITIONS[fromStage] ?? []
    if (!allowedTargets.includes(toStage)) {
      throw new AppError(
        'ILLEGAL_STAGE_TRANSITION',
        `Cannot move from ${fromStage} to ${toStage}.`,
        422,
      )
    }

    try {
      const line = await prisma.pOLineItem.findUnique({
        where: { id: lineId },
        select: {
          id: true,
          qtyOrdered: true,
          qtyPendingCo: true,
          qtyPendingDist: true,
          qtyAtGodown: true,
          qtyInBox: true,
          qtyDispatched: true,
          qtyNotDisplayed: true,
        },
      })

      if (!line) {
        throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found`, 404)
      }

      const availableQty = getCurrentQtyAtStage(line, fromStage)
      if (qty > availableQty) {
        throw new AppError(
          'INSUFFICIENT_QTY',
          `Only ${availableQty} unit(s) are available at ${fromStage}.`,
          422,
          { available: availableQty, requested: qty },
        )
      }

      const updates: Array<ReturnType<typeof prisma.pOLineItem.update> | ReturnType<typeof prisma.stageMovement.create>> = []

      if (fromStage !== 'UNALLOCATED') {
        updates.push(
          prisma.pOLineItem.update({
            where: { id: lineId },
            data: {
              [DB_FIELD_BY_STAGE[fromStage] as QtyField]: {
                decrement: qty,
              },
            },
          }),
        )
      }

      updates.push(
        prisma.pOLineItem.update({
          where: { id: lineId },
          data: {
            [DB_FIELD_BY_STAGE[toStage] as QtyField]: {
              increment: qty,
            },
          },
        }),
      )

      updates.push(
        prisma.stageMovement.create({
          data: {
            poLineItemId: lineId,
            fromStage,
            toStage,
            qty,
            movedById: getDevUserId(),
            note: customerId
              ? `${note ? `${note} | ` : ''}customer:${customerId}`
              : note ?? null,
          },
        }),
      )

      await prisma.$transaction(updates)

      await logActivity({
        type: 'NOTE',
        userId: getDevUserId(),
        description: `Moved ${qty} unit(s) from ${fromStage} to ${toStage} in purchase pipeline`,
      })

      const lineItem = await prisma.pOLineItem.findUnique({
        where: { id: lineId },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              brand: true,
              imageUrl: true,
            },
          },
          po: {
            select: {
              id: true,
              poNumber: true,
              vendorName: true,
              project: {
                select: {
                  id: true,
                  clientName: true,
                  siteAddress: true,
                },
              },
            },
          },
        },
      })

      if (!lineItem) {
        throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found after update`, 404)
      }

      const stageTotals = await getStageTotalsForScope(normalizeBrandTab(body.brand))

      return NextResponse.json({
        lineItem,
        stageTotals,
      })
    } catch (error) {
      if (allowDevFallback() && shouldUseFallback(error)) {
        return NextResponse.json(moveFallbackLine({
          lineId,
          fromStage,
          toStage,
          qty,
          brand: normalizeBrandTab(body.brand),
        }))
      }

      throw error
    }
  })
}
