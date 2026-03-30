export type ContactType = 'architect' | 'interior_designer' | 'builder' | 'contractor' | 'retail' | 'institutional'
export type DealStage = 'enquiry' | 'site_visit' | 'sample_sent' | 'quote_shared' | 'negotiation' | 'won' | 'lost'
export type ActivityType = 'call' | 'whatsapp' | 'email' | 'site_visit' | 'showroom_visit' | 'meeting' | 'note' | 'quote_sent' | 'sample_sent'

export interface Owner {
  name: string
  initials: string
  color: string
}

export interface Contact {
  id: string
  name: string
  title: string
  type: ContactType
  company: string | null
  companyId: string | null
  email: string
  phone: string
  whatsapp: string | null
  city: string
  area: string
  tags: string[]
  owner: Owner
  stage: DealStage
  source: string
  totalDeals: number
  wonDeals: number
  totalRevenue: number
  lastActivityAt: Date
  lastActivityType: ActivityType
  createdAt: Date
  notes: string
  avatar: null
  color: string
}

export interface Company {
  id: string
  name: string
  type: string
  website: string | null
  industry: string
  size: string
  city: string
  area: string
  gstin: string
  address: string
  totalContacts: number
  totalDeals: number
  totalRevenue: number
  owner: Owner
  color: string
  tags: string[]
  createdAt: Date
}

export interface Deal {
  id: string
  title: string
  contactId: string
  contactName: string
  companyId: string | null
  companyName: string | null
  stage: DealStage
  value: number
  probability: number
  closeDate: Date
  brands: string[]
  projectType: string
  units: number
  owner: Owner
  createdAt: Date
  notes: string
}

export interface Activity {
  id: string
  type: ActivityType
  contactId: string
  contactName: string
  dealId: string
  subject: string
  body: string
  outcome: string
  createdBy: string
  createdAt: Date
  duration: number | null
}

