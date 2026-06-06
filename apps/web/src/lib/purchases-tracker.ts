// ─── Canonical stage order ─────────────────────────────────────────────────────

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

// ─── Canonical label maps — SSOT for all stage text ───────────────────────────
// Every other label table or string in the module derives from these two.

export const STAGE_LABEL: Record<PurchaseStage, string> = {
  UNALLOCATED:  'No Customer',
  PENDING_CO:   'ORDER IN COMPANY',
  PENDING_DIST: 'COMPANY BILLING',
  GODOWN:       'IN BOX',
  IN_BOX:       'IN BOX',
  DISPATCHED:   'DISPATCHED',
  NOT_DISPLAYED:'Closed',
}

export const STAGE_SHORT_LABEL: Record<PurchaseStage, string> = {
  UNALLOCATED:  'No Customer',
  PENDING_CO:   'Order Co.',
  PENDING_DIST: 'Co. Billing',
  GODOWN:       'In Box',
  IN_BOX:       'In Box',
  DISPATCHED:   'Dispatched',
  NOT_DISPLAYED:'Closed',
}

// ─── Canonical stage → DB field mapping — SSOT for all Prisma updates ─────────

export const DB_STAGE_FIELDS = {
  PENDING_CO:    'qtyPendingCo',
  PENDING_DIST:  'qtyPendingDist',
  GODOWN:        'qtyAtGodown',
  IN_BOX:        'qtyInBox',
  DISPATCHED:    'qtyDispatched',
  NOT_DISPLAYED: 'qtyNotDisplayed',
} as const satisfies Record<Exclude<PurchaseStage, 'UNALLOCATED'>, string>

export type DbStageField = (typeof DB_STAGE_FIELDS)[keyof typeof DB_STAGE_FIELDS]

export function stageToDbField(stage: Exclude<PurchaseStage, 'UNALLOCATED'>): DbStageField {
  return DB_STAGE_FIELDS[stage]
}

// ─── Operator-facing display stage model ──────────────────────────────────────
// GODOWN and IN_BOX are unified as IN_BOX_COMBINED — staff never sees the distinction.

export const DISPLAY_STAGE_ORDER = [
  'UNALLOCATED',
  'PENDING_CO',
  'PENDING_DIST',
  'IN_BOX_COMBINED',
  'DISPATCHED',
  'NOT_DISPLAYED',
] as const

export type DisplayStage = typeof DISPLAY_STAGE_ORDER[number]

export const DISPLAY_STAGE_LABEL: Record<DisplayStage, string> = {
  UNALLOCATED:     STAGE_LABEL.UNALLOCATED,
  PENDING_CO:      STAGE_LABEL.PENDING_CO,
  PENDING_DIST:    STAGE_LABEL.PENDING_DIST,
  IN_BOX_COMBINED: STAGE_LABEL.IN_BOX,
  DISPATCHED:      STAGE_LABEL.DISPATCHED,
  NOT_DISPLAYED:   STAGE_LABEL.NOT_DISPLAYED,
}

export const DISPLAY_STAGE_SHORT: Record<DisplayStage, string> = {
  UNALLOCATED:     STAGE_SHORT_LABEL.UNALLOCATED,
  PENDING_CO:      STAGE_SHORT_LABEL.PENDING_CO,
  PENDING_DIST:    STAGE_SHORT_LABEL.PENDING_DIST,
  IN_BOX_COMBINED: STAGE_SHORT_LABEL.IN_BOX,
  DISPATCHED:      STAGE_SHORT_LABEL.DISPATCHED,
  NOT_DISPLAYED:   STAGE_SHORT_LABEL.NOT_DISPLAYED,
}

