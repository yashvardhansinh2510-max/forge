// lib/mock/payments-data.ts
// Customer-level payment data for the /payments module.

import { formatINR } from '@/lib/mock/dashboard-data'
export { formatINR }

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMode = 'CASH' | 'UPI' | 'NEFT' | 'CHEQUE'

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH:   'Cash',
  UPI:    'UPI',
  NEFT:   'NEFT / RTGS',
  CHEQUE: 'Cheque',
}

export interface BrandAccount {
  brand:    string
  ordered:  number
  billed:   number
  received: number
}

export interface CustomerAccount {
  customerId:     string
  customerName:   string
  projectName:    string
  projectAddress: string
  phone:          string
  email:          string
  brandAccounts:  BrandAccount[]
}

export interface CustomerPaymentRecord {
  id:           string
  customerId:   string
  customerName: string
  brand:        string
  amount:       number
  mode:         PaymentMode
  reference:    string | null
  paidAt:       string
  note:         string | null
  recordedBy:   string
}

// ─── Brand config (5 brands — no KAJARIA) ────────────────────────────────────

export const BRAND_COLORS: Record<string, string> = {
  GROHE:     '#00A3E0',
  HANSGROHE: '#E30613',
  AXOR:      '#374151',
  VITRA:     '#005BAC',
  GEBERIT:   '#003087',
}