export const contacts: Contact[] = [
  {
    id: 'ct01',
    name: 'Ar. Vikram Mehta',
    title: 'Principal Architect',
    type: 'architect',
    company: 'Mehta Architects Studio',
    companyId: 'co01',
    email: 'vikram@mehtaarchitects.in',
    phone: '+91 98200 44512',
    whatsapp: '+91 98200 44512',
    city: 'Mumbai', area: 'Bandra West',
    tags: ['premium-brands', 'kohler-preferred', 'high-value'],
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    stage: 'quote_shared',
    source: 'Referral — Lodha Group',
    totalDeals: 6,
    wonDeals: 4,
    totalRevenue: 4820000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*3),
    lastActivityType: 'whatsapp',
    createdAt: new Date(Date.now() - 1000*60*60*24*120),
    notes: 'Prefers Grohe and Axor for high-end projects. Always wants samples before specifying. Call only before 6pm.',
    avatar: null,
    color: '#0071E3',
  },
  {
    id: 'ct02',
    name: 'Priya Nair',
    title: 'Senior Interior Designer',
    type: 'interior_designer',
    company: 'Priya Nair Interiors',
    companyId: 'co02',
    email: 'priya@pninteriors.com',
    phone: '+91 87654 22001',
    whatsapp: '+91 87654 22001',
    city: 'Mumbai', area: 'Juhu',
    tags: ['luxury-residential', 'axor-fan', 'fast-turnaround'],
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    stage: 'negotiation',
    source: 'Instagram DM',
    totalDeals: 9,
    wonDeals: 7,
    totalRevenue: 3140000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*8),
    lastActivityType: 'site_visit',
    createdAt: new Date(Date.now() - 1000*60*60*24*200),
    notes: 'Works exclusively on luxury residential. Has brought in Prestige and Lodha projects. Loves Axor Starck collection.',
    avatar: null,
    color: '#7C3AED',
  },
  {
    id: 'ct03',
    name: 'Rajesh Shetty',
    title: 'Director — Procurement',
    type: 'builder',
    company: 'Rajesh Constructions Pvt Ltd',
    companyId: 'co03',
    email: 'rajesh.shetty@rajeshcon.com',
    phone: '+91 98765 11234',
    whatsapp: '+91 98765 11234',
    city: 'Mumbai', area: 'Andheri East',
    tags: ['bulk-buyer', '30-day-credit', 'price-sensitive'],
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    stage: 'won',
    source: 'Cold outreach',
    totalDeals: 14,
    wonDeals: 11,
    totalRevenue: 8240000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*24),
    lastActivityType: 'call',
    createdAt: new Date(Date.now() - 1000*60*60*24*365),
    notes: 'Buys in bulk — 50–200 units per order. Needs 30-day credit. Very price-focused, less brand-conscious. Best contact for Hindware/Kajaria.',
    avatar: null,
    color: '#059669',
  },
  {
    id: 'ct04',
    name: 'Anita Lobo',
    title: 'Design Director',
    type: 'interior_designer',
    company: 'Studio Anita Lobo',
    companyId: 'co04',
    email: 'anita@studioanitalobo.com',
    phone: '+91 90001 34567',
    whatsapp: '+91 90001 34567',
    city: 'Mumbai', area: 'Lower Parel',
    tags: ['boutique-residential', 'vitra-preferred', 'slow-decision-maker'],
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    stage: 'sample_sent',
    source: 'AD India feature',
    totalDeals: 3,
    wonDeals: 2,
    totalRevenue: 1820000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*24*3),
    lastActivityType: 'sample_sent',
    createdAt: new Date(Date.now() - 1000*60*60*24*60),
    notes: 'Takes 4–6 weeks to decide. Very detail-oriented. Prefers Vitra for sanitary ware, Hansgrohe mixers. Worth the wait — large budgets.',
    avatar: null,
    color: '#D97706',
  },
  {
    id: 'ct05',
    name: 'Kiran Desai',
    title: 'Site Manager',
    type: 'contractor',
    company: 'KD Building Works',
    companyId: 'co05',
    email: 'kiran.desai@kdbuild.in',
    phone: '+91 98452 66781',
    whatsapp: '+91 98452 66781',
    city: 'Thane', area: 'Kalyan',
    tags: ['fast-mover', 'cash-buyer', 'mid-range'],
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    stage: 'quote_shared',
    source: 'Walk-in showroom',
    totalDeals: 8,
    wonDeals: 6,
    totalRevenue: 680000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*5),
    lastActivityType: 'call',
    createdAt: new Date(Date.now() - 1000*60*60*24*90),
    notes: 'Usually wants standard Jaguar/Hindware. Quick decisions when stock available. Pays cash or same-day NEFT.',
    avatar: null,
    color: '#BE123C',
  },
  {
    id: 'ct06',
    name: 'Sameer Kapoor',
    title: 'VP — Projects',
    type: 'builder',
    company: 'Lodha Developers Ltd',
    companyId: 'co06',
    email: 'sameer.kapoor@lodha.com',
    phone: '+91 98200 88001',
    whatsapp: null,
    city: 'Mumbai', area: 'Lower Parel',
    tags: ['strategic-account', 'premium', '60-day-credit', 'annual-contract'],
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    stage: 'won',
    source: 'Industry event — ACETECH',
    totalDeals: 28,
    wonDeals: 26,
    totalRevenue: 24800000,
    lastActivityAt: new Date(Date.now() - 1000*60*60*12),
    lastActivityType: 'meeting',
    createdAt: new Date(Date.now() - 1000*60*60*24*500),
    notes: 'STRATEGIC ACCOUNT. Annual procurement contract. Prefers Kohler/Grohe for standard units, Axor for premium towers. Do not discount without approval.',
    avatar: null,
    color: '#6D28D9',
  },
  {
    id: 'ct07',
    name: 'Dr. Meera Iyer',
    title: 'Owner',
    type: 'retail',
    company: null,
    companyId: null,
    email: 'meera.iyer.dr@gmail.com',
    phone: '+91 97690 23456',
    whatsapp: '+91 97690 23456',
    city: 'Mumbai', area: 'Powai',
    tags: ['single-project', 'budget-flexible', 'first-time-buyer'],
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    stage: 'site_visit',
    source: 'Google Maps review',
    totalDeals: 1,
    wonDeals: 0,
    totalRevenue: 0,
    lastActivityAt: new Date(Date.now() - 1000*60*60*36),
    lastActivityType: 'showroom_visit',
    createdAt: new Date(Date.now() - 1000*60*60*24*7),
    notes: '3BHK renovation at Powai. Budget ~₹6L for bathroom. Visited showroom, loved Grohe Essence. Follow up this week.',
    avatar: null,
    color: '#0891B2',
  },
  {
    id: 'ct08',
    name: 'Farhan Sheikh',
    title: 'Procurement Manager',
    type: 'institutional',
    company: 'JW Marriott Mumbai',
    companyId: 'co07',
    email: 'farhan.sheikh@marriott.com',
    phone: '+91 22 6666 0001',
    whatsapp: null,
    city: 'Mumbai', area: 'Juhu',
    tags: ['hospitality', 'premium-only', 'formal-procurement', 'high-volume'],
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    stage: 'enquiry',
    source: 'Referral — Ar. Vikram Mehta',
    totalDeals: 1,
    wonDeals: 0,
    totalRevenue: 0,
    lastActivityAt: new Date(Date.now() - 1000*60*60*48),
    lastActivityType: 'email',
    createdAt: new Date(Date.now() - 1000*60*60*24*10),
    notes: 'Renovation of 40 guest bathrooms. Asking for Grohe Eurostyle + Vitra S50. Formal quotation with technical specs required. High potential — ₹40L+.',
    avatar: null,
    color: '#B45309',
  },
]

