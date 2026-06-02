export const STAGE_ORDER = [
  'UNALLOCATED',
  'PENDING_CO',
  'PENDING_DIST',
  'GODOWN',
  'IN_BOX',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const

export type PurchaseStage = typeof STAGE_ORDER[number]

export interface HeaderCounts {
  UNALLOCATED: number
  PENDING_CO: number
  PENDING_DIST: number
  GODOWN: number
  IN_BOX: number
  DISPATCHED: number
  NOT_DISPLAYED: number
}

export const STAGE_LABEL: Record<PurchaseStage, string> = {
  UNALLOCATED: 'Unallocated',
  PENDING_CO: 'Pend. Company',
  PENDING_DIST: 'Pend. Distributor',
  GODOWN: 'At Godown',
  IN_BOX: 'In Box',
  DISPATCHED: 'Dispatched',
  NOT_DISPLAYED: 'Not Displayed',
}

export const STAGE_SHORT_LABEL: Record<PurchaseStage, string> = {
  UNALLOCATED: 'UNALLOCATED',
  PENDING_CO: 'PEND.CO',
  PENDING_DIST: 'PEND.DIST',
  GODOWN: 'GODOWN',
  IN_BOX: 'IN BOX',
  DISPATCHED: 'DISPATCHED',
  NOT_DISPLAYED: 'NOT DISPLAYED',
}

export const STAGE_COLORS: Record<PurchaseStage, string> = {
  UNALLOCATED: '#3B82F6',
  PENDING_CO: '#F59E0B',
  PENDING_DIST: '#F97316',
  GODOWN: '#8B5CF6',
  IN_BOX: '#06B6D4',
  DISPATCHED: '#10B981',
  NOT_DISPLAYED: '#6B7280',
}

export const BRAND_TABS = ['ALL', 'GROHE', 'HANSGROHE', 'VITRA', 'GEBERIT'] as const

export type BrandTab = typeof BRAND_TABS[number]
export type BrandTabFilter = Exclude<BrandTab, 'ALL'>

export const BRAND_GROUPS: Record<BrandTabFilter, string[]> = {
  GROHE: ['GROHE'],
  HANSGROHE: ['HANSGROHE', 'AXOR'],
  VITRA: ['VITRA'],
  GEBERIT: ['GEBERIT'],
}

export const BRAND_ACCENTS: Record<BrandTabFilter, string> = {
  GROHE: '#00A3E0',
  HANSGROHE: '#E30613',
  VITRA: '#005BAC',
  GEBERIT: '#003087',
}

export interface PurchaseTrackerLine {
  id: string
  poId: string
  poNumber: string
  vendorName: string | null
  projectId: string | null
  createdAt?: string
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
    seriesName: string | null
    finishName: string | null
    articleNumber: string | null
    mrp: number
    unit: string
    tier: string
  }
  qtyOrdered: number
  qtyTransferredIn: number
  qtyTransferredOut: number
  qtyReceived: number
  stages: HeaderCounts
  followUpStatus?: string | null
}

export type UrgencyLevel = 'critical' | 'warning' | 'attention' | 'normal'

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  attention: '#3B82F6',
  normal: 'transparent',
}

export function getLineUrgency(line: PurchaseTrackerLine): UrgencyLevel {
  if (!line.createdAt) return 'normal'
  const ageMs = Date.now() - new Date(line.createdAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const earliest = STAGE_ORDER.find((s) => line.stages[s] > 0)
  if (!earliest || earliest === 'DISPATCHED' || earliest === 'NOT_DISPLAYED') return 'normal'
  if ((earliest === 'GODOWN' || earliest === 'IN_BOX') && ageDays > 21) return 'critical'
  if ((earliest === 'GODOWN' || earliest === 'IN_BOX') && ageDays > 14) return 'warning'
  if ((earliest === 'PENDING_CO' || earliest === 'PENDING_DIST') && ageDays > 14) return 'warning'
  if ((earliest === 'PENDING_CO' || earliest === 'PENDING_DIST') && ageDays > 7) return 'attention'
  return 'normal'
}

export interface PurchaseLinesResponse {
  lines: PurchaseTrackerLine[]
  headerCounts: HeaderCounts
  brandCounts: Record<BrandTab, number>
}

export interface CustomerOption {
  id: string
  name: string
  lineId?: string
}

export function createEmptyHeaderCounts(): HeaderCounts {
  return {
    UNALLOCATED: 0,
    PENDING_CO: 0,
    PENDING_DIST: 0,
    GODOWN: 0,
    IN_BOX: 0,
    DISPATCHED: 0,
    NOT_DISPLAYED: 0,
  }
}

export function createEmptyBrandCounts(): Record<BrandTab, number> {
  return {
    ALL: 0,
    GROHE: 0,
    HANSGROHE: 0,
    VITRA: 0,
    GEBERIT: 0,
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

export function effectiveCeiling(line: {
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
}): number {
  return Math.max(0, line.qtyOrdered + (line.qtyTransferredIn ?? 0) - (line.qtyTransferredOut ?? 0))
}

export function countsFromDbLine(line: {
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
  qtyPendingCo: number
  qtyPendingDist: number
  qtyAtGodown: number
  qtyInBox: number
  qtyDispatched: number
  qtyNotDisplayed: number
}): HeaderCounts {
  const staged =
    line.qtyPendingCo +
    line.qtyPendingDist +
    line.qtyAtGodown +
    line.qtyInBox +
    line.qtyDispatched +
    line.qtyNotDisplayed

  return {
    UNALLOCATED: Math.max(0, effectiveCeiling(line) - staged),
    PENDING_CO: line.qtyPendingCo,
    PENDING_DIST: line.qtyPendingDist,
    GODOWN: line.qtyAtGodown,
    IN_BOX: line.qtyInBox,
    DISPATCHED: line.qtyDispatched,
    NOT_DISPLAYED: line.qtyNotDisplayed,
  }
}

export function addCounts(target: HeaderCounts, source: HeaderCounts): HeaderCounts {
  return {
    UNALLOCATED: target.UNALLOCATED + source.UNALLOCATED,
    PENDING_CO: target.PENDING_CO + source.PENDING_CO,
    PENDING_DIST: target.PENDING_DIST + source.PENDING_DIST,
    GODOWN: target.GODOWN + source.GODOWN,
    IN_BOX: target.IN_BOX + source.IN_BOX,
    DISPATCHED: target.DISPATCHED + source.DISPATCHED,
    NOT_DISPLAYED: target.NOT_DISPLAYED + source.NOT_DISPLAYED,
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

export function buildStageTotals(lines: Array<{
  qtyOrdered: number
  qtyTransferredIn?: number
  qtyTransferredOut?: number
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

export interface StageSums {
  ordered: number
  transferredIn?: number
  transferredOut?: number
  pendingCo: number
  pendingDist: number
  godown: number
  inBox: number
  dispatched: number
  notDisplayed: number
}

export function computeStageTotalsResult(sums: StageSums) {
  const ceiling = sums.ordered + (sums.transferredIn ?? 0) - (sums.transferredOut ?? 0)
  const staged =
    sums.pendingCo + sums.pendingDist + sums.godown +
    sums.inBox + sums.dispatched + sums.notDisplayed
  return {
    unallocated: Math.max(0, ceiling - staged),
    pendingCo: sums.pendingCo,
    pendingDist: sums.pendingDist,
    godown: sums.godown,
    inBox: sums.inBox,
    dispatched: sums.dispatched,
    notDisplayed: sums.notDisplayed,
  }
}
