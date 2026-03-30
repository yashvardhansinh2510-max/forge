export type DeliveryStatus = 'scheduled' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'failed'

export interface DeliveryItem {
  productName: string
  qty: number
  unit: string
}

export interface Delivery {
  id: string
  deliveryNumber: string
  orderNumber: string
  customerName: string
  customerCompany: string | null
  items: DeliveryItem[]
  scheduledDate: Date
  address: string
  driverName: string
  vehicleNumber: string
  status: DeliveryStatus
  notes: string
}

export const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, { label: string; dot: 'neutral' | 'positive' | 'negative' | 'caution' | 'accent' }> = {
  scheduled:        { label: 'Scheduled',        dot: 'neutral' },
  dispatched:       { label: 'Dispatched',       dot: 'accent' },
  out_for_delivery: { label: 'Out for Delivery', dot: 'caution' },
  delivered:        { label: 'Delivered',        dot: 'positive' },
  failed:           { label: 'Failed',           dot: 'negative' },
}

export const deliveries: Delivery[] = [
  {
    id: 'del01',
    deliveryNumber: 'DEL-2026-001',
    orderNumber: 'SO-2026-042',
    customerName: 'Kiran Desai',
    customerCompany: 'KD Building Works',
    items: [
      { productName: 'Jaguar Continental Basin Mixer', qty: 12, unit: 'pcs' },
      { productName: 'Hindware Viva Wall-Hung Basin', qty: 12, unit: 'pcs' },
    ],
    scheduledDate: new Date(Date.now() + 1000*60*60*24*1),
    address: 'Plot 8, Shivaji Nagar, Kalyan West, Thane 421301',
    driverName: 'Raju Patil',
    vehicleNumber: 'MH-04-AB-1234',
    status: 'scheduled',
    notes: 'Deliver before 10am — site opens at 9am',
  },
  {
    id: 'del02',
    deliveryNumber: 'DEL-2026-002',
    orderNumber: 'SO-2026-038',
    customerName: 'Rajesh Shetty',
    customerCompany: 'Rajesh Constructions Pvt Ltd',
    items: [
      { productName: 'Jaguar Indus 2-in-1 Combination', qty: 40, unit: 'pcs' },
      { productName: 'Nexion ABS Overhead Shower', qty: 40, unit: 'pcs' },
    ],
    scheduledDate: new Date(Date.now() - 1000*60*60*24*1),
    address: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    driverName: 'Sunil Kumar',
    vehicleNumber: 'MH-01-CD-5678',
    status: 'delivered',
    notes: 'Phase 1 delivery of 40 units. 2 more deliveries remaining.',
  },
  {
    id: 'del03',
    deliveryNumber: 'DEL-2026-003',
    orderNumber: 'SO-2026-041',
    customerName: 'Dr. Meera Iyer',
    customerCompany: null,
    items: [
      { productName: 'Grohe Essence Basin Mixer', qty: 3, unit: 'pcs' },
      { productName: 'Qutone Calacatta Marble Tile', qty: 45, unit: 'boxes' },
    ],
    scheduledDate: new Date(Date.now() + 1000*60*60*24*5),
    address: 'Flat 2204, Hiranandani Gardens, Powai, Mumbai 400076',
    driverName: 'Raju Patil',
    vehicleNumber: 'MH-04-AB-1234',
    status: 'scheduled',
    notes: 'Call 30 min before arrival — building has strict entry rules',
  },
]