export const companies: Company[] = [
  {
    id: 'co01', name: 'Mehta Architects Studio',
    type: 'Architecture Firm',
    website: 'mehtaarchitects.in',
    industry: 'Architecture & Design',
    size: '10–50 employees',
    city: 'Mumbai', area: 'Bandra West',
    gstin: '27AABFM1234A1Z2',
    address: '4th Floor, Pali Hill Road, Bandra West, Mumbai 400050',
    totalContacts: 2,
    totalDeals: 8,
    totalRevenue: 5840000,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    color: '#0071E3',
    tags: ['tier-1-architect', 'premium-projects'],
    createdAt: new Date(Date.now() - 1000*60*60*24*120),
  },
  {
    id: 'co02', name: 'Priya Nair Interiors',
    type: 'Interior Design Studio',
    website: 'pninteriors.com',
    industry: 'Interior Design',
    size: '1–10 employees',
    city: 'Mumbai', area: 'Juhu',
    gstin: '27AABFP5678B1Z4',
    address: 'B-12, Juhu Scheme, Mumbai 400049',
    totalContacts: 1,
    totalDeals: 9,
    totalRevenue: 3140000,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    color: '#7C3AED',
    tags: ['luxury-residential', 'repeat-client'],
    createdAt: new Date(Date.now() - 1000*60*60*24*200),
  },
  {
    id: 'co03', name: 'Rajesh Constructions Pvt Ltd',
    type: 'Real Estate Developer',
    website: 'rajeshcon.com',
    industry: 'Construction & Real Estate',
    size: '50–200 employees',
    city: 'Mumbai', area: 'Andheri East',
    gstin: '27AACCR1234F1Z5',
    address: '14, Maker Chambers IV, Nariman Point, Mumbai 400021',
    totalContacts: 3,
    totalDeals: 14,
    totalRevenue: 8240000,
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    color: '#059669',
    tags: ['bulk-buyer', 'credit-account'],
    createdAt: new Date(Date.now() - 1000*60*60*24*365),
  },
  {
    id: 'co04', name: 'Studio Anita Lobo',
    type: 'Interior Design Studio',
    website: 'studioanitalobo.com',
    industry: 'Interior Design',
    size: '1–10 employees',
    city: 'Mumbai', area: 'Lower Parel',
    gstin: '27AABFS9012C1Z6',
    address: 'Unit 204, One Indiabulls, Lower Parel, Mumbai 400013',
    totalContacts: 1,
    totalDeals: 3,
    totalRevenue: 1820000,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    color: '#D97706',
    tags: ['boutique', 'slow-convert'],
    createdAt: new Date(Date.now() - 1000*60*60*24*60),
  },
  {
    id: 'co05', name: 'KD Building Works',
    type: 'Contractor',
    website: null,
    industry: 'Construction',
    size: '1–10 employees',
    city: 'Thane', area: 'Kalyan',
    gstin: '27AABFK3456D1Z8',
    address: 'Plot 8, Shivaji Nagar, Kalyan West, Thane 421301',
    totalContacts: 1,
    totalDeals: 8,
    totalRevenue: 680000,
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    color: '#BE123C',
    tags: ['contractor', 'fast-mover'],
    createdAt: new Date(Date.now() - 1000*60*60*24*90),
  },
  {
    id: 'co06', name: 'Lodha Developers Ltd',
    type: 'Real Estate Developer',
    website: 'lodhagroup.com',
    industry: 'Real Estate',
    size: '1000+ employees',
    city: 'Mumbai', area: 'Lower Parel',
    gstin: '27AACCL5678G1ZK',
    address: '412, Lodha Supremus, Lower Parel, Mumbai 400013',
    totalContacts: 4,
    totalDeals: 28,
    totalRevenue: 24800000,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    color: '#6D28D9',
    tags: ['strategic-account', 'premium', 'annual-contract'],
    createdAt: new Date(Date.now() - 1000*60*60*24*500),
  },
  {
    id: 'co07', name: 'JW Marriott Mumbai',
    type: 'Hospitality',
    website: 'marriott.com',
    industry: 'Hospitality',
    size: '200–500 employees',
    city: 'Mumbai', area: 'Juhu',
    gstin: '27AACJW7890H1ZM',
    address: 'Juhu Tara Road, Juhu, Mumbai 400049',
    totalContacts: 1,
    totalDeals: 1,
    totalRevenue: 0,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    color: '#B45309',
    tags: ['hospitality', 'high-potential'],
    createdAt: new Date(Date.now() - 1000*60*60*24*10),
  },
]

