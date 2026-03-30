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
  | 'PENDING_CO'
  | 'PENDING_DIST'
  | 'AT_GODOWN'
  | 'IN_BOX'
  | 'DISPATCHED'
  | 'NOT_DISPLAYED'

/** Legal next stages for each stage (enforced in move-stage API + PartialMoveModal) */
export const LEGAL_TRANSITIONS: Record<'ORDERED' | POStage, POStage[]> = {
  ORDERED:       ['PENDING_CO', 'PENDING_DIST'],
  PENDING_CO:    ['PENDING_DIST', 'AT_GODOWN'],
  PENDING_DIST:  ['AT_GODOWN'],
  AT_GODOWN:     ['IN_BOX'],
  IN_BOX:        ['DISPATCHED'],
  DISPATCHED:    ['NOT_DISPLAYED'],
  NOT_DISPLAYED: [],
}

export const STAGE_LABELS: Record<'ORDERED' | POStage, string> = {
  ORDERED:       'Total Ordered',
  PENDING_CO:    'Pending from Co.',
  PENDING_DIST:  'Pending from Dist.',
  AT_GODOWN:     'At Godown',
  IN_BOX:        'In Box',
  DISPATCHED:    'Dispatched',
  NOT_DISPLAYED: 'Not Displayed',
}

