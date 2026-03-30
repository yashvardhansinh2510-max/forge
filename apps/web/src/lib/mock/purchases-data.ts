// ─── Purchase Orders Mock Data ────────────────────────────────────────────────
// A "Purchase" in Forge represents an order made on behalf of a client.
// Items are grouped by vendor brand. Each brand line has its own fulfilment funnel.

export type PurchaseStatus = 'draft' | 'confirmed' | 'partial' | 'fulfilled' | 'cancelled'

export type FunnelStage =
  | 'pending'           // not yet ordered from vendor
  | 'ordered'           // PO placed to brand/vendor
  | 'in_transit'        // shipped from vendor, in transit to godown
  | 'at_godown'         // received at our godown (Bhiwandi / Navi Mumbai)
  | 'partially_shipped' // some units shipped to client, some still at godown
  | 'delivered'         // all units delivered to client site

export interface PurchaseLineItem {
  id: string
  productId: string
  productName: string
  sku: string
  brand: string
  finishName: string
  finishColor: string
  quantity: number
  unitMRP: number
  itemDiscount: number   // %
  unit: string           // pcs / set / etc.
}

export interface BrandFulfilment {
  brand: string
  brandColor: string
  items: PurchaseLineItem[]
  stage: FunnelStage
  poNumber: string | null         // our PO number sent to brand
  vendorOrderRef: string | null   // brand's order reference
  expectedDeliveryDate: string | null
  receivedQty: number             // units received at godown
  shippedToClientQty: number      // units dispatched to client site
  notes: string
}

export interface ClientDetails {
  name: string
  phone: string
  email: string
  address: string
  city: string
  gstNumber: string
}

export interface PurchaseOrder {
  id: string
  quotationRef: string | null   // linked quotation number
  status: PurchaseStatus
  createdAt: string
  updatedAt: string
  client: ClientDetails
  referenceBy: string
  globalDiscount: number
  brands: BrandFulfilment[]
  internalNotes: string
}

// ─── Stage display helpers ─────────────────────────────────────────────────────

export const STAGE_LABEL: Record<FunnelStage, string> = {
  pending:           'Pending',
  ordered:           'Ordered',
  in_transit:        'In Transit',
  at_godown:         'At Godown',
  partially_shipped: 'Partially Shipped',
  delivered:         'Delivered',
}