export const deals: Deal[] = [
  {
    id: 'd01', title: 'Mehta Architects — Sea View Bungalow Bathrooms',
    contactId: 'ct01', contactName: 'Ar. Vikram Mehta',
    companyId: 'co01', companyName: 'Mehta Architects Studio',
    stage: 'negotiation',
    value: 2840000,
    probability: 75,
    closeDate: new Date(Date.now() + 1000*60*60*24*18),
    brands: ['Axor', 'Grohe', 'Vitra'],
    projectType: 'Luxury Residential',
    units: 6,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    createdAt: new Date(Date.now() - 1000*60*60*24*30),
    notes: 'Penthouse + 5 guest rooms. Client wants Axor Starck for master, Grohe Essence elsewhere.',
  },
  {
    id: 'd02', title: 'Lodha Palava Phase 7 — Standard Package',
    contactId: 'ct06', contactName: 'Sameer Kapoor',
    companyId: 'co06', companyName: 'Lodha Developers Ltd',
    stage: 'quote_shared',
    value: 6400000,
    probability: 85,
    closeDate: new Date(Date.now() + 1000*60*60*24*7),
    brands: ['Hindware', 'Jaguar', 'Kajaria'],
    projectType: 'Residential Development',
    units: 80,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    createdAt: new Date(Date.now() - 1000*60*60*24*8),
    notes: '80-unit standard package. Quote submitted. Awaiting sign-off from procurement committee.',
  },
  {
    id: 'd03', title: 'Priya Nair — Worli Penthouse Renovation',
    contactId: 'ct02', contactName: 'Priya Nair',
    companyId: 'co02', companyName: 'Priya Nair Interiors',
    stage: 'sample_sent',
    value: 1840000,
    probability: 60,
    closeDate: new Date(Date.now() + 1000*60*60*24*25),
    brands: ['Axor', 'Hansgrohe', 'Oyster', 'Dimore'],
    projectType: 'Luxury Residential',
    units: 4,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    createdAt: new Date(Date.now() - 1000*60*60*24*14),
    notes: 'Samples of Axor Edge and Hansgrohe Metropol sent. Site visit done. Waiting on client approval.',
  },
  {
    id: 'd04', title: 'JW Marriott — 40 Bathroom Renovation',
    contactId: 'ct08', contactName: 'Farhan Sheikh',
    companyId: 'co07', companyName: 'JW Marriott Mumbai',
    stage: 'enquiry',
    value: 4200000,
    probability: 30,
    closeDate: new Date(Date.now() + 1000*60*60*24*45),
    brands: ['Grohe', 'Vitra'],
    projectType: 'Hospitality',
    units: 40,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    createdAt: new Date(Date.now() - 1000*60*60*24*10),
    notes: 'Initial enquiry. Formal tender process. Need to submit technical specs + certifications.',
  },
  {
    id: 'd05', title: 'Dr. Meera Iyer — Powai 3BHK Renovation',
    contactId: 'ct07', contactName: 'Dr. Meera Iyer',
    companyId: null, companyName: null,
    stage: 'site_visit',
    value: 620000,
    probability: 50,
    closeDate: new Date(Date.now() + 1000*60*60*24*30),
    brands: ['Grohe', 'Qutone'],
    projectType: 'Retail Residential',
    units: 3,
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    createdAt: new Date(Date.now() - 1000*60*60*24*7),
    notes: 'Showroom visit done. Liked Grohe Essence tap and Qutone tiles. Site visit scheduled.',
  },
  {
    id: 'd06', title: 'KD Building Works — Thane Housing Society',
    contactId: 'ct05', contactName: 'Kiran Desai',
    companyId: 'co05', companyName: 'KD Building Works',
    stage: 'won',
    value: 340000,
    probability: 100,
    closeDate: new Date(Date.now() - 1000*60*60*24*5),
    brands: ['Jaguar', 'Hindware', 'Kajaria'],
    projectType: 'Residential',
    units: 12,
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    createdAt: new Date(Date.now() - 1000*60*60*24*20),
    notes: 'Closed. PO received. Delivery scheduled for next week.',
  },
  {
    id: 'd07', title: 'Studio Anita Lobo — Bandra Villa',
    contactId: 'ct04', contactName: 'Anita Lobo',
    companyId: 'co04', companyName: 'Studio Anita Lobo',
    stage: 'lost',
    value: 980000,
    probability: 0,
    closeDate: new Date(Date.now() - 1000*60*60*24*3),
    brands: ['Vitra', 'Hansgrohe'],
    projectType: 'Luxury Residential',
    units: 5,
    owner: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    createdAt: new Date(Date.now() - 1000*60*60*24*45),
    notes: 'Lost to competitor (Jaquar dealer). Client went with lower price. Follow up in 6 months for next project.',
  },
  {
    id: 'd08', title: 'Rajesh Constructions — Goregaon Township CP Fittings',
    contactId: 'ct03', contactName: 'Rajesh Shetty',
    companyId: 'co03', companyName: 'Rajesh Constructions Pvt Ltd',
    stage: 'won',
    value: 1280000,
    probability: 100,
    closeDate: new Date(Date.now() - 1000*60*60*24*1),
    brands: ['Jaguar', 'Nexion'],
    projectType: 'Residential Development',
    units: 120,
    owner: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    createdAt: new Date(Date.now() - 1000*60*60*24*15),
    notes: 'PO received. Phased delivery — 40 units/week for 3 weeks.',
  },
]

