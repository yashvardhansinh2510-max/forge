// lib/mock/procurement-data.ts
// Mock procurement data aligned with the Prisma PurchaseOrder / POLineItem / InventoryBox schema

import type { POSProduct } from '@/lib/mock/pos-data'

// ─── Types (mirror Prisma schema, mock-friendly) ───────────────────────────────

export type POStatus     = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED'
export type POMode       = 'PROJECT_LINKED' | 'BULK_COMPANY'
export type POLineStatus = 'PENDING' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED'
export type BoxItemStatus = 'STAGED' | 'PARTIALLY_DISPATCHED' | 'FULLY_DISPATCHED'
export type RecipientRole = 'CLIENT' | 'PLUMBER' | 'CONTRACTOR' | 'ARCHITECT' | 'OTHER'

/** Per-customer allocation status for a PO line item */
export type BoxAllocationStatus =
  | 'NEEDS_PO'    // customer placed order, no vendor PO raised yet
  | 'ORDERED'     // vendor PO raised, stock in transit
  | 'AT_GODOWN'   // received at godown, not staged in box
  | 'IN_BOX'      // staged in customer box, delivery pending
  | 'DEL_PENDING' // delivery date set, not yet confirmed
  | 'DELIVERED'   // confirmed delivered to customer
  | 'GIVEN_OTHER' // given to plumber/contractor/etc (has customNote)

export interface CustomerAllocation {
  customerId:        string
  customerName:      string
  qty:               number
  boxStatus:         BoxAllocationStatus
  scheduledDelivery: string | null
  customNote:        string | null   // populated only for GIVEN_OTHER
}

export interface DraftPOLine {
  productId:       string
  product:         POSProduct
  qty:             number
  landingCost:     number | null   // company's cost price
  clientOfferRate: number | null   // from quotation (margin reference)
  roomName?:       string          // PROJECT_LINKED: which room this came from
}

// ─── Stage types ──────────────────────────────────────────────────────────────

export type POStage =
  | 'ORDERED'
  | 'AT_GODOWN'
  | 'IN_BOX'
  | 'DISPATCHED'

/** Legal next stages for each stage — includes backward moves for corrections */
export const LEGAL_TRANSITIONS: Record<'NEEDS_PO' | POStage, POStage[]> = {
  NEEDS_PO:  ['ORDERED', 'AT_GODOWN'],   // direct-to-godown shortcut
  ORDERED:   ['AT_GODOWN'],
  AT_GODOWN: ['IN_BOX', 'ORDERED'],      // ← back to ordered
  IN_BOX:    ['DISPATCHED', 'AT_GODOWN'], // ← back to godown
  DISPATCHED: [],
}

export const STAGE_LABELS: Record<'NEEDS_PO' | POStage, string> = {
  NEEDS_PO:  'Needs PO',
  ORDERED:   'Ordered',
  AT_GODOWN: 'At Godown',
  IN_BOX:    'In Box',
  DISPATCHED: 'Dispatched',
}

export const STAGE_COLORS: Record<POStage, string> = {
  ORDERED:   '#F5A623',
  AT_GODOWN: '#4A90D9',
  IN_BOX:    '#7B68EE',
  DISPATCHED: '#27AE60',
}

export interface MockStageMovement {
  id:           string
  poLineItemId: string
  fromStage:    'ORDERED' | POStage
  toStage:      POStage
  qty:          number
  movedById:    string
  movedByName:  string
  note:         string | null
  movedAt:      string
}

export interface MockPOLineItem {
  id:                   string
  productId:            string
  productName:          string
  productSku:           string
  productBrand:         string
  productImage:         string
  qtyOrdered:           number
  qtyReceived:          number
  // Stage-by-stage quantity tracking (invariant: sum of stages <= qtyOrdered)
  qtyPendingCo:         number
  qtyAtGodown:          number
  qtyInBox:             number
  qtyDispatched:        number
  landingCost:          number | null
  clientOfferRate:      number | null
  status:               POLineStatus
  /** Customer-side distribution of this line item's units */
  customerAllocations:  CustomerAllocation[]
}

// ─── Dispatch audit record (per-unit, immutable once set) ─────────────────────

export interface MockDispatchRecord {
  id:                string
  unitIndex:         number          // 1-based unit number within this box item
  recipientName:     string
  recipientRole:     RecipientRole
  customNote:        string | null   // free text, immutable once saved
  isCustomRecipient: boolean
  dispatchedAt:      string
  dispatchedBy:      string          // user display name
}

export interface MockInventoryBoxItem {
  id:                string
  productId:         string
  productName:       string
  productSku:        string
  productBrand:      string
  productImage:      string
  finishName:        string
  qtyTotal:          number
  qtyDispatched:     number
  status:            BoxItemStatus
  scheduledDelivery: string | null   // ISO date for next planned dispatch
  dispatchRecords:   MockDispatchRecord[]
}

export interface MockInventoryBox {
  id:           string
  boxCode:      string
  projectId:    string
  projectName:  string
  siteAddress:  string
  items:        MockInventoryBoxItem[]
  createdAt:    string
}

export interface MockPurchaseOrder {
  id:               string
  poNumber:         string
  mode:             POMode
  status:           POStatus
  projectId:        string | null
  projectName:      string | null
  clientName:       string | null
  revisionId:       string | null
  vendorName:       string | null
  expectedDelivery: string | null
  notes:            string
  landingCostTotal: number | null
  lineItems:        MockPOLineItem[]
  createdAt:        string
  updatedAt:        string
}

// ─── Customer view model ──────────────────────────────────────────────────────