export const STAGE_COLORS: Record<POStage, string> = {
  PENDING_CO:    '#F5A623',
  PENDING_DIST:  '#E8762C',
  AT_GODOWN:     '#4A90D9',
  IN_BOX:        '#7B68EE',
  DISPATCHED:    '#27AE60',
  NOT_DISPLAYED: '#95A5A6',
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
  qtyPendingDist:       number
  qtyAtGodown:          number
  qtyInBox:             number
  qtyDispatched:        number
  qtyNotDisplayed:      number
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

// ─── "Needs PO" mock data ────────────────────────────────────────────────────

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

export const MOCK_NEEDS_PO: MockNeedsPO[] = [
  {
    revisionId:     'rev-003',
    revisionNumber: 2,
    projectId:      'proj-003',
    projectName:    'Oberoi Heights — Goregaon',
    clientName:     'Vikram Oberoi',
    itemCount:      4,
    totalValue:     182000,
    brands:         ['GROHE', 'AXOR'],
    lockedAt:       '2026-03-25T10:00:00Z',
  },
  {
    revisionId:     'rev-004',
    revisionNumber: 1,
    projectId:      'proj-004',
    projectName:    'Shah Residence — Juhu',
    clientName:     'Priya Shah',
    itemCount:      6,
    totalValue:     314500,
    brands:         ['HANSGROHE', 'VITRA'],
    lockedAt:       '2026-03-26T14:30:00Z',
  },
]

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

// ─── Mock Purchase Orders ─────────────────────────────────────────────────────

export const MOCK_PURCHASE_ORDERS: MockPurchaseOrder[] = [
  // ── PO-001: GROHE — Smith Residence (SUBMITTED / partially received) ─────────
  {
    id:        'po-001',
    poNumber:  'PO-2026-0001',
    mode:      'PROJECT_LINKED',
    status:    'SUBMITTED',
    projectId: 'proj-001',
    projectName: 'Smith Residence — Bandra',
    clientName:  'Rajesh Smith',
    revisionId: 'rev-001',
    vendorName: 'GROHE',
    expectedDelivery: '2026-04-15T00:00:00Z',
    notes: 'Priority delivery — client moving in April end',
    landingCostTotal: 64000,
    lineItems: [
      {
        id: 'line-001', productId: 'grh-rain-310',
        productName: 'Rainshower 310 SmartActive',
        productSku: 'GRH-RAIN-310', productBrand: 'GROHE',
        productImage: '',
        qtyOrdered: 2, qtyReceived: 1,
        qtyPendingCo: 1, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 36000, clientOfferRate: 46200,
        status: 'PARTIALLY_RECEIVED',
        customerAllocations: [
          { customerId: 'proj-001', customerName: 'Rajesh Smith',  qty: 1, boxStatus: 'AT_GODOWN',  scheduledDelivery: '2026-04-15', customNote: null },
          { customerId: 'proj-003', customerName: 'Vikram Oberoi', qty: 1, boxStatus: 'ORDERED',    scheduledDelivery: null,          customNote: null },
        ],
      },
      {
        id: 'line-002', productId: 'grh-euphoria',
        productName: 'Euphoria System 260',
        productSku: 'GRH-EUPH-260', productBrand: 'GROHE',
        productImage: '',
        qtyOrdered: 1, qtyReceived: 1,
        qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0,
        landingCost: 28000, clientOfferRate: 33880,
        status: 'FULLY_RECEIVED',
        customerAllocations: [
          { customerId: 'proj-001', customerName: 'Rajesh Smith', qty: 1, boxStatus: 'GIVEN_OTHER', scheduledDelivery: null, customNote: 'Given to Mehta Architects for project sample display at their Bandra office.' },
        ],
      },
    ],
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-20T14:30:00Z',
  },

  // ── PO-002: HANSGROHE — Mehta Penthouse (DRAFT) ───────────────────────────
  {
    id:        'po-002',
    poNumber:  'PO-2026-0002',
    mode:      'PROJECT_LINKED',
    status:    'DRAFT',
    projectId: 'proj-002',
    projectName: 'Mehta Penthouse — Worli',
    clientName:  'Suresh Mehta',
    revisionId: 'rev-002',
    vendorName: 'HANSGROHE',
    expectedDelivery: '2026-05-01T00:00:00Z',
    notes: '',
    landingCostTotal: 123000,
    lineItems: [
      {
        id: 'line-003', productId: 'hgr-raindance-e',
        productName: 'Raindance E 300 AI',
        productSku: 'HGR-RD-E300', productBrand: 'HANSGROHE',
        productImage: '',
        qtyOrdered: 3, qtyReceived: 0,
        qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 41000, clientOfferRate: 52800,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-002', customerName: 'Suresh Mehta', qty: 2, boxStatus: 'ORDERED',  scheduledDelivery: '2026-05-01', customNote: null },
          { customerId: 'proj-004', customerName: 'Priya Shah',   qty: 1, boxStatus: 'NEEDS_PO', scheduledDelivery: null,          customNote: null },
        ],
      },
    ],
    createdAt: '2026-03-18T09:00:00Z',
    updatedAt: '2026-03-18T09:00:00Z',
  },

  // ── PO-003: VITRA — Bulk/Showroom (FULLY_RECEIVED) ───────────────────────
  {
    id:        'po-003',
    poNumber:  'PO-2026-0003',
    mode:      'BULK_COMPANY',
    status:    'FULLY_RECEIVED',
    projectId: null,
    projectName: null,
    clientName:  null,
    revisionId: null,
    vendorName: 'VITRA',
    expectedDelivery: '2026-03-01T00:00:00Z',
    notes: 'Showroom replenishment — S50 series',
    landingCostTotal: 92500,
    lineItems: [
      {
        id: 'line-004', productId: 'vtr-s50-wc',
        productName: 'S50 Rimless WC',
        productSku: 'VTR-S50-RWC', productBrand: 'VITRA',
        productImage: '',
        qtyOrdered: 5, qtyReceived: 5,
        qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 3, qtyDispatched: 1, qtyNotDisplayed: 0,
        landingCost: 18500, clientOfferRate: null,
        status: 'FULLY_RECEIVED',
        customerAllocations: [
          { customerId: 'proj-006', customerName: 'Prestige Realty', qty: 3, boxStatus: 'IN_BOX',    scheduledDelivery: '2026-05-10', customNote: null },
          { customerId: 'proj-004', customerName: 'Priya Shah',      qty: 1, boxStatus: 'AT_GODOWN', scheduledDelivery: null,          customNote: null },
          { customerId: 'proj-007', customerName: 'Arjun Kapoor',    qty: 1, boxStatus: 'DELIVERED', scheduledDelivery: null,          customNote: null },
        ],
      },
    ],
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-03-02T11:00:00Z',
  },

  // ── PO-004: AXOR — Lodha Altamount (PARTIALLY_RECEIVED) ──────────────────
  {
    id:        'po-004',
    poNumber:  'PO-2026-0004',
    mode:      'PROJECT_LINKED',
    status:    'PARTIALLY_RECEIVED',
    projectId: 'proj-005',
    projectName: 'Lodha Altamount — Tardeo',
    clientName:  'Lodha Group',
    revisionId: 'rev-005',
    vendorName: 'AXOR',
    expectedDelivery: '2026-04-20T00:00:00Z',
    notes: 'Master bath + guest bath fixtures',
    landingCostTotal: 285000,
    lineItems: [
      {
        id: 'line-005', productId: 'axr-montreux',
        productName: 'Axor Montreux Single Lever',
        productSku: 'AXR-MNTRX-SL', productBrand: 'AXOR',
        productImage: '',
        qtyOrdered: 4, qtyReceived: 2,
        qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 2, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 38500, clientOfferRate: 52000,
        status: 'PARTIALLY_RECEIVED',
        customerAllocations: [
          { customerId: 'proj-005', customerName: 'Lodha Group',   qty: 2, boxStatus: 'IN_BOX',  scheduledDelivery: '2026-04-10', customNote: null },
          { customerId: 'proj-003', customerName: 'Vikram Oberoi', qty: 2, boxStatus: 'ORDERED', scheduledDelivery: null,          customNote: null },
        ],
      },
      {
        id: 'line-006', productId: 'axr-citterio',
        productName: 'Axor Citterio Thermostatic',
        productSku: 'AXR-CTR-THERM', productBrand: 'AXOR',
        productImage: '',
        qtyOrdered: 2, qtyReceived: 0,
        qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 68000, clientOfferRate: 92000,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-005', customerName: 'Lodha Group', qty: 2, boxStatus: 'ORDERED', scheduledDelivery: null, customNote: null },
        ],
      },
    ],
    createdAt: '2026-03-01T11:00:00Z',
    updatedAt: '2026-03-22T09:15:00Z',
  },

  // ── PO-005: GEBERIT — Lodha Altamount (SUBMITTED) ─────────────────────────
  {
    id:        'po-005',
    poNumber:  'PO-2026-0005',
    mode:      'PROJECT_LINKED',
    status:    'SUBMITTED',
    projectId: 'proj-005',
    projectName: 'Lodha Altamount — Tardeo',
    clientName:  'Lodha Group',
    revisionId: 'rev-005',
    vendorName: 'GEBERIT',
    expectedDelivery: '2026-04-28T00:00:00Z',
    notes: 'Concealed cisterns — 3 bathrooms',
    landingCostTotal: 94500,
    lineItems: [
      {
        id: 'line-007', productId: 'gbr-sigma',
        productName: 'Geberit Sigma Concealed Cistern',
        productSku: 'GBR-SIGMA-CC', productBrand: 'GEBERIT',
        productImage: '',
        qtyOrdered: 3, qtyReceived: 0,
        qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 31500, clientOfferRate: 42000,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-005', customerName: 'Lodha Group',   qty: 2, boxStatus: 'ORDERED',  scheduledDelivery: '2026-04-28', customNote: null },
          { customerId: 'proj-003', customerName: 'Vikram Oberoi', qty: 1, boxStatus: 'NEEDS_PO', scheduledDelivery: null,          customNote: null },
        ],
      },
    ],
    createdAt: '2026-03-05T14:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z',
  },

  // ── PO-006: HANSGROHE — Prestige Signature (SUBMITTED) ────────────────────
  {
    id:        'po-006',
    poNumber:  'PO-2026-0006',
    mode:      'PROJECT_LINKED',
    status:    'SUBMITTED',
    projectId: 'proj-006',
    projectName: 'Prestige Signature — BKC',
    clientName:  'Prestige Realty',
    revisionId: 'rev-006',
    vendorName: 'HANSGROHE',
    expectedDelivery: '2026-05-10T00:00:00Z',
    notes: '6 premium apartments — uniform spec',
    landingCostTotal: 312000,
    lineItems: [
      {
        id: 'line-008', productId: 'hgr-select-e',
        productName: 'Hansgrohe Select E 300 3jet',
        productSku: 'HGR-SEL-E300', productBrand: 'HANSGROHE',
        productImage: '',
        qtyOrdered: 6, qtyReceived: 0,
        qtyPendingCo: 5, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 52000, clientOfferRate: 68000,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-006', customerName: 'Prestige Realty', qty: 5, boxStatus: 'ORDERED',  scheduledDelivery: '2026-05-10', customNote: null },
          { customerId: 'proj-004', customerName: 'Priya Shah',      qty: 1, boxStatus: 'NEEDS_PO', scheduledDelivery: null,          customNote: null },
        ],
      },
    ],
    createdAt: '2026-03-15T10:30:00Z',
    updatedAt: '2026-03-15T10:30:00Z',
  },

  // ── PO-007: VITRA — Prestige Signature (DRAFT) ────────────────────────────
  {
    id:        'po-007',
    poNumber:  'PO-2026-0007',
    mode:      'PROJECT_LINKED',
    status:    'DRAFT',
    projectId: 'proj-006',
    projectName: 'Prestige Signature — BKC',
    clientName:  'Prestige Realty',
    revisionId: 'rev-006',
    vendorName: 'VITRA',
    expectedDelivery: null,
    notes: '',
    landingCostTotal: null,
    lineItems: [
      {
        id: 'line-009', productId: 'vtr-frame-wc',
        productName: 'Vitra Frame WC + Seat',
        productSku: 'VTR-FRAME-WCS', productBrand: 'VITRA',
        productImage: '',
        qtyOrdered: 6, qtyReceived: 0,
        qtyPendingCo: 6, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 24000, clientOfferRate: 32000,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-006', customerName: 'Prestige Realty', qty: 6, boxStatus: 'ORDERED', scheduledDelivery: null, customNote: null },
        ],
      },
      {
        id: 'line-010', productId: 'vtr-sento',
        productName: 'Vitra Sento Basin 55cm',
        productSku: 'VTR-SENTO-55', productBrand: 'VITRA',
        productImage: '',
        qtyOrdered: 6, qtyReceived: 0,
        qtyPendingCo: 4, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0,
        landingCost: 8500, clientOfferRate: 11000,
        status: 'PENDING',
        customerAllocations: [
          { customerId: 'proj-006', customerName: 'Prestige Realty', qty: 4, boxStatus: 'ORDERED',  scheduledDelivery: null, customNote: null },
          { customerId: 'proj-004', customerName: 'Priya Shah',      qty: 2, boxStatus: 'NEEDS_PO', scheduledDelivery: null, customNote: null },
        ],
      },
    ],
    createdAt: '2026-03-20T16:00:00Z',
    updatedAt: '2026-03-20T16:00:00Z',
  },

  // ── PO-008: GROHE — Mehta Penthouse (FULLY_RECEIVED) ─────────────────────
  {
    id:        'po-008',
    poNumber:  'PO-2026-0008',
    mode:      'PROJECT_LINKED',
    status:    'FULLY_RECEIVED',
    projectId: 'proj-002',
    projectName: 'Mehta Penthouse — Worli',
    clientName:  'Suresh Mehta',
    revisionId: 'rev-002',
    vendorName: 'GROHE',
    expectedDelivery: '2026-03-10T00:00:00Z',
    notes: 'Kitchen & utility fittings',
    landingCostTotal: 44000,
    lineItems: [
      {
        id: 'line-011', productId: 'grh-feel',
        productName: 'Grohe Feel Kitchen Mixer',
        productSku: 'GRH-FEEL-KIT', productBrand: 'GROHE',
        productImage: '',
        qtyOrdered: 1, qtyReceived: 1,
        qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0,
        landingCost: 44000, clientOfferRate: 56000,
        status: 'FULLY_RECEIVED',
        customerAllocations: [
          { customerId: 'proj-002', customerName: 'Suresh Mehta', qty: 1, boxStatus: 'DELIVERED', scheduledDelivery: null, customNote: null },
        ],
      },
    ],
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-03-12T11:00:00Z',
  },
]

