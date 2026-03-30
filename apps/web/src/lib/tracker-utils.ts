// lib/tracker-utils.ts
// Shared filtering and KPI computation helpers for the Purchase Tracker.

import type {
  MockPurchaseOrder,
  MockPOLineItem,
  CustomerAllocation,
} from '@/lib/mock/procurement-data'
import { BRAND_GROUPS } from '@/lib/mock/procurement-data'
import type { KPICardKey } from '@/lib/usePurchasesStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlatLine {
  order: MockPurchaseOrder
  line:  MockPOLineItem
}

export interface TrackerKPIs {
  totalOrdered:    number
  pendingFromCo:   number
  pendingFromDist: number
  atGodown:        number
  inBox:           number
  dispatched:      number
  notDisplayed:    number
}

export interface DrillDownLine {
  order: MockPurchaseOrder
  line:  MockPOLineItem
  alloc: CustomerAllocation
}

export interface LineAggregates {
  inBoxQty:      number
  dispatchedQty: number
  pendingQty:    number  // qtyPendingCo + qtyPendingDist
  customers:     string[]
}

// ─── Brand matching ───────────────────────────────────────────────────────────

/**
 * Returns the set of individual brand values matched by a tab key.
 * 'ALL' matches everything. 'HANSGROHE' matches ['HANSGROHE', 'AXOR'].
 */
export function brandsForTab(tab: string): string[] | null {
  if (tab === 'ALL') return null
  return BRAND_GROUPS[tab] ?? [tab]
}