export interface MockCustomer {
  id:               string
  projectId:        string
  projectName:      string
  clientName:       string
  architectName:    string | null
  siteAddress:      string
  brands:           string[]
  totalOrderValue:  number
  clientValue:      number
  pendingItems:     number
  inBoxItems:       number
  dispatchedItems:  number
  expectedDelivery: string | null
}

// ─── Brand color map ──────────────────────────────────────────────────────────

export const BRAND_COLORS: Record<string, string> = {
  GROHE:     '#00A3E0',
  HANSGROHE: '#E30613',
  AXOR:      '#1A1A1A',
  VITRA:     '#005BAC',
  GEBERIT:   '#003087',
}

export const BRAND_DOMAINS: Record<string, string> = {
  GROHE:     'grohe.com',
  HANSGROHE: 'hansgrohe.com',
  AXOR:      'hansgrohe.com',  // Axor is a Hansgrohe subsidiary
  VITRA:     'vitra.com.tr',
  GEBERIT:   'geberit.com',
}

/**
 * Brand groupings for tab display.
 * Axor lives under the Hansgrohe tab; its products show their own logo.
 * Tab count = sum of all brands in the group.
 */
export const BRAND_GROUPS: Record<string, string[]> = {
  HANSGROHE: ['HANSGROHE', 'AXOR'],
  GROHE:     ['GROHE'],
  VITRA:     ['VITRA'],
  GEBERIT:   ['GEBERIT'],
}

// Tab keys shown in the brand tab bar (ALL handled separately)
export const BRAND_TABS = ['GROHE', 'HANSGROHE', 'VITRA', 'GEBERIT'] as const
export type BrandTab = typeof BRAND_TABS[number]

// All individual brand values present in product data (no KAJARIA)
export const BRANDS_ORDERED = ['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'GEBERIT'] as const
export type BrandKey = typeof BRANDS_ORDERED[number]

// ─── "Needs PO" type ─────────────────────────────────────────────────────────

export interface MockNeedsPO {
  revisionId:      string
  revisionNumber:  number
  projectId:       string
  projectName:     string
  clientName:      string
  itemCount:       number
  totalValue:      number
  brands:          string[]
  lockedAt:        string
}

// ─── PO Status helpers ────────────────────────────────────────────────────────

export const PO_STATUS_LABEL: Record<POStatus, string> = {
  DRAFT:              'Draft',
  SUBMITTED:          'Ordered',
  PARTIALLY_RECEIVED: 'Partial',
  FULLY_RECEIVED:     'Received',
  CANCELLED:          'Cancelled',
}

export const PO_STATUS_COLOR: Record<POStatus, { bg: string; text: string; dot: string }> = {
  DRAFT:              { bg: 'rgba(107,114,128,0.12)', text: '#6B7280', dot: '#9CA3AF' },
  SUBMITTED:          { bg: 'rgba(59,130,246,0.12)',  text: '#2563EB', dot: '#3B82F6' },
  PARTIALLY_RECEIVED: { bg: 'rgba(245,158,11,0.12)',  text: '#D97706', dot: '#F59E0B' },
  FULLY_RECEIVED:     { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A', dot: '#22C55E' },
  CANCELLED:          { bg: 'rgba(239,68,68,0.12)',   text: '#DC2626', dot: '#EF4444' },
}

export const LINE_STATUS_COLOR: Record<POLineStatus, { bg: string; text: string }> = {
  PENDING:            { bg: 'rgba(107,114,128,0.12)', text: '#6B7280' },
  PARTIALLY_RECEIVED: { bg: 'rgba(245,158,11,0.12)',  text: '#D97706' },
  FULLY_RECEIVED:     { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
}

/** Color config for each BoxAllocationStatus */
export const ALLOC_STATUS_CONFIG: Record<BoxAllocationStatus, {
  label:   string
  color:   string
  bg:      string
  border:  string
  emoji:   string
}> = {
  NEEDS_PO:    { label: 'Needs PO',        color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: '1.5px dashed #c4b5fd', emoji: '⏳' },
  ORDERED:     { label: 'Ordered',          color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: '1px solid #bfdbfe',    emoji: '🔵' },
  AT_GODOWN:   { label: 'At Godown',        color: '#0891b2', bg: 'rgba(8,145,178,0.08)',   border: '1px solid #a5f3fc',    emoji: '🏭' },
  IN_BOX:      { label: 'In Box',           color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: '1px solid #a7f3d0',    emoji: '📦' },
  DEL_PENDING: { label: 'Del. Pending',     color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: '1px solid #fde68a',    emoji: '🚚' },
  DELIVERED:   { label: 'Delivered',        color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   border: '1px solid #bbf7d0',    emoji: '✓' },
  GIVEN_OTHER: { label: 'Given to Other',   color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: '1px solid #fed7aa',    emoji: '👤' },
}

// ─── Transfer history record ──────────────────────────────────────────────────

export type TransferStage = 'AT_GODOWN' | 'IN_BOX' | 'DISPATCHED'

export interface TransferRecord {
  id:               string
  poId:             string
  lineId:           string
  productId:        string
  productName:      string
  productSku:       string
  fromCustomerId:   string
  fromCustomerName: string
  toCustomerId:     string
  toCustomerName:   string
  qty:              number
  stage:            TransferStage
  notes:            string
  timestamp:        string
}

// ─── Priority Transfer audit record ──────────────────────────────────────────

export interface PriorityTransfer {
  id:               string
  productId:        string
  productName:      string
  qty:              number
  fromCustomerId:   string
  fromCustomerName: string
  toCustomerId:     string
  toCustomerName:   string
  reorderCreated:   boolean
  note:             string
  transferredAt:    string
  transferredBy:    string
}