// Includes pseudo-stages (TRANSFERRED_IN/OUT) used in activity log.
// Canonical stages derive from STAGE_LABEL above.
export const STAGE_FRIENDLY_NAME: Record<string, string> = {
  ...STAGE_LABEL,
  TRANSFERRED_IN:  'Received from transfer',
  TRANSFERRED_OUT: 'Given to customer',
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

// ─── Header counts ─────────────────────────────────────────────────────────────

export interface HeaderCounts {
  UNALLOCATED: number
  PENDING_CO: number
  PENDING_DIST: number
  GODOWN: number
  IN_BOX: number
  DISPATCHED: number
  NOT_DISPLAYED: number
}

export function getDisplayStageCount(counts: HeaderCounts, stage: DisplayStage): number {
  if (stage === 'IN_BOX_COMBINED') return counts.GODOWN + counts.IN_BOX
  return counts[stage as PurchaseStage]
}

export function lineMatchesDisplayStage(line: PurchaseTrackerLine, stage: DisplayStage): boolean {
  if (stage === 'IN_BOX_COMBINED') return line.stages.GODOWN > 0 || line.stages.IN_BOX > 0
  return line.stages[stage as PurchaseStage] > 0
}

export function getInBoxQty(line: PurchaseTrackerLine): number {
  return line.stages.GODOWN + line.stages.IN_BOX
}

// ─── Brand tabs ────────────────────────────────────────────────────────────────

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

// ─── Core data types ───────────────────────────────────────────────────────────

export interface PurchaseTrackerLine {
  id: string
  poId: string
  poNumber: string
  vendorName: string | null
  projectId: string | null
  createdAt?: string
  locationNote?: string | null
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
  currentLocation: string | null      // derived from latest StageMovement.location
  lastActivityAt: string | null       // ISO string of latest StageMovement.movedAt
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

// ─── Dispatch status model ─────────────────────────────────────────────────────

export type DispatchStatus =
  | 'ready'                 // IN_BOX > 0 — packed, can ship now
  | 'awaiting_packing'      // GODOWN > 0, IN_BOX === 0 — here, needs boxing
  | 'awaiting_distributor'  // PENDING_DIST > 0 — with distributor
  | 'awaiting_company'      // PENDING_CO > 0 — manufacturer processing
  | 'done'                  // DISPATCHED / NOT_DISPLAYED only

export const DISPATCH_STATUS_LABEL: Record<DispatchStatus, string> = {
  ready:                'Ready',
  awaiting_packing:     'Awaiting Packing',
  awaiting_distributor: 'Company Billing',
  awaiting_company:     'Awaiting Company',
  done:                 'Dispatched',
}

export const DISPATCH_STATUS_COLOR: Record<DispatchStatus, string> = {
  ready:                '#10B981',
  awaiting_packing:     '#3B82F6',
  awaiting_distributor: '#F59E0B',
  awaiting_company:     '#9CA3AF',
  done:                 '#6EE7B7',
}

export const DISPATCH_STATUS_BG: Record<DispatchStatus, string> = {
  ready:                '#f0fdf4',
  awaiting_packing:     '#eff6ff',
  awaiting_distributor: '#fffbeb',
  awaiting_company:     '#f9fafb',
  done:                 '#f0fdf4',
}

// Maps dispatch status back to the corresponding raw stage for label lookups.
export const DISPATCH_STATUS_TO_STAGE: Record<DispatchStatus, PurchaseStage> = {
  ready:                'IN_BOX',
  awaiting_packing:     'GODOWN',
  awaiting_distributor: 'PENDING_DIST',
  awaiting_company:     'PENDING_CO',
  done:                 'DISPATCHED',
}

/** All active statuses for a line, ordered by priority (most actionable first). */
export function getLineDispatchStatuses(line: PurchaseTrackerLine): { status: DispatchStatus; qty: number }[] {
  const result: { status: DispatchStatus; qty: number }[] = []
  if (line.stages.IN_BOX > 0) result.push({ status: 'ready', qty: line.stages.IN_BOX })
  if (line.stages.GODOWN > 0) result.push({ status: 'awaiting_packing', qty: line.stages.GODOWN })
  if (line.stages.PENDING_DIST > 0) result.push({ status: 'awaiting_distributor', qty: line.stages.PENDING_DIST })
  if (line.stages.PENDING_CO > 0) result.push({ status: 'awaiting_company', qty: line.stages.PENDING_CO })
  if (result.length === 0) result.push({ status: 'done', qty: line.stages.DISPATCHED + line.stages.NOT_DISPLAYED })
  return result
}

/** The headline status — what the worker sees at a glance. */
export function getLinePrimaryStatus(line: PurchaseTrackerLine): DispatchStatus {
  return getLineDispatchStatuses(line)[0]?.status ?? 'done'
}

/** True if this line has anything shippable right now (IN_BOX > 0). */
export function lineIsReady(line: PurchaseTrackerLine): boolean {
  return line.stages.IN_BOX > 0
}

// ─── Customer-level aggregated metrics ─────────────────────────────────────────

export interface CustomerMetrics {
  ordered: number      // effectiveCeiling across all lines
  received: number     // GODOWN + IN_BOX + DISPATCHED + NOT_DISPLAYED
  packed: number       // IN_BOX only
  dispatched: number   // DISPATCHED + NOT_DISPLAYED
  pending: number      // PENDING_CO + PENDING_DIST
  ready: number        // IN_BOX
  hasAttention: boolean
}

export function getCustomerMetrics(lines: PurchaseTrackerLine[]): CustomerMetrics {
  let ordered = 0, received = 0, packed = 0, dispatched = 0, pending = 0
  let hasAttention = false
  for (const l of lines) {
    ordered += effectiveCeiling(l)
    received += l.stages.GODOWN + l.stages.IN_BOX + l.stages.DISPATCHED + l.stages.NOT_DISPLAYED
    packed += l.stages.IN_BOX
    dispatched += l.stages.DISPATCHED + l.stages.NOT_DISPLAYED
    pending += l.stages.PENDING_CO + l.stages.PENDING_DIST
    const u = getLineUrgency(l)
    if (u === 'critical' || u === 'warning') hasAttention = true
  }
  return { ordered, received, packed, dispatched, pending, ready: packed, hasAttention }
}

// ─── Keep old DispatchReadiness for any callers not yet migrated ───────────────
/** @deprecated Use getLinePrimaryStatus instead. */
export type DispatchReadiness = 'waiting' | 'in_box' | 'dispatched' | 'archived'
/** @deprecated */
export function getDispatchReadiness(line: PurchaseTrackerLine): DispatchReadiness {
  if (getInBoxQty(line) > 0) return 'in_box'
  if (line.stages.DISPATCHED > 0 || line.stages.NOT_DISPLAYED > 0) {
    return line.stages.PENDING_CO === 0 && line.stages.PENDING_DIST === 0
      ? (line.stages.NOT_DISPLAYED > 0 ? 'archived' : 'dispatched')
      : 'waiting'
  }
  return 'waiting'
}
/** @deprecated */
export const DISPATCH_READINESS_LABEL: Record<DispatchReadiness, string> = {
  waiting: 'Waiting from Supplier',
  in_box: 'In Box — Ready',
  dispatched: 'Dispatched',
  archived: 'Archived',
}
/** @deprecated */
export const DISPATCH_READINESS_COLOR: Record<DispatchReadiness, string> = {
  waiting: '#9CA3AF',
  in_box: '#10B981',
  dispatched: '#6EE7B7',
  archived: '#D1D5DB',
}

// ─── Urgency ───────────────────────────────────────────────────────────────────

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

// ─── Brand utilities ───────────────────────────────────────────────────────────

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

// ─── Quantity calculations ─────────────────────────────────────────────────────

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
  return lines.reduce(
    (acc, line) => addCounts(acc, countsFromDbLine(line)),
    createEmptyHeaderCounts(),
  )
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

// ─── Stage helpers ─────────────────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 2) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

export function lastActivityColor(lastActivityAt: string | null): string {
  if (!lastActivityAt) return 'var(--text-muted)'
  const days = (Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000
  if (days > 14) return '#ef4444'
  if (days > 7)  return '#f59e0b'
  return 'var(--text-muted)'
}
