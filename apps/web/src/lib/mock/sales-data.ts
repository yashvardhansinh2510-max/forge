export { formatINR } from '@/lib/mock/dashboard-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
export type OrderStatus = 'confirmed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'void'
export type PaymentMethod = 'bank_transfer' | 'cheque' | 'upi' | 'cash' | 'credit_card'

export interface LineItem {
  id: string
  productId: string
  productName: string
  sku: string
  description: string
  unit: string
  qty: number
  unitPrice: number
  discount: number   // percentage, 0–100
  gstRate: number    // 5 | 12 | 18 | 28
  section?: string   // room grouping for PDF, e.g. "BATHROOM 1,2"
  imageUrl?: string  // product thumbnail URL for PDF
  selectedColor?: string
  // Custom (non-catalog) item fields — set only when isCustom is true
  isCustom?: boolean
  brand?: string     // GROHE | HANSGROHE | AXOR | VITRA | KAJARIA | OTHER
  hsnCode?: string
  notes?: string
}

export interface Quotation {
  id: string
  revisionId?: string          // set after first DB save
  number: string
  customerId: string
  customerName: string
  customerPhone?: string      // maps to the "NUM" field on the PDF cover page
  customerGST: string
  billingAddress: string
  siteAddress: string
  revisionStatus?: 'DRAFT' | 'LOCKED'
  projectName: string
  grandTotal?: number          // pre-computed when loaded from DB
  lineItemCount?: number       // pre-computed from API for list view
  status: QuotationStatus
  validUntil: Date
  lineItems: LineItem[]
  notes: string
  termsAndConditions: string
  createdBy: string
  createdAt: Date
  sentAt?: Date
  viewedAt?: Date
  acceptedAt?: Date
}

export interface QuotationRevision {
  id: string
  revisionNumber: number
  createdAt: Date
  status: QuotationStatus
  grandTotal: number
  customerName: string
  siteAddress: string
}

export interface QuotationWithHistory extends Quotation {
  revisions: QuotationRevision[]
}

export interface SalesOrder {
  id: string
  number: string
  quotationId?: string
  customerId: string
  customerName: string
  status: OrderStatus
  lineItems: LineItem[]
  deliveryDate: Date
  deliveryAddress: string
  projectName: string
  notes: string
  createdAt: Date
  dispatchedAt?: Date
  deliveredAt?: Date
}

export interface Invoice {
  id: string
  number: string
  orderId?: string
  quotationId?: string
  customerId: string
  customerName: string
  customerGST: string
  billingAddress: string
  status: InvoiceStatus
  lineItems: LineItem[]
  issueDate: Date
  dueDate: Date
  paidAmount: number
  notes: string
  createdAt: Date
  sentAt?: Date
  paidAt?: Date
}

export interface Payment {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  amount: number
  method: PaymentMethod
  reference: string
  notes: string
  receivedAt: Date
  recordedBy: string
}

export interface Customer {
  id: string
  name: string
  gstin: string
  contactPerson: string
  phone: string
  billingAddress: string
  outstanding: number
  totalOrders: number
  totalRevenue: number
  color: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Global state for quotation history (mock persistence)
const quotationHistoryStore: Map<string, QuotationRevision[]> = new Map()

export function addQuotationRevision(quotation: Quotation): void {
  const key = `quotations_${quotation.customerId}`

  if (!quotationHistoryStore.has(key)) {
    quotationHistoryStore.set(key, [])
  }

  const revisions = quotationHistoryStore.get(key)!
  const revision: QuotationRevision = {
    id: quotation.id,
    revisionNumber: revisions.length + 1,
    createdAt: quotation.createdAt,
    status: quotation.status,
    grandTotal: quotation.grandTotal ?? 0,
    customerName: quotation.customerName,
    siteAddress: quotation.siteAddress,
  }

  revisions.push(revision)
  quotationHistoryStore.set(key, revisions)
}

export function getQuotationHistory(customerId: string): QuotationRevision[] {
  const key = `quotations_${customerId}`
  return quotationHistoryStore.get(key) || []
}

export function calcLineItem(item: LineItem) {
  const subtotal = item.qty * item.unitPrice
  const discountAmt = subtotal * (item.discount / 100)
  const taxableAmt = subtotal - discountAmt
  const gstAmt = taxableAmt * (item.gstRate / 100)
  const total = taxableAmt + gstAmt
  return { subtotal, discountAmt, taxableAmt, gstAmt, total }
}

export function calcDocumentTotals(lineItems: LineItem[]) {
  const lines = lineItems.map(calcLineItem)
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const totalDiscount = lines.reduce((s, l) => s + l.discountAmt, 0)
  const taxableAmt = lines.reduce((s, l) => s + l.taxableAmt, 0)
  const cgst = lines.reduce((s, l) => s + l.gstAmt / 2, 0)
  const sgst = cgst
  const totalGST = lines.reduce((s, l) => s + l.gstAmt, 0)
  const grandTotal = lines.reduce((s, l) => s + l.total, 0)
  return { subtotal, totalDiscount, taxableAmt, cgst, sgst, totalGST, grandTotal }
}

export function getStatusStyle(status: string) {
  const map: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    draft:      { bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7', dot: '#A1A1AA' },
    sent:       { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
    viewed:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', dot: '#8B5CF6' },
    accepted:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
    declined:   { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', dot: '#F43F5E' },
    expired:    { bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7', dot: '#A1A1AA' },
    confirmed:  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
    processing: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
    dispatched: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', dot: '#8B5CF6' },
    delivered:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
    cancelled:  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', dot: '#F43F5E' },
    paid:       { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
    partial:    { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
    overdue:    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', dot: '#F43F5E' },
    void:       { bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7', dot: '#A1A1AA' },
  }
  return map[status] ?? map['draft']!
}

