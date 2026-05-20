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
