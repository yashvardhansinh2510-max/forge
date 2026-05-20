export { formatINR } from '@/lib/mock/dashboard-data'

// ─── Products (Extracted from PDFs) ───────────────────────────────────────────

export interface Product {
  id: string
  sku: string
  productName: string
  brand: 'GROHE' | 'HANSGROHE' | 'VITRA' | 'AXOR'
  category: string
  unitPrice: number
  gstRate: number
}

export const products: Product[] = [
  { id: 'hg001', sku: '10637000', productName: 'AX ShowerHeaven 1200 4jet w/o light',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 2129710, gstRate: 18 },
  { id: 'hg002', sku: '10637300', productName: 'AX ShowerHeaven 1200 4jet w/o light PRG',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 3194560, gstRate: 18 },
  { id: 'hg003', sku: '10637140', productName: 'AX ShowerHeaven 1200 4jet w/o light BBR',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 3194560, gstRate: 18 },
  { id: 'hg004', sku: '10922180', productName: 'AX ShowerHeaven 1200 4jet basic set',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 207970, gstRate: 18 },
  { id: 'hg005', sku: '28417000', productName: 'HG Rainmaker SH rectangular w/o light',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 858660, gstRate: 18 },
  { id: 'hg006', sku: '28418000', productName: 'HG Rainmaker SH rectangular w/ light',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 1023840, gstRate: 18 },
  { id: 'hg007', sku: '28414180', productName: 'HG Rainmaker Basic set rectangular',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 36540, gstRate: 18 },
  { id: 'hg008', sku: '28433000', productName: 'HG Raindance Rainfall OHS 180 2jet',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 342340, gstRate: 18 },
  { id: 'hg009', sku: '35283000', productName: 'AX OHS 580 3jet wall chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 831580, gstRate: 18 },
  { id: 'hg010', sku: '24001400', productName: 'HG Rainmaker Sel.580 3jet SH wall wh/ch',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 647560, gstRate: 18 },
  { id: 'hg011', sku: '10929000', productName: 'AX Starck OHS 240x240mm w.ceiling conn.',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 362260, gstRate: 18 },
  { id: 'hg012', sku: '10925000', productName: 'AX Starck OHS 240x240mm chr.w.shower arm',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 419340, gstRate: 18 },
  { id: 'hg013', sku: '10921180', productName: 'AX Starck basic set f.OHS w.arm 240x240',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 50920, gstRate: 18 },
  { id: 'hg014', sku: '26031000', productName: 'AX Nendo OHS w.shower arm chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 458080, gstRate: 18 },
  { id: 'hg015', sku: '26909180', productName: 'AX Nendo Front OHS w.show.arm basic set',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 105920, gstRate: 18 },
  { id: 'hg016', sku: '26022000', productName: 'AX Front OHS w.ceilling connector chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 206060, gstRate: 18 },
  { id: 'hg017', sku: '26021000', productName: 'AX Front OHS w.shower arm chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 288450, gstRate: 18 },
  { id: 'hg018', sku: '35277000', productName: 'AX OHS 460 1jet ceiling chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 504960, gstRate: 18 },
  { id: 'hg019', sku: '35279000', productName: 'AX OHS 460 2jet ceiling chrome',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 623630, gstRate: 18 },
  { id: 'hg020', sku: '24010180', productName: 'HG Rainmaker Select 460 OHS basic set',
    brand: 'HANSGROHE', category: 'Showers & Accessories', unitPrice: 54400, gstRate: 18 },
  { id: 'vtr001', sku: '7231B403H6216', productName: 'Vitra Wall-Hung WC with Soft Close Seat',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 520180, gstRate: 18 },
  { id: 'vtr002', sku: '5674B403H6194', productName: 'Vitra Basin 550mm White',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 447840, gstRate: 18 },
  { id: 'vtr003', sku: '5885B403H0101', productName: 'Vitra Shower Tray 800x800mm',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 130610, gstRate: 18 },
  { id: 'vtr004', sku: '5885B401H0101', productName: 'Vitra Wall-Hung Basin 500mm',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 156760, gstRate: 18 },
  { id: 'vtr005', sku: '5885B422H0101', productName: 'Vitra Toilet Seat - Standard',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 176330, gstRate: 18 },
  { id: 'vtr006', sku: '5885B483H0101', productName: 'Vitra Toilet Seat - Soft Close',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 195930, gstRate: 18 },
  { id: 'vtr007', sku: '5885B403H0559', productName: 'Vitra Floor-Mount WC Bowl',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 135640, gstRate: 18 },
  { id: 'vtr008', sku: '5885B401H0559', productName: 'Vitra Concealed Cistern 120mm',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 162780, gstRate: 18 },
  { id: 'vtr009', sku: '5885B422H0559', productName: 'Vitra Wall Mount Basin Mixer Chrome',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 183120, gstRate: 18 },
  { id: 'vtr010', sku: '5885B483H0559', productName: 'Vitra Thermostatic Shower Mixer',
    brand: 'VITRA', category: 'Toilets & Sanitary', unitPrice: 203560, gstRate: 18 },
]

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
  articleNumber?: string
  seriesName?: string
  finishName?: string
  brand?: string
  description: string
  unit: string
  qty: number
  unitPrice: number
  discount: number   // percentage, 0–100
  gstRate: number    // 5 | 12 | 18 | 28
  section?: string   // room grouping for PDF, e.g. "BATHROOM 1,2"
  imageUrl?: string  // product thumbnail URL for PDF
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

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers: Customer[] = [
  {
    id: 'c01', name: 'Rajesh Constructions Pvt Ltd', gstin: '27AACCR1234F1Z5',
    contactPerson: 'Rajesh Mehta', phone: '+91 98200 11234',
    billingAddress: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    outstanding: 285000, totalOrders: 14, totalRevenue: 2840000, color: '#2563EB',
  },
  {
    id: 'c02', name: 'Lodha Developers Ltd', gstin: '27AACCL5678G1ZK',
    contactPerson: 'Priya Nair', phone: '+91 98765 44321',
    billingAddress: '412, Lodha Supremus, Lower Parel, Mumbai 400013',
    outstanding: 0, totalOrders: 28, totalRevenue: 8420000, color: '#7C3AED',
  },
  {
    id: 'c03', name: 'Prestige Group (Mumbai)', gstin: '27AACCP9012H1ZM',
    contactPerson: 'Anand Krishnan', phone: '+91 87654 99001',
    billingAddress: '6, Prestige Trade Tower, Worli, Mumbai 400018',
    outstanding: 142000, totalOrders: 11, totalRevenue: 5180000, color: '#059669',
  },
  {
    id: 'c04', name: 'Sanjay Patil Interior Works', gstin: '27AACCS3456I1ZP',
    contactPerson: 'Sanjay Patil', phone: '+91 99204 56789',
    billingAddress: 'Shop 4, Laxmi Market, Dadar West, Mumbai 400028',
    outstanding: 68000, totalOrders: 8, totalRevenue: 720000, color: '#D97706',
  },
  {
    id: 'c05', name: 'Green Earth Homes LLP', gstin: '27AACCG7890J1ZQ',
    contactPerson: 'Meera Desai', phone: '+91 70456 12345',
    billingAddress: '22, Eco Park Colony, Chembur, Mumbai 400071',
    outstanding: 0, totalOrders: 5, totalRevenue: 380000, color: '#BE123C',
  },
]

// ─── Quotations ───────────────────────────────────────────────────────────────

export const quotations: Quotation[] = [
  {
    id: 'q01', number: 'Q-2026-0001',
    customerId: 'c01', customerName: 'Chiragbhai Lakhani',
    customerGST: '27AACCR1234F1Z5',
    customerPhone: '9898958897',
    billingAddress: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    siteAddress: 'Chiragbhai Residence, Mumbai',
    projectName: 'Chiragbhai — Grohe Bathroom & Kitchen Package',
    status: 'sent',
    validUntil: new Date(Date.now() + 1000*60*60*24*30),
    lineItems: [
      // BATHROOM 1,2
      { id: 'li01', productId: 'grh-26559000', productName: '310 Head shower ROUND 1 spray ceiling-mounted', sku: '26559000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 47700, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-003.png' },
      { id: 'li02', productId: 'grh-29121000', productName: 'Grohtherm SmartControl Thermostat Round, 3 Control', sku: '29121000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 126550, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-004.png' },
      { id: 'li03', productId: 'grh-35600000', productName: 'Rapido Smartbox', sku: '35600000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 16550, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-005.png' },
      { id: 'li04', productId: 'grh-13278002', productName: 'Eurodisc Cosmopolitan Bath Spout', sku: '13278002',
        description: '', unit: 'pcs', qty: 2, unitPrice: 17600, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-006.png' },
      { id: 'li05', productId: 'grh-26574000', productName: 'Active shower-Chrome –130mm', sku: '26574000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 17300, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-007.png' },
      { id: 'li06', productId: 'grh-28364001', productName: 'Silverflex Shower Hose, 1500 mm', sku: '28364001',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3500, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-008.png' },
      { id: 'li07', productId: 'grh-28628001', productName: 'Wall union with holder', sku: '28628001',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3300, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-009.png' },
      { id: 'li08', productId: 'grh-19573002', productName: 'Eurodisc Cosmopolitan Wall-Mount Basin Mixer', sku: '19573002',
        description: '', unit: 'pcs', qty: 2, unitPrice: 39900, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-010.png' },
      { id: 'li09', productId: 'grh-32635000', productName: 'Handle Mixer, Concealed Body', sku: '32635000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 13800, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-011.png' },
      { id: 'li10', productId: 'grh-3853610I', productName: 'Concealed cistern 118mm uniset', sku: '3853610I',
        description: '', unit: 'pcs', qty: 2, unitPrice: 14250, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-012.png' },
      { id: 'li11', productId: 'grh-38505000', productName: 'Actuationplate Skate Air Flush Plate, Chrome', sku: '38505000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3550, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-013.png' },
      { id: 'li12', productId: 'grh-26352000', productName: 'Tempesta Trigger spray', sku: '26352000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3750, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-014.png' },
      { id: 'li13', productId: 'grh-22940000', productName: 'Angle Valve ½"', sku: '22940000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3450, discount: 50, gstRate: 18, section: 'BATHROOM 1,2', imageUrl: '/product-images/product-015.png' },
      // BATHROOM 3,4
      { id: 'li14', productId: 'grh-19573002-b', productName: 'Eurodisc Cosmopolitan Wall-Mount Basin Mixer', sku: '19573002',
        description: '', unit: 'pcs', qty: 2, unitPrice: 39900, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-010.png' },
      { id: 'li15', productId: 'grh-32635000-b', productName: 'Handle Mixer, Concealed Body', sku: '32635000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 13800, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-011.png' },
      { id: 'li16', productId: 'grh-3853610I-b', productName: 'Concealed cistern 118mm uniset', sku: '3853610I',
        description: '', unit: 'pcs', qty: 2, unitPrice: 14250, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-012.png' },
      { id: 'li17', productId: 'grh-38505000-b', productName: 'Actuationplate Skate Air Flush Plate, Chrome', sku: '38505000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3550, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-013.png' },
      { id: 'li18', productId: 'grh-26352000-b', productName: 'Tempesta Trigger spray', sku: '26352000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3750, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-014.png' },
      { id: 'li19', productId: 'grh-22940000-b', productName: 'Angle Valve ½"', sku: '22940000',
        description: '', unit: 'pcs', qty: 2, unitPrice: 3450, discount: 50, gstRate: 18, section: 'BATHROOM 3,4', imageUrl: '/product-images/product-015.png' },
      // KITCHEN
      { id: 'li20', productId: 'grh-30274000', productName: 'Minta 1-Handle Kitchen Mixer, L Spout, Pull Out', sku: '30274000',
        description: '', unit: 'pcs', qty: 1, unitPrice: 44550, discount: 50, gstRate: 18, section: 'KITCHEN', imageUrl: '/product-images/product-016.png' },
      { id: 'li21', productId: 'grh-32661003', productName: 'Concetto 1-Handle Kitchen Mixer, C Spout Swivel', sku: '32661003',
        description: '', unit: 'pcs', qty: 1, unitPrice: 27850, discount: 50, gstRate: 18, section: 'KITCHEN', imageUrl: '/product-images/product-017.png' },
      { id: 'li22', productId: 'grh-2201700M', productName: 'Angle Valve for basin mixer 3/8"', sku: '2201700M',
        description: '', unit: 'pcs', qty: 4, unitPrice: 1360, discount: 50, gstRate: 18, section: 'KITCHEN', imageUrl: '/product-images/product-018.png' },
    ],
    notes: 'Rate Valid for this month. Delivery as per company schedule. Freight extra as per actual.',
    termsAndConditions: '100% advance for CP items.',
    createdBy: 'Prakashbhai Punjabi',
    createdAt: new Date('2026-03-24'),
    sentAt: new Date('2026-03-24'),
  },
  {
    id: 'q02', number: 'Q-2025-0047',
    customerId: 'c03', customerName: 'Prestige Group (Mumbai)',
    customerGST: '27AACCP9012H1ZM',
    billingAddress: '6, Prestige Trade Tower, Worli, Mumbai 400018',
    siteAddress: 'Site: Prestige Windsor, Bandra East, Mumbai 400051',
    projectName: 'Prestige Windsor — Luxury Bathroom Package (Penthouse 4 Units)',
    status: 'viewed',
    validUntil: new Date(Date.now() + 1000*60*60*24*7),
    lineItems: [
      { id: 'li06', productId: 'p01', productName: 'Kohler Archer Wall-Hung WC', sku: 'KOH-WC-AWH-WH',
        description: 'Wall-hung WC, dual flush 3/6L, concealed cistern compatible', unit: 'pcs',
        qty: 4, unitPrice: 42500, discount: 5, gstRate: 18 },
      { id: 'li07', productId: 'p08', productName: 'Kohler Veil Freestanding Bathtub', sku: 'KOH-BT-VEIL-WH',
        description: 'Freestanding acrylic soaking tub, 1700mm', unit: 'pcs',
        qty: 4, unitPrice: 185000, discount: 5, gstRate: 18 },
      { id: 'li08', productId: 'p11', productName: 'Kohler Reach Thermostatic Shower System', sku: 'KOH-SS-REACH-CH',
        description: 'Complete thermostatic system, rain head + hand shower + body jets', unit: 'set',
        qty: 4, unitPrice: 95000, discount: 5, gstRate: 18 },
      { id: 'li09', productId: 'p16', productName: 'Kohler Underscore Vanity Unit 1200mm', sku: 'KOH-VU-UNDER-1200',
        description: 'Wall-hung vanity, double basin, 2-drawer soft-close', unit: 'pcs',
        qty: 4, unitPrice: 68000, discount: 5, gstRate: 18 },
      { id: 'li10', productId: 'p20', productName: 'RAK Ceramics Luster Onyx Vitrified Tile', sku: 'RAK-VT-ONYX-800',
        description: '800×800mm full-body vitrified, onyx black', unit: 'box',
        qty: 80, unitPrice: 3600, discount: 8, gstRate: 28 },
    ],
    notes: 'Premium luxury package. Delivery includes white-glove positioning to site.',
    termsAndConditions: '30% advance. 40% before dispatch. 30% on delivery and inspection.',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*24*5),
    sentAt: new Date(Date.now() - 1000*60*60*24*4),
    viewedAt: new Date(Date.now() - 1000*60*60*20),
  },
  {
    id: 'q03', number: 'Q-2025-0046',
    customerId: 'c04', customerName: 'Sanjay Patil Interior Works',
    customerGST: '27AACCS3456I1ZP',
    billingAddress: 'Shop 4, Laxmi Market, Dadar West, Mumbai 400028',
    siteAddress: 'Client Flat: 1204B, Runwal Greens, Mulund West',
    projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
    status: 'accepted',
    revisionStatus: 'DRAFT',
    validUntil: new Date(Date.now() + 1000*60*60*24*4),
    lineItems: [
      { id: 'li11', productId: 'vtr-s50-wc', productName: 'Vitra S50 Rimless WC', sku: 'VTR-S50-RWC',
        description: 'Rimless wall-hung WC, dual flush, soft-close seat', unit: 'pcs',
        qty: 2, unitPrice: 18500, discount: 5, gstRate: 18 },
      { id: 'li12', productId: 'vtr-sento', productName: 'Vitra Sento Basin 55cm', sku: 'VTR-SENTO-55',
        description: 'Wall-hung ceramic basin 550mm with overflow', unit: 'pcs',
        qty: 2, unitPrice: 11000, discount: 5, gstRate: 18 },
      { id: 'li13', productId: 'grh-rain-310', productName: 'Grohe Rainshower 310 SmartActive', sku: 'GRH-RAIN-310',
        description: 'Overhead shower 310mm with SmartActive technology', unit: 'set',
        qty: 2, unitPrice: 46200, discount: 8, gstRate: 18 },
    ],
    notes: 'Call Sanjay before delivery — 98765 99001. Site access only on weekdays.',
    termsAndConditions: '100% advance for renovation orders.',
    createdBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*7),
    sentAt: new Date(Date.now() - 1000*60*60*24*6),
    acceptedAt: new Date(Date.now() - 1000*60*60*24*2),
  },
  {
    id: 'q04', number: 'Q-2025-0045',
    customerId: 'c02', customerName: 'Lodha Developers Ltd',
    customerGST: '27AACCL5678G1ZK',
    billingAddress: '412, Lodha Supremus, Lower Parel, Mumbai 400013',
    siteAddress: 'Site: Lodha Palava City, Dombivli East',
    projectName: 'Lodha Palava — Phase 7 Bathroom Package (80 Units)',
    status: 'draft',
    validUntil: new Date(Date.now() + 1000*60*60*24*20),
    lineItems: [
      { id: 'li14', productId: 'p02', productName: 'Hindware Opus Floor-Mount WC', sku: 'HW-WC-OPUS-WH',
        description: '', unit: 'pcs', qty: 80, unitPrice: 12800, discount: 12, gstRate: 18 },
      { id: 'li15', productId: 'p05', productName: 'Kajaria Eternity White Floor Tile', sku: 'KAJ-FT-ETW-600',
        description: '', unit: 'box', qty: 320, unitPrice: 1450, discount: 15, gstRate: 28 },
      { id: 'li16', productId: 'p03', productName: 'Jaguar Lyric Basin Mixer', sku: 'JAG-BM-LYRIC-CH',
        description: '', unit: 'pcs', qty: 80, unitPrice: 8400, discount: 10, gstRate: 18 },
    ],
    notes: 'Bulk project pricing. Phased delivery schedule to be agreed.',
    termsAndConditions: '',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*2),
  },
  {
    id: 'q05', number: 'Q-2025-0044',
    customerId: 'c05', customerName: 'Green Earth Homes LLP',
    customerGST: '27AACCG7890J1ZQ',
    billingAddress: '22, Eco Park Colony, Chembur, Mumbai 400071',
    siteAddress: 'Site: Eco Park Colony Block C',
    projectName: 'Eco Park Block C — Green Bathroom Package',
    status: 'declined',
    validUntil: new Date(Date.now() - 1000*60*60*24*2),
    lineItems: [
      { id: 'li17', productId: 'p01', productName: 'Kohler Archer Wall-Hung WC', sku: 'KOH-WC-AWH-WH',
        description: '', unit: 'pcs', qty: 8, unitPrice: 42500, discount: 3, gstRate: 18 },
    ],
    notes: 'Customer went with competitor quote.',
    termsAndConditions: '',
    createdBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*10),
  },
]

// ─── Sales Orders ─────────────────────────────────────────────────────────────

const q03LineItems: LineItem[] = [
  { id: 'li11', productId: 'p02', productName: 'Hindware Opus Floor-Mount WC', sku: 'HW-WC-OPUS-WH',
    description: 'Floor-mount WC with soft-close seat', unit: 'pcs',
    qty: 2, unitPrice: 12800, discount: 5, gstRate: 18 },
  { id: 'li12', productId: 'p07', productName: 'RAK Metro Grey Wall Tile', sku: 'RAK-WT-METRO-300',
    description: '300×600mm subway wall tile, matte grey', unit: 'box',
    qty: 18, unitPrice: 980, discount: 0, gstRate: 28 },
  { id: 'li13', productId: 'p10', productName: 'Jaguar Florentine Rain Shower 300mm', sku: 'JAG-OS-FLOR-300',
    description: 'Round overhead shower with arm, chrome', unit: 'set',
    qty: 2, unitPrice: 7200, discount: 0, gstRate: 18 },
]

export const salesOrders: SalesOrder[] = [
  {
    id: 'so01', number: 'SO-2025-0456',
    quotationId: 'q03',
    customerId: 'c04', customerName: 'Sanjay Patil Interior Works',
    status: 'dispatched',
    lineItems: q03LineItems,
    deliveryDate: new Date(Date.now() + 1000*60*60*24*2),
    deliveryAddress: 'Client Flat: 1204B, Runwal Greens, Mulund West',
    projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
    notes: 'Call before delivery.',
    createdAt: new Date(Date.now() - 1000*60*60*24*2),
    dispatchedAt: new Date(Date.now() - 1000*60*60*6),
  },
  {
    id: 'so02', number: 'SO-2025-0451',
    customerId: 'c03', customerName: 'Prestige Group (Mumbai)',
    status: 'delivered',
    lineItems: [
      { id: 'li18', productId: 'p20', productName: 'RAK Ceramics Luster Onyx Vitrified Tile',
        sku: 'RAK-VT-ONYX-800', description: '800×800mm full-body vitrified', unit: 'box',
        qty: 24, unitPrice: 3600, discount: 8, gstRate: 28 },
    ],
    deliveryDate: new Date(Date.now() - 1000*60*60*24*1),
    deliveryAddress: 'Prestige Windsor Site, Bandra East',
    projectName: 'Prestige Windsor — Villa Wing Flooring',
    notes: 'White-glove delivery completed.',
    createdAt: new Date(Date.now() - 1000*60*60*24*5),
    dispatchedAt: new Date(Date.now() - 1000*60*60*24*2),
    deliveredAt: new Date(Date.now() - 1000*60*60*24),
  },
  {
    id: 'so03', number: 'SO-2025-0448',
    customerId: 'c01', customerName: 'Rajesh Constructions Pvt Ltd',
    status: 'processing',
    lineItems: [
      { id: 'li19', productId: 'p03', productName: 'Jaguar Lyric Basin Mixer',
        sku: 'JAG-BM-LYRIC-CH', description: 'Single-lever, chrome', unit: 'pcs',
        qty: 8, unitPrice: 8400, discount: 8, gstRate: 18 },
      { id: 'li20', productId: 'p18', productName: 'Jaguar Continental Angle Cock',
        sku: 'JAG-AC-CONT-15', description: '15mm, quarter-turn, chrome', unit: 'pcs',
        qty: 24, unitPrice: 480, discount: 5, gstRate: 18 },
    ],
    deliveryDate: new Date(Date.now() + 1000*60*60*24*3),
    deliveryAddress: 'Rajesh Heights Site, Andheri West',
    projectName: 'Rajesh Heights — CP Fittings (Phase 1)',
    notes: '',
    createdAt: new Date(Date.now() - 1000*60*60*24*1),
  },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────

const so02LineItems: LineItem[] = [
  { id: 'li18', productId: 'p20', productName: 'RAK Ceramics Luster Onyx Vitrified Tile',
    sku: 'RAK-VT-ONYX-800', description: '800×800mm full-body vitrified', unit: 'box',
    qty: 24, unitPrice: 3600, discount: 8, gstRate: 28 },
]

export const invoices: Invoice[] = [
  {
    id: 'inv01', number: 'INV-2025-0156',
    orderId: 'so02', customerId: 'c03', customerName: 'Prestige Group (Mumbai)',
    customerGST: '27AACCP9012H1ZM',
    billingAddress: '6, Prestige Trade Tower, Worli, Mumbai 400018',
    status: 'paid',
    lineItems: so02LineItems,
    issueDate: new Date(Date.now() - 1000*60*60*24*1),
    dueDate: new Date(Date.now() + 1000*60*60*24*29),
    paidAmount: 112882,
    notes: '',
    createdAt: new Date(Date.now() - 1000*60*60*24),
    sentAt: new Date(Date.now() - 1000*60*60*22),
    paidAt: new Date(Date.now() - 1000*60*60*4),
  },
  {
    id: 'inv02', number: 'INV-2025-0155',
    orderId: 'so01', customerId: 'c04', customerName: 'Sanjay Patil Interior Works',
    customerGST: '27AACCS3456I1ZP',
    billingAddress: 'Shop 4, Laxmi Market, Dadar West, Mumbai 400028',
    status: 'sent',
    lineItems: q03LineItems,
    issueDate: new Date(Date.now() - 1000*60*60*24*2),
    dueDate: new Date(Date.now() + 1000*60*60*24*13),
    paidAmount: 0,
    notes: 'Please pay before dispatch.',
    createdAt: new Date(Date.now() - 1000*60*60*48),
    sentAt: new Date(Date.now() - 1000*60*60*47),
  },
  {
    id: 'inv03', number: 'INV-2025-0148',
    customerId: 'c01', customerName: 'Rajesh Constructions Pvt Ltd',
    customerGST: '27AACCR1234F1Z5',
    billingAddress: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    status: 'overdue',
    lineItems: [
      { id: 'li21', productId: 'p05', productName: 'Kajaria Eternity White Floor Tile',
        sku: 'KAJ-FT-ETW-600', description: '', unit: 'box',
        qty: 60, unitPrice: 1450, discount: 8, gstRate: 28 },
    ],
    issueDate: new Date(Date.now() - 1000*60*60*24*20),
    dueDate: new Date(Date.now() - 1000*60*60*24*5),
    paidAmount: 0,
    notes: 'Follow up required. 3rd reminder sent.',
    createdAt: new Date(Date.now() - 1000*60*60*24*20),
    sentAt: new Date(Date.now() - 1000*60*60*24*19),
  },
  {
    id: 'inv04', number: 'INV-2025-0142',
    customerId: 'c01', customerName: 'Rajesh Constructions Pvt Ltd',
    customerGST: '27AACCR1234F1Z5',
    billingAddress: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    status: 'partial',
    lineItems: [
      { id: 'li22', productId: 'p02', productName: 'Hindware Opus Floor-Mount WC',
        sku: 'HW-WC-OPUS-WH', description: '', unit: 'pcs',
        qty: 6, unitPrice: 12800, discount: 8, gstRate: 18 },
      { id: 'li23', productId: 'p09', productName: 'Hindware Calido Wash Basin',
        sku: 'HW-WB-CALI-WH', description: '', unit: 'pcs',
        qty: 6, unitPrice: 5600, discount: 8, gstRate: 18 },
    ],
    issueDate: new Date(Date.now() - 1000*60*60*24*28),
    dueDate: new Date(Date.now() + 1000*60*60*24*2),
    paidAmount: 45000,
    notes: 'Partial payment received 15 Feb. Balance due.',
    createdAt: new Date(Date.now() - 1000*60*60*24*28),
    sentAt: new Date(Date.now() - 1000*60*60*24*27),
  },
]

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments: Payment[] = [
  {
    id: 'pay01', invoiceId: 'inv01', invoiceNumber: 'INV-2025-0156',
    customerId: 'c03', customerName: 'Prestige Group (Mumbai)',
    amount: 112882, method: 'bank_transfer',
    reference: 'UTR: HDFC250322004456',
    notes: 'Full payment received. HDFC RTGS.',
    receivedAt: new Date(Date.now() - 1000*60*60*4),
    recordedBy: 'Suresh Iyer',
  },
  {
    id: 'pay02', invoiceId: 'inv04', invoiceNumber: 'INV-2025-0142',
    customerId: 'c01', customerName: 'Rajesh Constructions Pvt Ltd',
    amount: 45000, method: 'cheque',
    reference: 'Cheque No: ICICI 004892',
    notes: 'Partial — balance ₹38,670 outstanding.',
    receivedAt: new Date(Date.now() - 1000*60*60*24*13),
    recordedBy: 'Ramesh Pawar',
  },
  {
    id: 'pay03', invoiceId: 'inv01', invoiceNumber: 'INV-2025-0150',
    customerId: 'c02', customerName: 'Lodha Developers Ltd',
    amount: 284000, method: 'bank_transfer',
    reference: 'UTR: AXIS250315009871',
    notes: 'Full payment. AXIS NEFT.',
    receivedAt: new Date(Date.now() - 1000*60*60*24*7),
    recordedBy: 'Suresh Iyer',
  },
]
