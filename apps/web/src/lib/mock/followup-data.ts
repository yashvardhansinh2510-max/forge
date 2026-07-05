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

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = Date.now()
const d = (days: number) => new Date(now + days * 86_400_000)

export const followUps: FollowUp[] = [
  // ── Walk-in 1: Architect, Grohe + Axor, interested, next follow-up overdue ─
  {
    id: 'fu01',
    type: 'walk_in',
    customerName: 'Ar. Anjali Sharma',
    customerPhone: '+91 98200 77345',
    customerType: 'architect',
    brandsInterested: ['Grohe', 'Axor'],
    productsNoted: 'Grohe Rainshower 310, Axor Urquiola basin mixer, thermostatic systems',
    estimatedBudget: 480000,
    projectName: 'Hiranandani Fortune City — 3 premium bathrooms',
    status: 'interested',
    nextFollowUpDate: d(-2),
    lastContactedAt: d(-5),
    notes: 'Came in with client. Loved the Axor Urquiola display. Requested detailed spec sheet.',
    responses: [
      {
        id: 'r01a', date: d(-5),
        method: 'visit',
        outcome: 'Visited showroom with client. Very interested in Axor Urquiola range. Took catalog.',
        nextAction: 'Follow up with detailed quotation for 3 bathrooms',
        staffMember: 'Suresh Iyer',
      },
      {
        id: 'r01b', date: d(-3),
        method: 'whatsapp',
        outcome: 'Confirmed budget is ₹4–5L. Wants thermostatic shower for master bath.',
        nextAction: 'Send revised spec sheet with Grohe Grohtherm 3000 option',
        staffMember: 'Suresh Iyer',
      },
    ],
    assignedTo: 'Suresh Iyer',
    createdAt: d(-7),
    updatedAt: d(-3),
  },

  // ── Walk-in 2: Interior Designer, Hansgrohe + Vitra, negotiating ──────────
  {
    id: 'fu02',
    type: 'walk_in',
    customerName: 'Priya Nambiar',
    customerPhone: '+91 70456 88123',
    customerType: 'interior_designer',
    brandsInterested: ['Hansgrohe', 'Vitra'],
    productsNoted: 'Hansgrohe Metropol faucets, Vitra S50 wall-hung WC, Vitra Sento basin',
    estimatedBudget: 320000,
    projectName: 'Bandra West 4BHK renovation — 2 bathrooms',
    status: 'negotiating',
    nextFollowUpDate: d(1),
    lastContactedAt: d(-1),
    notes: 'Price-sensitive client. Has competing quote from Kohler dealer in Andheri.',
    responses: [
      {
        id: 'r02a', date: d(-4),
        method: 'visit',
        outcome: 'Walked in, knew what she wanted. Comparing us with another dealer.',
        nextAction: 'Prepare best-price offer for Hansgrohe Metropol + Vitra S50 combo',
        staffMember: 'Ramesh Pawar',
      },
      {
        id: 'r02b', date: d(-1),
        method: 'call',
        outcome: 'Reviewed our quote. Wants 15% discount. We offered 12%.',
        nextAction: 'Check if 13% is possible with manager approval. Call back tomorrow.',
        staffMember: 'Ramesh Pawar',
      },
    ],
    assignedTo: 'Ramesh Pawar',
    createdAt: d(-6),
    updatedAt: d(-1),
  },

  // ── Walk-in 3: Builder, Kajaria + Vitra, pending (new walk-in today) ──────
  {
    id: 'fu03',
    type: 'walk_in',
    customerName: 'Mahesh Thakur',
    customerPhone: '+91 99204 33567',
    customerType: 'builder',
    brandsInterested: ['Kajaria', 'Vitra'],
    productsNoted: 'Kajaria 600×600 floor tiles, Vitra S20 WC for affordable segment',
    estimatedBudget: 1200000,
    projectName: 'Mulund East residential complex — 24 units',
    status: 'pending',
    nextFollowUpDate: d(2),
    notes: 'Large builder project. Budget-conscious. Needs bulk pricing sheet for tiles + sanitary.',
    responses: [
      {
        id: 'r03a', date: d(0),
        method: 'visit',
        outcome: 'Walked in this morning. Interested in bulk pricing. Took Kajaria catalogue.',
        nextAction: 'Prepare bulk pricing sheet and share by tomorrow EOD',
        staffMember: 'Suresh Iyer',
      },
    ],
    assignedTo: 'Suresh Iyer',
    createdAt: d(0),
    updatedAt: d(0),
  },

  // ── Walk-in 4: Retail, Grohe, contacted (overdue) ─────────────────────────
  {
    id: 'fu04',
    type: 'walk_in',
    customerName: 'Deepak Sawant',
    customerPhone: '+91 87654 12098',
    customerType: 'retail',
    brandsInterested: ['Grohe'],
    productsNoted: 'Grohe Euphoria shower set for home renovation',
    estimatedBudget: 85000,
    projectName: 'Chembur home bathroom upgrade',
    status: 'contacted',
    nextFollowUpDate: d(-3),
    lastContactedAt: d(-6),
    notes: 'Single bathroom renovation. Was comparing online prices.',
    responses: [
      {
        id: 'r04a', date: d(-8),
        method: 'visit',
        outcome: 'Retail customer. Wanted to see Grohe Euphoria in action. Quoted ₹82,500.',
        nextAction: 'Call in 2 days to confirm',
        staffMember: 'Ramesh Pawar',
      },
      {
        id: 'r04b', date: d(-6),
        method: 'call',
        outcome: 'Said he is still deciding. Will call back.',
        nextAction: 'Follow up again in 3 days',
        staffMember: 'Ramesh Pawar',
      },
    ],
    assignedTo: 'Ramesh Pawar',
    createdAt: d(-10),
    updatedAt: d(-6),
  },

  // ── Quotation-linked 1: Q-2025-0048 (Rajesh, sent) → pending follow-up ───
  {
    id: 'fu05',
    type: 'quotation',
    customerName: 'Rajesh Constructions Pvt Ltd',
    customerPhone: '+91 98200 11234',
    customerType: 'builder',
    brandsInterested: ['Kajaria'],
    productsNoted: 'Hindware Opus WC, Jaguar Lyric Basin Mixer, Kajaria floor tiles — 12 units',
    estimatedBudget: undefined,
    projectName: 'Rajesh Heights — Bathroom Package (12 Units)',
    quotationId: 'q01',
    quotationNumber: 'Q-2025-0048',
    quotationValue: 298000,
    status: 'pending',
    nextFollowUpDate: d(1),
    notes: 'Quotation was sent 2 days ago. Waiting for response from Rajesh Mehta.',
    responses: [
      {
        id: 'r05a', date: d(-2),
        method: 'whatsapp',
        outcome: 'Sent quotation via WhatsApp. Rajesh acknowledged receipt.',
        nextAction: 'Follow up call by Thursday',
        staffMember: 'Suresh Iyer',
      },
    ],
    assignedTo: 'Suresh Iyer',
    createdAt: d(-2),
    updatedAt: d(-2),
  },

  // ── Quotation-linked 2: Q-2025-0047 (Prestige, viewed) → contacted ───────
  {
    id: 'fu06',
    type: 'quotation',
    customerName: 'Prestige Group (Mumbai)',
    customerPhone: '+91 87654 99001',
    customerType: 'builder',
    brandsInterested: ['Grohe'],
    productsNoted: 'Kohler luxury package — bathtubs, thermostatic showers, vanity units — 4 penthouse units',
    estimatedBudget: undefined,
    projectName: 'Prestige Windsor — Luxury Bathroom Package (Penthouse 4 Units)',
    quotationId: 'q02',
    quotationNumber: 'Q-2025-0047',
    quotationValue: 1724000,
    status: 'contacted',
    nextFollowUpDate: d(2),
    lastContactedAt: d(-1),
    notes: 'Client viewed the quotation yesterday. Anand Krishnan said they need board approval.',
    responses: [
      {
        id: 'r06a', date: d(-4),
        method: 'whatsapp',
        outcome: 'Sent Q-2025-0047 to Anand Krishnan. He confirmed receipt.',
        nextAction: 'Follow up once viewed',
        staffMember: 'Suresh Iyer',
      },
      {
        id: 'r06b', date: d(-1),
        method: 'call',
        outcome: 'Quotation was viewed. Anand said price is within budget but needs board sign-off. Will revert by Thursday.',
        nextAction: 'Wait till Thursday, then follow up',
        staffMember: 'Suresh Iyer',
      },
    ],
    assignedTo: 'Suresh Iyer',
    createdAt: d(-4),
    updatedAt: d(-1),
  },

  // ── Quotation-linked 3: Q-2025-0046 (Sanjay Patil, accepted) → won ───────
  {
    id: 'fu07',
    type: 'quotation',
    customerName: 'Sanjay Patil Interior Works',
    customerPhone: '+91 99204 56789',
    customerType: 'interior_designer',
    brandsInterested: ['Vitra', 'Grohe'],
    productsNoted: 'Vitra S50 WC, Vitra Sento basin, Grohe Rainshower 310 — 2 bathrooms',
    estimatedBudget: undefined,
    projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
    quotationId: 'q03',
    quotationNumber: 'Q-2025-0046',
    quotationValue: 176000,
    status: 'won',
    nextFollowUpDate: d(7),
    lastContactedAt: d(-2),
    notes: 'Order confirmed! Advance paid. Delivery scheduled.',
    responses: [
      {
        id: 'r07a', date: d(-6),
        method: 'whatsapp',
        outcome: 'Sent quotation to Sanjay. He said he will show to client.',
        nextAction: 'Follow up in 2 days',
        staffMember: 'Ramesh Pawar',
      },
      {
        id: 'r07b', date: d(-4),
        method: 'call',
        outcome: 'Client approved! Sanjay confirmed order. Will pay advance today.',
        nextAction: 'Issue sales order and coordinate delivery',
        staffMember: 'Ramesh Pawar',
      },
      {
        id: 'r07c', date: d(-2),
        method: 'call',
        outcome: 'Advance payment received. Delivery confirmed for next week.',
        nextAction: 'Coordinate with dispatch team for Mulund delivery',
        staffMember: 'Ramesh Pawar',
      },
    ],
    assignedTo: 'Ramesh Pawar',
    createdAt: d(-7),
    updatedAt: d(-2),
  },

  // ── Quotation-linked 4: Q-2025-0044 (Green Earth, declined) → lost ────────
  {
    id: 'fu08',
    type: 'quotation',
    customerName: 'Green Earth Homes LLP',
    customerPhone: '+91 70456 12345',
    customerType: 'builder',
    brandsInterested: ['Grohe'],
    productsNoted: 'Kohler Archer Wall-Hung WC — 8 units',
    estimatedBudget: undefined,
    projectName: 'Eco Park Block C — Green Bathroom Package',
    quotationId: 'q05',
    quotationNumber: 'Q-2025-0044',
    quotationValue: 329400,
    status: 'lost',
    nextFollowUpDate: d(30),
    lastContactedAt: d(-7),
    notes: 'Customer chose a competitor. Will circle back in 30 days for next project.',
    responses: [
      {
        id: 'r08a', date: d(-10),
        method: 'whatsapp',
        outcome: 'Sent quotation. Meera said she is comparing with 2 other vendors.',
        nextAction: 'Follow up in 3 days',
        staffMember: 'Ramesh Pawar',
      },
      {
        id: 'r08b', date: d(-7),
        method: 'call',
        outcome: 'Meera Desai said they went with a competitor who offered 20% lower price. Cannot match.',
        nextAction: 'Add to re-engage list in 30 days for next project',
        staffMember: 'Ramesh Pawar',
      },
    ],
    assignedTo: 'Ramesh Pawar',
    createdAt: d(-12),
    updatedAt: d(-7),
  },

  // ── Walk-in 5: Architect, Axor + Hansgrohe, interested ───────────────────
  {
    id: 'fu09',
    type: 'walk_in',
    customerName: 'Ar. Neha Joshi',
    customerPhone: '+91 90000 44231',
    customerType: 'architect',
    brandsInterested: ['Axor', 'Hansgrohe'],
    productsNoted: 'Axor Citterio E floor-mount tub faucet, Hansgrohe Raindance shower head',
    estimatedBudget: 650000,
    projectName: 'Juhu villa — master bathroom + guest bath',
    status: 'interested',
    nextFollowUpDate: d(3),
    lastContactedAt: d(-1),
    notes: 'High-end residential project in Juhu. Wants only German brands. Very design-conscious.',
    responses: [
      {
        id: 'r09a', date: d(-3),
        method: 'visit',
        outcome: 'Came in with mood board. Very specific — Axor Citterio E for master, Hansgrohe Raindance for guest.',
        nextAction: 'Source exact SKUs and prepare detailed quote',
        staffMember: 'Suresh Iyer',
      },
      {
        id: 'r09b', date: d(-1),
        method: 'whatsapp',
        outcome: 'Sent product links and preliminary pricing. She confirmed these are the right products.',
        nextAction: 'Formal quotation by Thursday',
        staffMember: 'Suresh Iyer',
      },
    ],
    assignedTo: 'Suresh Iyer',
    createdAt: d(-5),
    updatedAt: d(-1),
  },

  // ── Quotation-linked 5: Q-2025-0045 (Lodha, draft) → pending, just created
  {
    id: 'fu10',
    type: 'quotation',
    customerName: 'Lodha Developers Ltd',
    customerPhone: '+91 98765 44321',
    customerType: 'builder',
    brandsInterested: ['Kajaria'],
    productsNoted: 'Hindware WC + Kajaria floor tiles + Jaguar mixers — 80 units bulk project',
    estimatedBudget: undefined,
    projectName: 'Lodha Palava — Phase 7 Bathroom Package (80 Units)',
    quotationId: 'q04',
    quotationNumber: 'Q-2025-0045',
    quotationValue: 2180000,
    status: 'pending',
    nextFollowUpDate: d(3),
    notes: 'Draft quotation. Will be sent to Priya Nair once approved internally.',
    responses: [],
    assignedTo: 'Suresh Iyer',
    createdAt: d(0),
    updatedAt: d(0),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getFollowUpByQuotationId(quotationId: string): FollowUp | undefined {
  return followUps.find((f) => f.quotationId === quotationId)
}

export function getFollowUpByQuotationNumber(quotationNumber: string): FollowUp | undefined {
  return followUps.find((f) => f.quotationNumber === quotationNumber)
}

export function getActiveFollowUps(): FollowUp[] {
  return followUps.filter((f) => f.status !== 'won' && f.status !== 'lost')
}

export function getOverdueFollowUps(): FollowUp[] {
  const today = new Date()
  return followUps.filter((f) => {
    const isOpen = f.status !== 'won' && f.status !== 'lost' && f.status !== 'overdue'
    return isOpen && f.nextFollowUpDate < today
  })
}

/** Compute effective status — overdue if open and next date is past. */
export function getEffectiveStatus(f: FollowUp): FollowUpStatus {
  if (f.status === 'won' || f.status === 'lost') return f.status
  const today = new Date()
  if (f.nextFollowUpDate < today && f.status !== 'overdue') return 'overdue'
  return f.status
}

export function updateFollowUpStatus(id: string, status: FollowUpStatus): void {
  const idx = followUps.findIndex((f) => f.id === id)
  if (idx !== -1) {
    followUps[idx] = { ...followUps[idx]!, status, updatedAt: new Date() }
  }
}

export function updateFollowUpNextDate(id: string, date: Date): void {
  const idx = followUps.findIndex((f) => f.id === id)
  if (idx !== -1) {
    followUps[idx] = { ...followUps[idx]!, nextFollowUpDate: date, updatedAt: new Date() }
  }
}

export function addFollowUpResponse(id: string, response: FollowUpResponse, nextDate: Date): void {
  const idx = followUps.findIndex((f) => f.id === id)
  if (idx !== -1) {
    followUps[idx] = {
      ...followUps[idx]!,
      responses: [response, ...followUps[idx]!.responses],
      lastContactedAt: response.date,
      nextFollowUpDate: nextDate,
      updatedAt: new Date(),
    }
  }
}

export function createFollowUpForQuotation(params: {
  quotationId: string
  quotationNumber: string
  quotationValue: number
  customerName: string
  customerPhone: string
  brandsInterested: string[]
  projectName: string
  assignedTo: string
}): FollowUp {
  const fu: FollowUp = {
    id: `fu${Date.now()}`,
    type: 'quotation',
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    customerType: 'builder',
    brandsInterested: params.brandsInterested,
    productsNoted: '',
    projectName: params.projectName,
    quotationId: params.quotationId,
    quotationNumber: params.quotationNumber,
    quotationValue: params.quotationValue,
    status: 'pending',
    nextFollowUpDate: new Date(Date.now() + 3 * 86_400_000),
    notes: '',
    responses: [],
    assignedTo: params.assignedTo,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  followUps.unshift(fu)
  return fu
}

export function createWalkInFollowUp(params: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>): FollowUp {
  const fu: FollowUp = {
    ...params,
    id: `fu${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  followUps.unshift(fu)
  return fu
}