export const BRANDS_LIST = ['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'GEBERIT'] as const
export type Brand = typeof BRANDS_LIST[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAccountTotals(brandAccounts: BrandAccount[]): {
  ordered: number; billed: number; received: number; pending: number
} {
  return brandAccounts.reduce(
    (acc, b) => ({
      ordered:  acc.ordered  + b.ordered,
      billed:   acc.billed   + b.billed,
      received: acc.received + b.received,
      pending:  acc.pending  + Math.max(0, b.billed - b.received),
    }),
    { ordered: 0, billed: 0, received: 0, pending: 0 },
  )
}

export function buildWhatsAppLink(account: CustomerAccount, pendingAmount: number): string {
  const brandLines = account.brandAccounts
    .filter(b => b.billed - b.received > 0)
    .map(b => `• ${b.brand}: ${formatINR(Math.max(0, b.billed - b.received))}`)
    .join('\n')

  const msg = [
    `Dear ${account.customerName},`,
    '',
    `This is a gentle reminder regarding your outstanding payment of ${formatINR(pendingAmount)} for ${account.projectName}.`,
    '',
    'Outstanding by brand:',
    brandLines,
    '',
    'Please arrange payment at your earliest convenience.',
    '',
    'Regards,\nBuildcon House\n+91 22 2645 8900',
  ].join('\n')

  return `https://wa.me/91${account.phone}?text=${encodeURIComponent(msg)}`
}

export function buildEmailLink(account: CustomerAccount, pendingAmount: number): string {
  const subject = `Payment Reminder — ${account.projectName}`
  const brandLines = account.brandAccounts
    .filter(b => b.billed - b.received > 0)
    .map(b => `  • ${b.brand}: ${formatINR(Math.max(0, b.billed - b.received))}`)
    .join('\n')

  const body = [
    `Dear ${account.customerName},`,
    '',
    `This is a gentle reminder regarding your outstanding payment of ${formatINR(pendingAmount)} for ${account.projectName}.`,
    '',
    'Outstanding by brand:',
    brandLines,
    '',
    'Kindly arrange payment at your earliest convenience.',
    '',
    'Regards,\nBuildcon House Team\n+91 22 2645 8900',
  ].join('\n')

  return `mailto:${account.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function filterPaymentsByPeriod(
  records: CustomerPaymentRecord[],
  year:    number,
  month:   number | null,
): CustomerPaymentRecord[] {
  return records.filter((r) => {
    const d = new Date(r.paidAt)
    if (d.getFullYear() !== year) return false
    if (month !== null && d.getMonth() + 1 !== month) return false
    return true
  })
}

export function getMonthlyByBrand(
  records:   CustomerPaymentRecord[],
  year:      number,
  brandName: string,
): Array<{ month: string; received: number }> {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const totals = new Array<number>(12).fill(0)
  for (const r of records) {
    if (r.brand !== brandName) continue
    const d = new Date(r.paidAt)
    if (d.getFullYear() !== year) continue
    totals[d.getMonth()] = (totals[d.getMonth()] ?? 0) + r.amount
  }
  return MONTHS.map((month, i) => ({ month, received: totals[i] ?? 0 }))
}

export function getGlobalStats(
  accounts: CustomerAccount[],
  records:  CustomerPaymentRecord[],
  year:     number,
  month:    number | null,
): { totalBilled: number; periodReceived: number; totalPending: number; collectionPct: number } {
  const periodRecords  = filterPaymentsByPeriod(records, year, month)
  const totalBilled    = accounts.flatMap(a => a.brandAccounts).reduce((s, b) => s + b.billed, 0)
  const totalReceived  = accounts.flatMap(a => a.brandAccounts).reduce((s, b) => s + b.received, 0)
  const periodReceived = periodRecords.reduce((s, r) => s + r.amount, 0)
  return {
    totalBilled,
    periodReceived,
    totalPending:   Math.max(0, totalBilled - totalReceived),
    collectionPct:  totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0,
  }
}

// ─── Customer Accounts ────────────────────────────────────────────────────────

export const CUSTOMER_ACCOUNTS: CustomerAccount[] = [
  {
    customerId: 'proj-005', customerName: 'Lodha Group',
    projectName: 'Lodha Altamount — Tardeo',
    projectAddress: 'Tower A, Lodha Altamount, Tardeo, Mumbai 400034',
    phone: '9820123456', email: 'procurement@lodha.com',
    brandAccounts: [
      { brand: 'GROHE',   ordered: 1250000, billed: 1125000, received:  562500 },
      { brand: 'AXOR',    ordered:  640000, billed:  576000, received:  345600 },
      { brand: 'GEBERIT', ordered:  380000, billed:  342000, received:       0 },
    ],
  },
  {
    customerId: 'proj-006', customerName: 'Prestige Realty',
    projectName: 'Prestige Signature — BKC',
    projectAddress: 'Plot C-12, BKC, Bandra East, Mumbai 400051',
    phone: '9820234567', email: 'site@prestige.co.in',
    brandAccounts: [
      { brand: 'VITRA',     ordered: 780000, billed: 702000, received: 421200 },
      { brand: 'HANSGROHE', ordered: 420000, billed: 378000, received: 189000 },
    ],
  },
  {
    customerId: 'proj-003', customerName: 'Vikram Oberoi',
    projectName: 'Oberoi Heights — Goregaon',
    projectAddress: 'Flat 14B, Oberoi Heights, Goregaon West, Mumbai 400104',
    phone: '9820345678', email: 'vikram.oberoi@gmail.com',
    brandAccounts: [
      { brand: 'GROHE',   ordered: 520000, billed: 468000, received: 280800 },
      { brand: 'GEBERIT', ordered: 210000, billed:      0, received:      0 },
    ],
  },
  {
    customerId: 'proj-002', customerName: 'Suresh Mehta',
    projectName: 'Mehta Penthouse — Worli',
    projectAddress: 'Level 42, Sea Crest Tower, Worli, Mumbai 400030',
    phone: '9820456789', email: 'suresh.mehta@mehtaarch.com',
    brandAccounts: [
      { brand: 'HANSGROHE', ordered: 312000, billed: 280800, received: 168480 },
      { brand: 'VITRA',     ordered: 145000, billed:      0, received:      0 },
    ],
  },
  {
    customerId: 'proj-001', customerName: 'Rajesh Smith',
    projectName: 'Smith Residence — Bandra',
    projectAddress: 'Flat 8A, Pali Hill Enclave, Bandra West, Mumbai 400050',
    phone: '9820567890', email: 'rajesh.smith@gmail.com',
    brandAccounts: [
      { brand: 'GROHE', ordered: 245000, billed: 220500, received: 220500 },
      { brand: 'AXOR',  ordered: 185000, billed: 166500, received:  83250 },
    ],
  },
  {
    customerId: 'proj-004', customerName: 'Priya Shah',
    projectName: 'Shah Residence — Juhu',
    projectAddress: 'Plot 22, JVPD Scheme, Juhu, Mumbai 400049',
    phone: '9820678901', email: 'priya.shah@outlook.com',
    brandAccounts: [
      { brand: 'HANSGROHE', ordered: 98000, billed: 88200, received: 88200 },
    ],
  },
]

// ─── Payment Records (sorted newest first) ────────────────────────────────────

export const PAYMENT_RECORDS: CustomerPaymentRecord[] = [
  {
    id: 'pay-006', customerId: 'proj-006', customerName: 'Prestige Realty',
    brand: 'HANSGROHE', amount: 189000, mode: 'UPI',
    reference: 'UPI/PRE/2026021801', paidAt: '2026-02-18',
    note: '50% advance for Hansgrohe mixers', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-008', customerId: 'proj-003', customerName: 'Vikram Oberoi',
    brand: 'GROHE', amount: 93600, mode: 'CHEQUE',
    reference: 'CH-OB-0019', paidAt: '2026-01-22',
    note: 'Second instalment', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-005', customerId: 'proj-006', customerName: 'Prestige Realty',
    brand: 'VITRA', amount: 210600, mode: 'NEFT',
    reference: 'ICICI/2026/0108', paidAt: '2026-01-08',
    note: 'Balance payment for Vitra order', recordedBy: 'Kiran Shah',
  },
  {
    id: 'pay-003', customerId: 'proj-005', customerName: 'Lodha Group',
    brand: 'AXOR', amount: 345600, mode: 'NEFT',
    reference: 'AXIS/2025/1215', paidAt: '2025-12-15',
    note: '60% advance for Axor series', recordedBy: 'Kiran Shah',
  },
  {
    id: 'pay-002', customerId: 'proj-005', customerName: 'Lodha Group',
    brand: 'GROHE', amount: 225000, mode: 'NEFT',
    reference: 'HDFC/2025/1102', paidAt: '2025-11-02',
    note: 'Second instalment before dispatch', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-007', customerId: 'proj-003', customerName: 'Vikram Oberoi',
    brand: 'GROHE', amount: 187200, mode: 'NEFT',
    reference: 'SBI/2025/1020', paidAt: '2025-10-20',
    note: 'Advance — 40% of billed amount', recordedBy: 'Kiran Shah',
  },
  {
    id: 'pay-011', customerId: 'proj-001', customerName: 'Rajesh Smith',
    brand: 'AXOR', amount: 83250, mode: 'CASH',
    reference: null, paidAt: '2025-10-12',
    note: 'Cash advance at showroom', recordedBy: 'Kiran Shah',
  },
  {
    id: 'pay-004', customerId: 'proj-006', customerName: 'Prestige Realty',
    brand: 'VITRA', amount: 210600, mode: 'CHEQUE',
    reference: 'CH-PRE-0042', paidAt: '2025-09-18',
    note: 'Advance cheque for Vitra wall-hung WC', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-012', customerId: 'proj-004', customerName: 'Priya Shah',
    brand: 'HANSGROHE', amount: 88200, mode: 'UPI',
    reference: 'UPI/PS/2025091501', paidAt: '2025-09-15',
    note: 'Full payment — Hansgrohe kitchen mixer', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-001', customerId: 'proj-005', customerName: 'Lodha Group',
    brand: 'GROHE', amount: 337500, mode: 'NEFT',
    reference: 'HDFC/2025/0814', paidAt: '2025-08-14',
    note: '50% advance against order', recordedBy: 'Priya Nair',
  },
  {
    id: 'pay-009', customerId: 'proj-002', customerName: 'Suresh Mehta',
    brand: 'HANSGROHE', amount: 168480, mode: 'NEFT',
    reference: 'HDFC/2025/0725', paidAt: '2025-07-25',
    note: '60% advance for Hansgrohe bathroom suite', recordedBy: 'Kiran Shah',
  },
  {
    id: 'pay-010', customerId: 'proj-001', customerName: 'Rajesh Smith',
    brand: 'GROHE', amount: 220500, mode: 'UPI',
    reference: 'UPI/RS/2025060301', paidAt: '2025-06-03',
    note: 'Full payment received', recordedBy: 'Priya Nair',
  },
]