function lineMatchesBrand(line: MockPOLineItem, tab: string): boolean {
  const brands = brandsForTab(tab)
  return brands === null || brands.includes(line.productBrand)
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Flatten all PO line items into {order, line} pairs, applying:
 *   - brand tab filter (ALL or grouped brand tab key)
 *   - vendor company filter ([] = show all companies)
 *   - search query (matches productName or productSku, case-insensitive)
 */
export function getFilteredLines(
  orders:          MockPurchaseOrder[],
  activeBrand:     string,
  activeCompanies: string[],
  searchQuery:     string,
): FlatLine[] {
  const q = searchQuery.trim().toLowerCase()

  return orders.flatMap((order) =>
    order.lineItems
      .filter((line) => lineMatchesBrand(line, activeBrand))
      .filter(() => activeCompanies.length === 0 || activeCompanies.includes(order.vendorName ?? ''))
      .filter((line) =>
        !q ||
        line.productName.toLowerCase().includes(q) ||
        line.productSku.toLowerCase().includes(q),
      )
      .map((line) => ({ order, line })),
  )
}

/**
 * Unique vendor company names visible under the current brand tab.
 */
export function getVendorCompanies(
  orders:      MockPurchaseOrder[],
  activeBrand: string,
): string[] {
  const seen = new Set<string>()
  for (const order of orders) {
    const hasMatchingLine = order.lineItems.some((l) => lineMatchesBrand(l, activeBrand))
    if (hasMatchingLine && order.vendorName) seen.add(order.vendorName)
  }
  return Array.from(seen).sort()
}

// ─── KPI computation — stage qty fields ──────────────────────────────────────

export function computeKPIs(lines: FlatLine[]): TrackerKPIs {
  let totalOrdered    = 0
  let pendingFromCo   = 0
  let pendingFromDist = 0
  let atGodown        = 0
  let inBox           = 0
  let dispatched      = 0
  let notDisplayed    = 0

  for (const { line } of lines) {
    totalOrdered    += line.qtyOrdered
    pendingFromCo   += line.qtyPendingCo
    pendingFromDist += line.qtyPendingDist
    atGodown        += line.qtyAtGodown
    inBox           += line.qtyInBox
    dispatched      += line.qtyDispatched
    notDisplayed    += line.qtyNotDisplayed
  }

  return { totalOrdered, pendingFromCo, pendingFromDist, atGodown, inBox, dispatched, notDisplayed }
}

// ─── Stage qty field for a KPI key ───────────────────────────────────────────

type StageQtyKey = keyof Pick<
  MockPOLineItem,
  'qtyPendingCo' | 'qtyPendingDist' | 'qtyAtGodown' | 'qtyInBox' | 'qtyDispatched' | 'qtyNotDisplayed'
>

const CARD_TO_STAGE_FIELD: Partial<Record<KPICardKey, StageQtyKey>> = {
  pendingFromCo:   'qtyPendingCo',
  pendingFromDist: 'qtyPendingDist',
  atGodown:        'qtyAtGodown',
  inBox:           'qtyInBox',
  dispatched:      'qtyDispatched',
  notDisplayed:    'qtyNotDisplayed',
}

// ─── KPI drill-down ───────────────────────────────────────────────────────────

/**
 * Lines relevant to a given KPI card drill-down panel.
 * For 'totalOrdered', returns every matching line.
 * For stage cards, returns only lines that have qty > 0 at that stage.
 */
export function getLinesForKPIDrillDown(
  orders:          MockPurchaseOrder[],
  cardKey:         KPICardKey,
  activeBrand:     string,
  activeCompanies: string[],
  searchQuery:     string,
): FlatLine[] {
  const stageField = CARD_TO_STAGE_FIELD[cardKey]
  const q = searchQuery.trim().toLowerCase()
  const result: FlatLine[] = []

  for (const order of orders) {
    if (activeCompanies.length > 0 && !activeCompanies.includes(order.vendorName ?? '')) continue
    for (const line of order.lineItems) {
      if (!lineMatchesBrand(line, activeBrand)) continue
      if (q && !line.productName.toLowerCase().includes(q) && !line.productSku.toLowerCase().includes(q)) continue
      if (stageField === undefined || line[stageField] > 0) {
        result.push({ order, line })
      }
    }
  }

  return result
}

// ─── Per-line aggregates ──────────────────────────────────────────────────────

export function getLineAggregates(line: MockPOLineItem): LineAggregates {
  let inBoxQty      = 0
  let dispatchedQty = 0
  const customerSet = new Set<string>()

  for (const alloc of line.customerAllocations) {
    customerSet.add(alloc.customerName)
    if (alloc.boxStatus === 'IN_BOX' || alloc.boxStatus === 'DEL_PENDING') inBoxQty      += alloc.qty
    if (alloc.boxStatus === 'DELIVERED' || alloc.boxStatus === 'GIVEN_OTHER') dispatchedQty += alloc.qty
  }

  return {
    inBoxQty,
    dispatchedQty,
    pendingQty: line.qtyPendingCo + line.qtyPendingDist,
    customers:  Array.from(customerSet),
  }
}

// ─── Customer-filtered lines ──────────────────────────────────────────────────

/**
 * All line items allocated to a specific customer, optionally filtered by brand tab.
 */
export function getLinesForCustomer(
  orders:      MockPurchaseOrder[],
  customerId:  string,
  brandFilter: string,
): Array<{ order: MockPurchaseOrder; line: MockPOLineItem; alloc: CustomerAllocation }> {
  const result: Array<{ order: MockPurchaseOrder; line: MockPOLineItem; alloc: CustomerAllocation }> = []

  for (const order of orders) {
    for (const line of order.lineItems) {
      if (!lineMatchesBrand(line, brandFilter)) continue
      const alloc = line.customerAllocations.find((a) => a.customerId === customerId)
      if (alloc) result.push({ order, line, alloc })
    }
  }

  return result
}

// ─── Customer stage counts ───────────────────────────────────────────────────

export interface CustomerStageCounts {
  totalOrdered:    number
  pendingFromCo:   number
  pendingFromDist: number
  atGodown:        number
  inBox:           number
  dispatched:      number
  notDisplayed:    number
}

/**
 * Compute stage counts for a single customer's allocated line items.
 */
export function getCustomerStageCounts(
  orders:     MockPurchaseOrder[],
  customerId: string,
  brandTab:   string,
): CustomerStageCounts {
  const counts: CustomerStageCounts = {
    totalOrdered: 0, pendingFromCo: 0, pendingFromDist: 0,
    atGodown: 0, inBox: 0, dispatched: 0, notDisplayed: 0,
  }

  for (const order of orders) {
    for (const line of order.lineItems) {
      if (!lineMatchesBrand(line, brandTab)) continue
      const alloc = line.customerAllocations.find((a) => a.customerId === customerId)
      if (!alloc) continue
      // Use allocation qty as the total for this customer's portion
      counts.totalOrdered += alloc.qty
      // Stage qtys are at line level — prorate by alloc.qty / line.qtyOrdered
      const ratio = line.qtyOrdered > 0 ? alloc.qty / line.qtyOrdered : 0
      counts.pendingFromCo   += Math.round(line.qtyPendingCo   * ratio)
      counts.pendingFromDist += Math.round(line.qtyPendingDist * ratio)
      counts.atGodown        += Math.round(line.qtyAtGodown    * ratio)
      counts.inBox           += Math.round(line.qtyInBox       * ratio)
      counts.dispatched      += Math.round(line.qtyDispatched  * ratio)
      counts.notDisplayed    += Math.round(line.qtyNotDisplayed * ratio)
    }
  }

  return counts
}

// ─── Initials helper ──────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')
}

/** Deterministic color from name string */
export function getAvatarColor(name: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#64748b',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  }
  return colors[Math.abs(hash) % colors.length] ?? '#6366f1'
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso) < new Date()
}
