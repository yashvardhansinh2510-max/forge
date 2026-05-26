export const STAGE_ORDER = [
  'NEEDS_PO',
  'ORDERED',
  'AT_GODOWN',
  'IN_BOX',
  'DISPATCHED',
] as const

export type PurchaseStage = typeof STAGE_ORDER[number]

export interface HeaderCounts {
  NEEDS_PO: number
  ORDERED: number
  AT_GODOWN: number
  IN_BOX: number
  DISPATCHED: number
}

export const STAGE_LABEL: Record<PurchaseStage, string> = {
  NEEDS_PO:   'Needs PO',
  ORDERED:    'Ordered',
  AT_GODOWN:  'At Godown',
  IN_BOX:     'In Box',
  DISPATCHED: 'Dispatched',
}

export const STAGE_SHORT_LABEL: Record<PurchaseStage, string> = {
  NEEDS_PO:   'NEEDS PO',
  ORDERED:    'ORDERED',
  AT_GODOWN:  'AT GODOWN',
  IN_BOX:     'IN BOX',
  DISPATCHED: 'DISPATCHED',
}

export const STAGE_COLORS: Record<PurchaseStage, string> = {
  NEEDS_PO:   '#3B82F6',
  ORDERED:    '#F59E0B',
  AT_GODOWN:  '#8B5CF6',
  IN_BOX:     '#06B6D4',
  DISPATCHED: '#10B981',
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
    NEEDS_PO:   0,
    ORDERED:    0,
    AT_GODOWN:  0,
    IN_BOX:     0,
    DISPATCHED: 0,
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
// qtyPendingCo  → ORDERED
// qtyAtGodown   → AT_GODOWN
// qtyInBox      → IN_BOX
// qtyDispatched → DISPATCHED
// NEEDS_PO is derived: qtyOrdered minus all staged qty
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
    NEEDS_PO:   Math.max(0, line.qtyOrdered - staged),
    ORDERED:    line.qtyPendingCo,
    AT_GODOWN:  line.qtyAtGodown,
    IN_BOX:     line.qtyInBox,
    DISPATCHED: line.qtyDispatched,
  }
}

export function addCounts(target: HeaderCounts, source: HeaderCounts): HeaderCounts {
  return {
    NEEDS_PO:   target.NEEDS_PO   + source.NEEDS_PO,
    ORDERED:    target.ORDERED    + source.ORDERED,
    AT_GODOWN:  target.AT_GODOWN  + source.AT_GODOWN,
    IN_BOX:     target.IN_BOX     + source.IN_BOX,
    DISPATCHED: target.DISPATCHED + source.DISPATCHED,
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
