export const STAGE_ORDER = [
  'ORDER_IN_CO',
  'CO_BILLING',
  'INBOX',
  'DISPATCHED',
  'COMPLETED',
] as const

export type PurchaseStage = typeof STAGE_ORDER[number]

export interface HeaderCounts {
  ORDER_IN_CO: number
  CO_BILLING:  number
  INBOX:       number
  DISPATCHED:  number
  COMPLETED:   number
}

export const STAGE_LABEL: Record<PurchaseStage, string> = {
  ORDER_IN_CO: 'Order In Co.',
  CO_BILLING:  'Co. Billing',
  INBOX:       'Inbox',
  DISPATCHED:  'Dispatched',
  COMPLETED:   'Completed',
}

export const STAGE_SHORT_LABEL: Record<PurchaseStage, string> = {
  ORDER_IN_CO: 'ORDER IN CO',
  CO_BILLING:  'CO. BILLING',
  INBOX:       'INBOX',
  DISPATCHED:  'DISPATCHED',
  COMPLETED:   'COMPLETED',
}

export const STAGE_COLORS: Record<PurchaseStage, string> = {
  ORDER_IN_CO: '#3B82F6',
  CO_BILLING:  '#F59E0B',
  INBOX:       '#8B5CF6',
  DISPATCHED:  '#06B6D4',
  COMPLETED:   '#10B981',
}

export const BRAND_TABS = ['ALL', 'GROHE', 'HANSGROHE', 'VITRA', 'KAJARIA', 'GEBERIT'] as const

export type BrandTab = typeof BRAND_TABS[number]
export type BrandTabFilter = Exclude<BrandTab, 'ALL'>

export const BRAND_GROUPS: Record<BrandTabFilter, string[]> = {
  GROHE:     ['GROHE'],
  HANSGROHE: ['HANSGROHE', 'AXOR'],
  VITRA:     ['VITRA'],
  KAJARIA:   ['KAJARIA'],
  GEBERIT:   ['GEBERIT'],
}

export const BRAND_ACCENTS: Record<BrandTabFilter, string> = {
  GROHE:     '#00A3E0',
  HANSGROHE: '#E30613',
  VITRA:     '#005BAC',
  KAJARIA:   '#C84B1F',
  GEBERIT:   '#003087',
}

export interface PurchaseTrackerLine {
  id: string
  poId: string
  poNumber: string
  vendorName: string | null
  projectId: string | null
  customer: {
    id: string
    name: string
    siteAddress: string | null
  } | null
  product: {
    id: string
    sku: string
    name: string
    brand: string
    imageUrl: string | null
  }
  qtyOrdered: number
  qtyReceived: number
  stages: HeaderCounts
  followUpStatus?: string | null
  createdAt?: string | null
  landingCost?: number | null
  priority?: string | null
  assignedTo?: { id: string; name: string } | null
  stageEnteredAt?: string | null
  allocationStatus?: string | null
}

export interface PurchaseLinesResponse {
  lines: PurchaseTrackerLine[]
  headerCounts: HeaderCounts
  brandCounts: Record<BrandTab, number>
}

export interface CustomerOption {
  id: string
  name: string
}

export function createEmptyHeaderCounts(): HeaderCounts {
  return {
    ORDER_IN_CO: 0,
    CO_BILLING:  0,
    INBOX:       0,
    DISPATCHED:  0,
    COMPLETED:   0,
  }
}

export function createEmptyBrandCounts(): Record<BrandTab, number> {
  return {
    ALL:       0,
    GROHE:     0,
    HANSGROHE: 0,
    VITRA:     0,
    KAJARIA:   0,
    GEBERIT:   0,
  }
}

export function normalizeBrandTab(value: string | null | undefined): BrandTab {
  if (!value) return 'ALL'
  const upper = value.toUpperCase()
  return (BRAND_TABS as readonly string[]).includes(upper) ? (upper as BrandTab) : 'ALL'
}

export function getBrandTabForBrand(brand: string): BrandTabFilter | null {
  if (brand === 'AXOR' || brand === 'HANSGROHE') return 'HANSGROHE'
  if (brand === 'GROHE') return 'GROHE'
  if (brand === 'VITRA') return 'VITRA'
  if (brand === 'KAJARIA') return 'KAJARIA'
  if (brand === 'GEBERIT') return 'GEBERIT'
  return null
}

export function getBrandSectionKey(brand: string): string {
  return getBrandTabForBrand(brand) ?? brand
}

export function getBrandsForTab(tab: BrandTab): string[] | null {
  if (tab === 'ALL') return null
  return BRAND_GROUPS[tab]
}

export function matchesBrandTab(brand: string, tab: BrandTab): boolean {
  const brands = getBrandsForTab(tab)
  return brands === null ? true : brands.includes(brand)
}

// Maps DB qty columns (POLineItem) to the 5 tracker stages.
// qtyPendingCo  → CO_BILLING
// qtyAtGodown   → INBOX
// qtyInBox      → DISPATCHED
// qtyDispatched → COMPLETED
// ORDER_IN_CO is derived: qtyOrdered minus all staged qty
export function countsFromDbLine(line: {
  qtyOrdered: number
  qtyPendingCo: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
}): HeaderCounts {
  const staged =
    line.qtyPendingCo +
    line.qtyAtGodown +
    line.qtyInBox +
    line.qtyDispatched

  return {
    ORDER_IN_CO: Math.max(0, line.qtyOrdered - staged),
    CO_BILLING:  line.qtyPendingCo,
    INBOX:       line.qtyAtGodown,
    DISPATCHED:  line.qtyInBox,
    COMPLETED:   line.qtyDispatched,
  }
}

export function addCounts(target: HeaderCounts, source: HeaderCounts): HeaderCounts {
  return {
    ORDER_IN_CO: target.ORDER_IN_CO + source.ORDER_IN_CO,
    CO_BILLING:  target.CO_BILLING  + source.CO_BILLING,
    INBOX:       target.INBOX       + source.INBOX,
    DISPATCHED:  target.DISPATCHED  + source.DISPATCHED,
    COMPLETED:   target.COMPLETED   + source.COMPLETED,
  }
}

export function computeHeaderCounts(lines: PurchaseTrackerLine[]): HeaderCounts {
  return lines.reduce(
    (acc, line) => addCounts(acc, line.stages),
    createEmptyHeaderCounts(),
  )
}

export function computeBrandCounts(lines: PurchaseTrackerLine[]): Record<BrandTab, number> {
  return lines.reduce((acc, line) => {
    acc.ALL += 1
    const tab = getBrandTabForBrand(line.product.brand)
    if (tab) acc[tab] += 1
    return acc
  }, createEmptyBrandCounts())
}

export function getStageQuantity(line: PurchaseTrackerLine, stage: PurchaseStage): number {
  return line.stages[stage]
}

export function getActiveStages(line: PurchaseTrackerLine): PurchaseStage[] {
  return STAGE_ORDER.filter((stage) => line.stages[stage] > 0)
}

export function getVisibleMoveStages(line: PurchaseTrackerLine): PurchaseStage[] {
  return getActiveStages(line).slice(0, 2)
}

export function getOverflowStages(line: PurchaseTrackerLine): PurchaseStage[] {
  return getActiveStages(line).slice(2)
}