export const activities: Activity[] = [
  {
    id: 'ac01', type: 'whatsapp',
    contactId: 'ct01', contactName: 'Ar. Vikram Mehta',
    dealId: 'd01',
    subject: 'Axor Edge samples follow-up',
    body: 'Sent product spec sheet for Axor Edge 90 basin mixer and Axor One overhead shower. Client confirmed receipt and will share with client this weekend.',
    outcome: 'Positive — awaiting client feedback',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*3),
    duration: null,
  },
  {
    id: 'ac02', type: 'site_visit',
    contactId: 'ct02', contactName: 'Priya Nair',
    dealId: 'd03',
    subject: 'Site visit — Worli Penthouse',
    body: 'Visited the site. 4 bathrooms confirmed. Master bath will be Axor Edge collection. Guest baths Hansgrohe Metropol. Priya confirmed budget is flexible for right product.',
    outcome: 'Strong interest — samples requested',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*8),
    duration: 90,
  },
  {
    id: 'ac03', type: 'call',
    contactId: 'ct06', contactName: 'Sameer Kapoor',
    dealId: 'd02',
    subject: 'Lodha Palava Q follow-up call',
    body: 'Spoke with Sameer. Quote Q-2025-0048 shared. Procurement committee meeting on Friday. Expects sign-off by end of week.',
    outcome: 'Positive — decision expected in 3 days',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*12),
    duration: 22,
  },
  {
    id: 'ac04', type: 'showroom_visit',
    contactId: 'ct07', contactName: 'Dr. Meera Iyer',
    dealId: 'd05',
    subject: 'Showroom walkthrough — 3BHK renovation',
    body: 'Dr. Meera visited with husband. Spent 2 hours in showroom. Loved Grohe Essence faucet range and Qutone Calacatta tiles. Wants to see these in context on site.',
    outcome: 'Very interested — site visit scheduled',
    createdBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*36),
    duration: 120,
  },
  {
    id: 'ac05', type: 'email',
    contactId: 'ct08', contactName: 'Farhan Sheikh',
    dealId: 'd04',
    subject: 'Technical specs — Grohe Eurostyle & Vitra S50',
    body: 'Sent technical datasheets for Grohe Eurostyle basin mixer and Vitra S50 wall-hung WC. Included WRAS certification and GST invoice format.',
    outcome: 'Sent — awaiting response',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*48),
    duration: null,
  },
  {
    id: 'ac06', type: 'meeting',
    contactId: 'ct06', contactName: 'Sameer Kapoor',
    dealId: 'd02',
    subject: 'Annual contract review — Lodha Developers',
    body: 'Quarterly review at Lodha HQ. Discussed Phase 7 requirements. Sameer confirmed 80 units minimum. Annual contract renewal due in Q4.',
    outcome: 'Strong relationship maintained',
    createdBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*24*2),
    duration: 60,
  },
]