export const STAGE_COLOR: Record<FunnelStage, { bg: string; text: string }> = {
  pending:           { bg: 'rgba(107,114,128,0.12)', text: '#6B7280' },
  ordered:           { bg: 'rgba(59,130,246,0.12)',  text: '#2563EB' },
  in_transit:        { bg: 'rgba(245,158,11,0.12)',  text: '#D97706' },
  at_godown:         { bg: 'rgba(168,85,247,0.12)',  text: '#7C3AED' },
  partially_shipped: { bg: 'rgba(249,115,22,0.12)',  text: '#EA580C' },
  delivered:         { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
}

export const STATUS_LABEL: Record<PurchaseStatus, string> = {
  draft:      'Draft',
  confirmed:  'Confirmed',
  partial:    'Partial',
  fulfilled:  'Fulfilled',
  cancelled:  'Cancelled',
}

export const STATUS_COLOR: Record<PurchaseStatus, { bg: string; text: string }> = {
  draft:      { bg: 'rgba(107,114,128,0.12)', text: '#6B7280' },
  confirmed:  { bg: 'rgba(59,130,246,0.12)',  text: '#2563EB' },
  partial:    { bg: 'rgba(245,158,11,0.12)',  text: '#D97706' },
  fulfilled:  { bg: 'rgba(34,197,94,0.12)',   text: '#16A34A' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',   text: '#DC2626' },
}

export const FUNNEL_STAGES: FunnelStage[] = [
  'pending',
  'ordered',
  'in_transit',
  'at_godown',
  'partially_shipped',
  'delivered',
]

// ─── Mock purchase orders ──────────────────────────────────────────────────────

export const MOCK_PURCHASES: PurchaseOrder[] = [
  {
    id: 'PO-2025-001',
    quotationRef: 'QT-2025-034',
    status: 'partial',
    createdAt: '2025-11-10T10:30:00Z',
    updatedAt: '2025-12-02T14:15:00Z',
    referenceBy: 'Mehta Architects',
    globalDiscount: 12,
    client: {
      name: 'Lodha Bellissimo — 4BHK Unit 2204',
      phone: '+91 98205 11234',
      email: 'procurement@lodhagroup.com',
      address: 'Lodha Bellissimo, N.M. Joshi Marg, Mahalaxmi',
      city: 'Mumbai 400 011',
      gstNumber: '27AABCL1234A1ZB',
    },
    brands: [
      {
        brand: 'Grohe',
        brandColor: '#009FE3',
        stage: 'at_godown',
        poNumber: 'BCH-GRH-2025-001',
        vendorOrderRef: 'GRH-IN-44821',
        expectedDeliveryDate: '2025-12-05',
        receivedQty: 8,
        shippedToClientQty: 0,
        notes: 'All items received at Bhiwandi godown on 2 Dec.',
        items: [
          {
            id: 'li-001',
            productId: 'grh-rain-310',
            productName: 'Rainshower 310 SmartActive',
            sku: 'GRH-RAIN-310-000',
            brand: 'Grohe',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 4,
            unitMRP: 48500,
            itemDiscount: 12,
            unit: 'pcs',
          },
          {
            id: 'li-002',
            productId: 'grh-smartcontrol-round',
            productName: 'SmartControl Round Thermostat 2 Outlets',
            sku: 'GRH-SC-ROUND-2-000',
            brand: 'Grohe',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 4,
            unitMRP: 52000,
            itemDiscount: 12,
            unit: 'pcs',
          },
        ],
      },
      {
        brand: 'Axor',
        brandColor: '#1C1C1E',
        stage: 'in_transit',
        poNumber: 'BCH-AXR-2025-001',
        vendorOrderRef: 'AXR-IN-18920',
        expectedDeliveryDate: '2025-12-10',
        receivedQty: 0,
        shippedToClientQty: 0,
        notes: 'Shipped from Hansgrohe warehouse Delhi on 29 Nov. ETA 10 Dec.',
        items: [
          {
            id: 'li-003',
            productId: 'axr-one-overhead',
            productName: 'Axor One Overhead Shower 280',
            sku: 'AXR-ONE-OH-280-000',
            brand: 'Axor',
            finishName: 'Polished Gold',
            finishColor: '#D4AF37',
            quantity: 2,
            unitMRP: 128000,
            itemDiscount: 12,
            unit: 'pcs',
          },
          {
            id: 'li-004',
            productId: 'axr-edge-basin',
            productName: 'Axor Edge Basin Mixer 80',
            sku: 'AXR-EDG-BM-000',
            brand: 'Axor',
            finishName: 'Polished Gold',
            finishColor: '#D4AF37',
            quantity: 4,
            unitMRP: 98000,
            itemDiscount: 12,
            unit: 'pcs',
          },
        ],
      },
      {
        brand: 'Vitra',
        brandColor: '#E5002B',
        stage: 'delivered',
        poNumber: 'BCH-VIT-2025-001',
        vendorOrderRef: 'VIT-MH-8812',
        expectedDeliveryDate: '2025-11-28',
        receivedQty: 4,
        shippedToClientQty: 4,
        notes: 'All WCs installed on site by plumber. Signed delivery challan received.',
        items: [
          {
            id: 'li-005',
            productId: 'vit-s50-wc',
            productName: 'Vitra S50 Wall-Hung WC',
            sku: 'VIT-S50-WC-JET-WH',
            brand: 'Vitra',
            finishName: 'White',
            finishColor: '#F8F8F8',
            quantity: 4,
            unitMRP: 38500,
            itemDiscount: 12,
            unit: 'pcs',
          },
        ],
      },
      {
        brand: 'Geberit',
        brandColor: '#6B7280',
        stage: 'delivered',
        poNumber: 'BCH-GEB-2025-001',
        vendorOrderRef: 'GEB-MH-20119',
        expectedDeliveryDate: '2025-11-28',
        receivedQty: 4,
        shippedToClientQty: 4,
        notes: 'UP720 frames installed by contractor. Flush plates to be fitted after tiling.',
        items: [
          {
            id: 'li-006',
            productId: 'geb-up720-cistern',
            productName: 'Geberit UP720 Concealed Cistern',
            sku: 'GEB-UP720-CIS',
            brand: 'Geberit',
            finishName: '—',
            finishColor: '#9ca3af',
            quantity: 4,
            unitMRP: 28500,
            itemDiscount: 12,
            unit: 'pcs',
          },
          {
            id: 'li-007',
            productId: 'geb-sigma-flush',
            productName: 'Geberit Sigma20 Flush Plate',
            sku: 'GEB-SIGMA20-000',
            brand: 'Geberit',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 4,
            unitMRP: 8400,
            itemDiscount: 12,
            unit: 'pcs',
          },
        ],
      },
    ],
    internalNotes: 'Lodha coordinator: Ravi Sharma +91 98765 12345. Site access Mon–Sat 9am–6pm.',
  },

  {
    id: 'PO-2025-002',
    quotationRef: 'QT-2025-041',
    status: 'confirmed',
    createdAt: '2025-11-22T09:00:00Z',
    updatedAt: '2025-11-22T09:00:00Z',
    referenceBy: 'Prestige Group Direct',
    globalDiscount: 18,
    client: {
      name: 'Prestige Park Grove — Villa 14',
      phone: '+91 80 4268 9999',
      email: 'siteprocurement@prestigeconstructions.com',
      address: 'Prestige Park Grove, Whitefield',
      city: 'Bangalore 560 048',
      gstNumber: '29AABCP5678B1ZC',
    },
    brands: [
      {
        brand: 'Hansgrohe',
        brandColor: '#00529A',
        stage: 'ordered',
        poNumber: 'BCH-HAN-2025-005',
        vendorOrderRef: null,
        expectedDeliveryDate: '2025-12-15',
        receivedQty: 0,
        shippedToClientQty: 0,
        notes: 'PO sent to Hansgrohe on 22 Nov. Awaiting order confirmation.',
        items: [
          {
            id: 'li-010',
            productId: 'han-raindance-select',
            productName: 'Raindance Select S 240 Shower System',
            sku: 'HAN-RD-SEL-S240-000',
            brand: 'Hansgrohe',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 6,
            unitMRP: 68000,
            itemDiscount: 18,
            unit: 'set',
          },
          {
            id: 'li-011',
            productId: 'han-metropol-basin',
            productName: 'Metropol Single Lever Basin Mixer 110',
            sku: 'HAN-MET-BM-S-000',
            brand: 'Hansgrohe',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 6,
            unitMRP: 24500,
            itemDiscount: 18,
            unit: 'pcs',
          },
        ],
      },
      {
        brand: 'Vitra',
        brandColor: '#E5002B',
        stage: 'ordered',
        poNumber: 'BCH-VIT-2025-006',
        vendorOrderRef: null,
        expectedDeliveryDate: '2025-12-18',
        receivedQty: 0,
        shippedToClientQty: 0,
        notes: 'PO sent to Vitra Mumbai showroom on 22 Nov.',
        items: [
          {
            id: 'li-012',
            productId: 'vit-antao-wc',
            productName: 'Vitra Antao Wall-Hung WC',
            sku: 'VIT-ANT-WC-WH',
            brand: 'Vitra',
            finishName: 'White',
            finishColor: '#F8F8F8',
            quantity: 6,
            unitMRP: 52000,
            itemDiscount: 18,
            unit: 'pcs',
          },
          {
            id: 'li-013',
            productId: 'vit-antao-basin',
            productName: 'Vitra Antao Washbasin 65cm',
            sku: 'VIT-ANT-BAS-65-WH',
            brand: 'Vitra',
            finishName: 'White',
            finishColor: '#F8F8F8',
            quantity: 6,
            unitMRP: 22800,
            itemDiscount: 18,
            unit: 'pcs',
          },
        ],
      },
    ],
    internalNotes: 'Builder wants staggered delivery — Hansgrohe first, then Vitra.',
  },

  {
    id: 'PO-2025-003',
    quotationRef: null,
    status: 'draft',
    createdAt: '2025-12-01T15:45:00Z',
    updatedAt: '2025-12-01T15:45:00Z',
    referenceBy: 'Walk-in — Showroom',
    globalDiscount: 0,
    client: {
      name: 'Rishi Malhotra',
      phone: '+91 98211 88430',
      email: 'rishi.malhotra@gmail.com',
      address: '12A, Altamount Road',
      city: 'Mumbai 400 026',
      gstNumber: '',
    },
    brands: [
      {
        brand: 'Grohe',
        brandColor: '#009FE3',
        stage: 'pending',
        poNumber: null,
        vendorOrderRef: null,
        expectedDeliveryDate: null,
        receivedQty: 0,
        shippedToClientQty: 0,
        notes: '',
        items: [
          {
            id: 'li-020',
            productId: 'grh-rain-euphoria',
            productName: 'Euphoria Shower System 260',
            sku: 'GRH-RAIN-EU260-000',
            brand: 'Grohe',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 2,
            unitMRP: 84000,
            itemDiscount: 0,
            unit: 'set',
          },
        ],
      },
      {
        brand: 'Axor',
        brandColor: '#1C1C1E',
        stage: 'pending',
        poNumber: null,
        vendorOrderRef: null,
        expectedDeliveryDate: null,
        receivedQty: 0,
        shippedToClientQty: 0,
        notes: '',
        items: [
          {
            id: 'li-021',
            productId: 'axr-starck-x-hand',
            productName: 'Axor Starck X Hand Shower',
            sku: 'AXR-SK-X-HS-000',
            brand: 'Axor',
            finishName: 'Chrome',
            finishColor: '#C8D0D8',
            quantity: 2,
            unitMRP: 54000,
            itemDiscount: 0,
            unit: 'pcs',
          },
        ],
      },
    ],
    internalNotes: '',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcPurchaseTotal(po: PurchaseOrder): { mrp: number; offer: number } {
  let mrp = 0, offer = 0
  for (const bf of po.brands) {
    for (const item of bf.items) {
      const lineMRP = item.unitMRP * item.quantity
      const disc    = Math.max(po.globalDiscount, item.itemDiscount)
      mrp   += lineMRP
      offer += lineMRP * (1 - disc / 100)
    }
  }
  return { mrp, offer }
}

export function calcBrandTotal(bf: BrandFulfilment, globalDiscount: number): { mrp: number; offer: number } {
  let mrp = 0, offer = 0
  for (const item of bf.items) {
    const lineMRP = item.unitMRP * item.quantity
    const disc    = Math.max(globalDiscount, item.itemDiscount)
    mrp   += lineMRP
    offer += lineMRP * (1 - disc / 100)
  }
  return { mrp, offer }
}
