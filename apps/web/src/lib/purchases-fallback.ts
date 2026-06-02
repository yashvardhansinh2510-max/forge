import { AppError } from '@/lib/errors'
import {
  MOCK_PURCHASE_ORDERS,
  type MockPOLineItem,
  type MockPurchaseOrder,
} from '@/lib/mock/procurement-data'
import {
  computeBrandCounts,
  computeHeaderCounts,
  countsFromDbLine,
  matchesBrandTab,
  type BrandTab,
  type CustomerOption,
  type HeaderCounts,
  type PurchaseLinesResponse,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const DB_FIELD_BY_STAGE = {
  PENDING_CO: 'qtyPendingCo',
  PENDING_DIST: 'qtyPendingDist',
  GODOWN: 'qtyAtGodown',
  IN_BOX: 'qtyInBox',
  DISPATCHED: 'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
} as const

const LEGAL_TRANSITIONS: Record<PurchaseStage, PurchaseStage[]> = {
  UNALLOCATED: ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO: ['PENDING_DIST', 'GODOWN'],
  PENDING_DIST: ['GODOWN'],
  GODOWN: ['IN_BOX'],
  IN_BOX: ['DISPATCHED'],
  DISPATCHED: ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}

let mockOrders: MockPurchaseOrder[] | null = null

function getMockOrders(): MockPurchaseOrder[] {
  if (!mockOrders) {
    mockOrders = structuredClone(MOCK_PURCHASE_ORDERS)
  }

  return mockOrders
}

function mapMockLine(order: MockPurchaseOrder, line: MockPOLineItem): PurchaseTrackerLine {
  return {
    id: line.id,
    poId: order.id,
    poNumber: order.poNumber,
    vendorName: order.vendorName,
    projectId: order.projectId,
    customer: order.projectId && order.clientName
      ? {
          id: order.projectId,
          name: order.clientName,
          siteAddress: null,
        }
      : null,
    product: {
      id: line.productId,
      sku: line.productSku,
      name: line.productName,
      brand: line.productBrand,
      imageUrl: line.productImage || null,
      seriesName: null,
      finishName: null,
      articleNumber: null,
      mrp: 0,
      unit: 'pcs',
      tier: 'premium',
    },
    qtyOrdered: line.qtyOrdered,
    qtyTransferredIn: 0,
    qtyTransferredOut: 0,
    qtyReceived: line.qtyReceived,
    stages: countsFromDbLine({
      qtyOrdered: line.qtyOrdered,
      qtyPendingCo: line.qtyPendingCo,
      qtyPendingDist: line.qtyPendingDist,
      qtyAtGodown: line.qtyAtGodown,
      qtyInBox: line.qtyInBox,
      qtyDispatched: line.qtyDispatched,
      qtyNotDisplayed: line.qtyNotDisplayed,
    }),
  }
}

function mapAllMockLines(): PurchaseTrackerLine[] {
  return getMockOrders().flatMap((order) => order.lineItems.map((line) => mapMockLine(order, line)))
}

function getMutableLine(lineId: string): { order: MockPurchaseOrder; line: MockPOLineItem } | null {
  for (const order of getMockOrders()) {
    const line = order.lineItems.find((item) => item.id === lineId)
    if (line) return { order, line }
  }

  return null
}

function getAvailableQty(line: MockPOLineItem, stage: PurchaseStage): number {
  const counts = countsFromDbLine({
    qtyOrdered: line.qtyOrdered,
    qtyPendingCo: line.qtyPendingCo,
    qtyPendingDist: line.qtyPendingDist,
    qtyAtGodown: line.qtyAtGodown,
    qtyInBox: line.qtyInBox,
    qtyDispatched: line.qtyDispatched,
    qtyNotDisplayed: line.qtyNotDisplayed,
  })

  return counts[stage]
}

function computeStageTotalsForBrand(activeBrand: BrandTab): HeaderCounts {
  const lines = mapAllMockLines().filter((line) => matchesBrandTab(line.product.brand, activeBrand))
  return computeHeaderCounts(lines)
}

export function getFallbackLines(activeBrand: BrandTab): PurchaseLinesResponse {
  const allLines = mapAllMockLines()
  const filteredLines = activeBrand === 'ALL'
    ? allLines
    : allLines.filter((line) => matchesBrandTab(line.product.brand, activeBrand))

  return {
    lines: filteredLines,
    headerCounts: computeHeaderCounts(filteredLines),
    brandCounts: computeBrandCounts(allLines),
  }
}

export function getFallbackCustomersForProduct(productId: string): CustomerOption[] {
  const customers = new Map<string, CustomerOption>()

  for (const order of getMockOrders()) {
    for (const line of order.lineItems) {
      if (line.productId !== productId) continue

      for (const allocation of line.customerAllocations) {
        customers.set(allocation.customerId, {
          id: allocation.customerId,
          name: allocation.customerName,
        })
      }
    }
  }

  return Array.from(customers.values()).sort((left, right) => left.name.localeCompare(right.name))
}

export function moveFallbackLine({
  lineId,
  fromStage,
  toStage,
  qty,
  brand,
}: {
  lineId: string
  fromStage: PurchaseStage
  toStage: Exclude<PurchaseStage, 'UNALLOCATED'>
  qty: number
  brand: BrandTab
}): { lineItem: PurchaseTrackerLine; stageTotals: HeaderCounts } {
  const target = getMutableLine(lineId)

  if (!target) {
    throw new AppError('NOT_FOUND', `POLineItem '${lineId}' not found`, 404)
  }

  if (!(LEGAL_TRANSITIONS[fromStage] ?? []).includes(toStage)) {
    throw new AppError('ILLEGAL_STAGE_TRANSITION', `Cannot move from ${fromStage} to ${toStage}.`, 422)
  }

  const availableQty = getAvailableQty(target.line, fromStage)
  if (qty > availableQty) {
    throw new AppError(
      'INSUFFICIENT_QTY',
      `Only ${availableQty} unit(s) are available at ${fromStage}.`,
      422,
    )
  }

  if (fromStage !== 'UNALLOCATED') {
    const fromField = DB_FIELD_BY_STAGE[fromStage]
    target.line[fromField] -= qty
  }

  const toField = DB_FIELD_BY_STAGE[toStage]
  target.line[toField] += qty

  return {
    lineItem: mapMockLine(target.order, target.line),
    stageTotals: computeStageTotalsForBrand(brand),
  }
}

export function shouldUseFallback(error: unknown): boolean {
  return error instanceof Error && /Can't reach database server/i.test(error.message)
}

export function resetFallbackOrders(): void {
  mockOrders = structuredClone(MOCK_PURCHASE_ORDERS)
}