export const DEAL_STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'enquiry',      label: 'Enquiry',      color: '#8E8E93' },
  { id: 'site_visit',   label: 'Site Visit',   color: '#0071E3' },
  { id: 'sample_sent',  label: 'Sample Sent',  color: '#9A6700' },
  { id: 'quote_shared', label: 'Quote Shared', color: '#6E40C9' },
  { id: 'negotiation',  label: 'Negotiation',  color: '#0891B2' },
  { id: 'won',          label: 'Won',          color: '#1A7F37' },
  { id: 'lost',         label: 'Lost',         color: '#CF222E' },
]

export const CONTACT_TYPE_CONFIG: Record<ContactType, { label: string; color: string; bg: string }> = {
  architect:         { label: 'Architect',         color: '#0071E3', bg: 'rgba(0,113,227,0.08)' },
  interior_designer: { label: 'Interior Designer', color: '#6E40C9', bg: 'rgba(110,64,201,0.08)' },
  builder:           { label: 'Builder',           color: '#1A7F37', bg: 'rgba(26,127,55,0.08)' },
  contractor:        { label: 'Contractor',         color: '#9A6700', bg: 'rgba(154,103,0,0.08)' },
  retail:            { label: 'Retail',             color: '#0891B2', bg: 'rgba(8,145,178,0.08)' },
  institutional:     { label: 'Institutional',      color: '#B45309', bg: 'rgba(180,83,9,0.08)' },
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call:           'Phone',
  whatsapp:       'MessageCircle',
  email:          'Mail',
  site_visit:     'MapPin',
  showroom_visit: 'Store',
  meeting:        'Users',
  note:           'FileText',
  quote_sent:     'FileText',
  sample_sent:    'Package',
}

