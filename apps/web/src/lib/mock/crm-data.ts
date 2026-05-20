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
