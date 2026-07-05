<<<<<<< HEAD
// ─── Types ────────────────────────────────────────────────────────────────────

export type FollowUpType = 'walk_in' | 'quotation'

export type FollowUpStatus =
  | 'pending'      // New, not yet contacted
  | 'contacted'    // Called / WhatsApp'd, waiting for response
  | 'interested'   // Customer confirmed interest
  | 'negotiating'  // Price discussion ongoing
  | 'won'          // Converted — order confirmed
  | 'lost'         // Customer declined / went elsewhere
  | 'overdue'      // nextFollowUpDate is in the past and not closed

export type CustomerType = 'architect' | 'interior_designer' | 'builder' | 'retail' | 'other'
export type ResponseMethod = 'call' | 'whatsapp' | 'email' | 'visit'

export interface FollowUpResponse {
  id: string
  date: Date
  method: ResponseMethod
  outcome: string
  nextAction: string
  staffMember: string
}

export interface FollowUp {
  id: string
  type: FollowUpType

  // Customer info
  customerName: string
  customerPhone: string
  customerType: CustomerType

  // Interest detail
  brandsInterested: string[]
  productsNoted: string
  estimatedBudget?: number
  projectName?: string

  // Quotation link (type === 'quotation' only)
  quotationId?: string
  quotationNumber?: string
  quotationValue?: number

  // Status & scheduling
  status: FollowUpStatus
  nextFollowUpDate: Date
  lastContactedAt?: Date

  // Activity
  notes: string
  responses: FollowUpResponse[]

  // Meta
  assignedTo: string
  createdAt: Date
  updatedAt: Date
}

// ─── Status config ────────────────────────────────────────────────────────────

export type BadgeDot = 'neutral' | 'positive' | 'negative' | 'caution' | 'accent'

export const FOLLOWUP_STATUS_CONFIG: Record<
  FollowUpStatus,
  { label: string; bg: string; text: string; dot: BadgeDot }
> = {
  pending:     { label: 'Pending',     bg: 'rgba(142,142,147,0.10)', text: '#636366', dot: 'neutral'  },
  contacted:   { label: 'Contacted',   bg: 'rgba(0,113,227,0.08)',   text: '#0071E3', dot: 'accent'   },
  interested:  { label: 'Interested',  bg: 'rgba(8,145,178,0.08)',   text: '#0891B2', dot: 'accent'   },
  negotiating: { label: 'Negotiating', bg: 'rgba(154,103,0,0.08)',   text: '#9A6700', dot: 'caution'  },
  won:         { label: 'Won',         bg: 'rgba(26,127,55,0.08)',   text: '#1A7F37', dot: 'positive' },
  lost:        { label: 'Lost',        bg: 'rgba(207,34,46,0.08)',   text: '#CF222E', dot: 'negative' },
  overdue:     { label: 'Overdue',     bg: 'rgba(207,34,46,0.08)',   text: '#CF222E', dot: 'negative' },
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  architect:          'Architect',
  interior_designer:  'Interior Designer',
  builder:            'Builder',
  retail:             'Retail',
  other:              'Other',
}

export const RESPONSE_METHOD_LABELS: Record<ResponseMethod, string> = {
  call:     'Call',
  whatsapp: 'WhatsApp',
  email:    'Email',
  visit:    'Visit',
}

export const ALL_BRANDS = ['Grohe', 'Axor', 'Hansgrohe', 'Vitra', 'Kajaria'] as const

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Compute effective display status — overdue if open and next date is past. */
export function getEffectiveStatus(f: Pick<FollowUp, 'status' | 'nextFollowUpDate'>): FollowUpStatus {
  if (f.status === 'won' || f.status === 'lost') return f.status
  const today = new Date()
  if (f.nextFollowUpDate < today && f.status !== 'overdue') return 'overdue'
  return f.status
}
=======
export {
  getEffectiveStatus,
  type CustomerType,
  type FollowUp,
  type FollowUpStatus,
  type ResponseMethod,
} from './mock/followup-data'
>>>>>>> origin/main