// ─── Compatibility exports for existing components ────────────────────────────

/** Legacy contact status type — kept for status-badge component */
export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned'

export const STATUS_CONFIG: Record<ContactStatus, { label: string; bg: string; text: string }> = {
  lead:     { label: 'Lead',     bg: 'rgba(0,113,227,0.08)',   text: '#0071E3' },
  prospect: { label: 'Prospect', bg: 'rgba(110,64,201,0.08)',  text: '#6E40C9' },
  customer: { label: 'Customer', bg: 'rgba(26,127,55,0.08)',   text: '#1A7F37' },
  churned:  { label: 'Churned',  bg: 'rgba(207,34,46,0.08)',   text: '#CF222E' },
}

export const STAGE_CONFIG: Record<DealStage, { label: string; bg: string; text: string }> = {
  enquiry:      { label: 'Enquiry',      bg: 'rgba(142,142,147,0.10)', text: '#636366' },
  site_visit:   { label: 'Site Visit',   bg: 'rgba(0,113,227,0.08)',   text: '#0071E3' },
  sample_sent:  { label: 'Sample Sent',  bg: 'rgba(154,103,0,0.08)',   text: '#9A6700' },
  quote_shared: { label: 'Quote Shared', bg: 'rgba(110,64,201,0.08)',  text: '#6E40C9' },
  negotiation:  { label: 'Negotiation',  bg: 'rgba(8,145,178,0.08)',   text: '#0891B2' },
  won:          { label: 'Won',          bg: 'rgba(26,127,55,0.08)',   text: '#1A7F37' },
  lost:         { label: 'Lost',         bg: 'rgba(207,34,46,0.08)',   text: '#CF222E' },
}

/** Alias used by pipeline board — same data as DEAL_STAGES */
export const PIPELINE_STAGES = DEAL_STAGES

/** Legacy activity shape expected by activities-client.tsx */
export interface LegacyActivity {
  id: string
  type: ActivityType
  contact: string
  company: string | null
  description: string
  outcome: string
  owner: string
  timestamp: Date
  duration: number | null
}

export const crmActivities: LegacyActivity[] = activities.map((a) => {
  const contact = contacts.find((c) => c.id === a.contactId)
  return {
    id: a.id,
    type: a.type,
    contact: a.contactName,
    company: contact?.company ?? null,
    description: a.body,
    outcome: a.outcome,
    owner: a.createdBy,
    timestamp: a.createdAt,
    duration: a.duration,
  }
})

export const BRAND_COLORS: Record<string, string> = {
  Grohe:       '#009FE3',
  Hansgrohe:   '#00529A',
  Axor:        '#1C1C1E',
  Vitra:       '#E5002B',
  Kohler:      '#231F20',
  Jaguar:      '#C41E3A',
  Hindware:    '#E85D04',
  Kajaria:     '#D62839',
  Somany:      '#1B4332',
  Qutone:      '#6B4226',
  Dimore:      '#2D3A3A',
  Nexion:      '#5C3317',
  Oyster:      '#4A4E69',
}