// ─── Mock Inventory Boxes ─────────────────────────────────────────────────────

export const MOCK_INVENTORY_BOXES: MockInventoryBox[] = [
  {
    id: 'box-001',
    boxCode: 'BOX-SMITH-001',
    projectId: 'proj-001',
    projectName: 'Smith Residence — Bandra',
    siteAddress: 'Flat 12B, Sea View Tower, Bandra West, Mumbai 400050',
    createdAt: '2026-03-20T14:30:00Z',
    items: [
      {
        id: 'bi-001',
        productId: 'grh-rain-310',
        productName: 'Rainshower 310 SmartActive',
        productSku: 'GRH-RAIN-310', productBrand: 'GROHE',
        productImage: '', finishName: 'Chrome',
        qtyTotal: 1, qtyDispatched: 0,
        status: 'STAGED',
        scheduledDelivery: '2026-04-15T00:00:00Z',
        dispatchRecords: [],
      },
      {
        id: 'bi-002',
        productId: 'grh-euphoria',
        productName: 'Euphoria System 260',
        productSku: 'GRH-EUPH-260', productBrand: 'GROHE',
        productImage: '', finishName: 'Hard Graphite',
        qtyTotal: 1, qtyDispatched: 1,
        status: 'FULLY_DISPATCHED',
        scheduledDelivery: null,
        dispatchRecords: [
          {
            id: 'dr-001', unitIndex: 1,
            recipientName: 'Mehta Architects',
            recipientRole: 'ARCHITECT',
            customNote: 'Given to Mehta Architects for project sample display at their Bandra office.',
            isCustomRecipient: true,
            dispatchedAt: '2026-03-22T11:00:00Z',
            dispatchedBy: 'Arjun Sharma',
          },
        ],
      },
    ],
  },
  {
    id: 'box-002',
    boxCode: 'BOX-LODHA-001',
    projectId: 'proj-005',
    projectName: 'Lodha Altamount — Tardeo',
    siteAddress: 'Tower A, Lodha Altamount, Tardeo, Mumbai 400034',
    createdAt: '2026-03-22T10:00:00Z',
    items: [
      {
        id: 'bi-003',
        productId: 'axr-montreux',
        productName: 'Axor Montreux Single Lever',
        productSku: 'AXR-MNTRX-SL', productBrand: 'AXOR',
        productImage: '', finishName: 'Polished Gold',
        qtyTotal: 2, qtyDispatched: 0,
        status: 'STAGED',
        scheduledDelivery: '2026-04-10T00:00:00Z',
        dispatchRecords: [],
      },
    ],
  },
  {
    id: 'box-003',
    boxCode: 'BOX-MEHTA-001',
    projectId: 'proj-002',
    projectName: 'Mehta Penthouse — Worli',
    siteAddress: 'Penthouse 40F, One Avighna Park, Lower Parel, Mumbai 400013',
    createdAt: '2026-03-12T11:00:00Z',
    items: [
      {
        id: 'bi-004',
        productId: 'grh-feel',
        productName: 'Grohe Feel Kitchen Mixer',
        productSku: 'GRH-FEEL-KIT', productBrand: 'GROHE',
        productImage: '', finishName: 'SuperSteel',
        qtyTotal: 1, qtyDispatched: 1,
        status: 'FULLY_DISPATCHED',
        scheduledDelivery: null,
        dispatchRecords: [
          {
            id: 'dr-002', unitIndex: 1,
            recipientName: 'Suresh Mehta',
            recipientRole: 'CLIENT',
            customNote: null,
            isCustomRecipient: false,
            dispatchedAt: '2026-03-14T10:00:00Z',
            dispatchedBy: 'Buildcon Team',
          },
        ],
      },
    ],
  },
]

// ─── Mock Customers ───────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id:               'proj-001',
    projectId:        'proj-001',
    projectName:      'Smith Residence — Bandra',
    clientName:       'Rajesh Smith',
    architectName:    'Mehta Architects',
    siteAddress:      'Flat 12B, Sea View Tower, Bandra West, Mumbai 400050',
    brands:           ['GROHE'],
    totalOrderValue:  108000,
    clientValue:      138880,
    pendingItems:     1,
    inBoxItems:       1,
    dispatchedItems:  1,
    expectedDelivery: '2026-04-15T00:00:00Z',
  },
  {
    id:               'proj-002',
    projectId:        'proj-002',
    projectName:      'Mehta Penthouse — Worli',
    clientName:       'Suresh Mehta',
    architectName:    'Studio Lotus',
    siteAddress:      'Penthouse 40F, One Avighna Park, Lower Parel, Mumbai 400013',
    brands:           ['HANSGROHE', 'GROHE'],
    totalOrderValue:  167000,
    clientValue:      214800,
    pendingItems:     2,
    inBoxItems:       0,
    dispatchedItems:  1,
    expectedDelivery: '2026-05-01T00:00:00Z',
  },
  {
    id:               'proj-003',
    projectId:        'proj-003',
    projectName:      'Oberoi Heights — Goregaon',
    clientName:       'Vikram Oberoi',
    architectName:    'Hafeez Contractor',
    siteAddress:      '12th Floor, Oberoi Heights, Goregaon West, Mumbai 400104',
    brands:           ['GROHE', 'AXOR', 'GEBERIT'],
    totalOrderValue:  267000,
    clientValue:      345000,
    pendingItems:     4,
    inBoxItems:       0,
    dispatchedItems:  0,
    expectedDelivery: '2026-04-28T00:00:00Z',
  },
  {
    id:               'proj-004',
    projectId:        'proj-004',
    projectName:      'Shah Residence — Juhu',
    clientName:       'Priya Shah',
    architectName:    'Studio i.d.e.a',
    siteAddress:      'B-402, Sea Breeze Apartments, Juhu Tara Road, Mumbai 400049',
    brands:           ['HANSGROHE', 'VITRA', 'KAJARIA'],
    totalOrderValue:  180000,
    clientValue:      240000,
    pendingItems:     6,
    inBoxItems:       1,
    dispatchedItems:  0,
    expectedDelivery: '2026-05-15T00:00:00Z',
  },
  {
    id:               'proj-005',
    projectId:        'proj-005',
    projectName:      'Lodha Altamount — Tardeo',
    clientName:       'Lodha Group',
    architectName:    'Pei Cobb Freed & Partners',
    siteAddress:      'Tower A, Lodha Altamount, Tardeo, Mumbai 400034',
    brands:           ['AXOR', 'GEBERIT', 'KAJARIA'],
    totalOrderValue:  564500,
    clientValue:      732000,
    pendingItems:     19,
    inBoxItems:       2,
    dispatchedItems:  0,
    expectedDelivery: '2026-04-20T00:00:00Z',
  },
  {
    id:               'proj-006',
    projectId:        'proj-006',
    projectName:      'Prestige Signature — BKC',
    clientName:       'Prestige Realty',
    architectName:    'Hafeez Contractor',
    siteAddress:      'G Block, Bandra Kurla Complex, Mumbai 400051',
    brands:           ['HANSGROHE', 'VITRA', 'KAJARIA'],
    totalOrderValue:  672000,
    clientValue:      866200,
    pendingItems:     15,
    inBoxItems:       3,
    dispatchedItems:  0,
    expectedDelivery: '2026-05-10T00:00:00Z',
  },
  {
    id:               'proj-007',
    projectId:        'proj-007',
    projectName:      'Kapoor Duplex — Andheri',
    clientName:       'Arjun Kapoor',
    architectName:    'A+D Design Studio',
    siteAddress:      'D-1501, Westwind Heights, Andheri West, Mumbai 400053',
    brands:           ['VITRA', 'KAJARIA'],
    totalOrderValue:  370000,
    clientValue:      480000,
    pendingItems:     20,
    inBoxItems:       25,
    dispatchedItems:  21,
    expectedDelivery: null,
  },
]
