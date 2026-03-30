// ─── Types ────────────────────────────────────────────────────────────────────

export type KPIColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'orange'
export type ActivityType =
  | 'deal_won'
  | 'deal_created'
  | 'invoice_sent'
  | 'payment_received'
  | 'order_confirmed'
  | 'contact_added'
  | 'low_stock'
  | 'production_complete'
export type TrendDirection = 'up' | 'down' | 'neutral'

export interface KPIItem {
  id: string
  label: string
  value: number
  previousValue: number
  format: 'currency' | 'number'
  subLabel?: string
  icon: string
  color: KPIColor
  href: string
  isAlert?: boolean
}

export interface RevenuePoint {
  month: string
  revenue: number
  target: number
}

export interface PipelineStage {
  stage: string
  count: number
  value: number
  color: string
}

export interface ActivityUser {
  name: string
  initials: string
  color: string
}

export interface ActivityItem {
  id: string
  type: ActivityType
  user: ActivityUser
  action: string
  target: string
  value: string | null
  timestamp: Date
}

export interface Customer {
  rank: number
  name: string
  initials: string
  color: string
  revenue: number
  orders: number
  outstanding: number
  trend: TrendDirection
}

export interface QuickAction {
  label: string
  icon: string
  href?: string
  action?: string
  color: string
}

// ─── KPI Data ─────────────────────────────────────────────────────────────────

export const kpiData: KPIItem[] = [
  {
    id: 'revenue',
    label: 'Revenue MTD',
    value: 2847500,
    previousValue: 2340000,
    format: 'currency',
    icon: 'IndianRupee',
    color: 'blue',
    href: '/invoicing/payments',
  },
  {
    id: 'open_deals',
    label: 'Open Deals',
    value: 34,
    previousValue: 28,
    format: 'number',
    subLabel: '₹1.2Cr pipeline',
    icon: 'TrendingUp',
    color: 'violet',
    href: '/crm/pipeline',
  },
  {
    id: 'contacts',
    label: 'Active Contacts',
    value: 1284,
    previousValue: 1201,
    format: 'number',
    subLabel: '+83 this month',
    icon: 'Users',
    color: 'emerald',
    href: '/crm/contacts',
  },
  {
    id: 'low_stock',
    label: 'Low Stock Alerts',
    value: 7,
    previousValue: 3,
    format: 'number',
    subLabel: '2 critical',
    icon: 'PackageX',
    color: 'amber',
    href: '/inventory/products',
    isAlert: true,
  },
  {
    id: 'invoices',
    label: 'Pending Invoices',
    value: 18,
    previousValue: 22,
    format: 'number',
    subLabel: '₹4,82,000 outstanding',
    icon: 'Receipt',
    color: 'orange',
    href: '/invoicing/invoices',
  },
  {
    id: 'production',
    label: 'Production Orders',
    value: 12,
    previousValue: 9,
    format: 'number',
    subLabel: '8 on track, 4 delayed',
    icon: 'Factory',
    color: 'blue',
    href: '/manufacturing/orders',
  },
]

// ─── Revenue Chart Data ────────────────────────────────────────────────────────

export const revenueData: RevenuePoint[] = [
  { month: 'Apr', revenue: 1840000, target: 2000000 },
  { month: 'May', revenue: 2100000, target: 2100000 },
  { month: 'Jun', revenue: 1950000, target: 2200000 },
  { month: 'Jul', revenue: 2280000, target: 2200000 },
  { month: 'Aug', revenue: 2050000, target: 2300000 },
  { month: 'Sep', revenue: 2420000, target: 2300000 },
  { month: 'Oct', revenue: 2680000, target: 2400000 },
  { month: 'Nov', revenue: 2340000, target: 2500000 },
  { month: 'Dec', revenue: 2890000, target: 2500000 },
  { month: 'Jan', revenue: 2560000, target: 2600000 },
  { month: 'Feb', revenue: 2720000, target: 2700000 },
  { month: 'Mar', revenue: 2847500, target: 2800000 },
]

// ─── Pipeline Data ─────────────────────────────────────────────────────────────

export const pipelineData: PipelineStage[] = [
  { stage: 'Lead', count: 48, value: 9200000, color: '#93C5FD' },
  { stage: 'Qualified', count: 31, value: 7400000, color: '#60A5FA' },
  { stage: 'Proposal', count: 19, value: 5800000, color: '#3B82F6' },
  { stage: 'Negotiation', count: 11, value: 3900000, color: '#2563EB' },
  { stage: 'Won', count: 8, value: 2100000, color: '#1D4ED8' },
]

// ─── Activity Data ─────────────────────────────────────────────────────────────

export const activityData: ActivityItem[] = [
  {
    id: '1',
    type: 'deal_won',
    user: { name: 'Rohan Mehta', initials: 'RM', color: '#2563EB' },
    action: 'closed a deal with',
    target: 'Lodha Developers',
    value: '₹8,50,000',
    timestamp: new Date(Date.now() - 1000 * 60 * 42),
  },
  {
    id: '2',
    type: 'invoice_sent',
    user: { name: 'Priya Sharma', initials: 'PS', color: '#7C3AED' },
    action: 'sent invoice',
    target: '#INV-0089 to Oberoi Realty',
    value: '₹2,24,000',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    id: '3',
    type: 'contact_added',
    user: { name: 'Arjun Nair', initials: 'AN', color: '#059669' },
    action: 'added contact',
    target: 'Ms. Neha Desai · Jade Architects',
    value: null,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: '4',
    type: 'order_confirmed',
    user: { name: 'Kavya Reddy', initials: 'KR', color: '#D97706' },
    action: 'confirmed order',
    target: '#SO-0234 — 45 units GROHE Grohtherm',
    value: '₹1,80,000',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: '5',
    type: 'production_complete',
    user: { name: 'System', initials: 'SY', color: '#6B7280' },
    action: 'warehouse dispatch completed',
    target: '#WH-0017 — Axor Citterio M Collection',
    value: '12 sets',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7),
  },
  {
    id: '6',
    type: 'low_stock',
    user: { name: 'System', initials: 'SY', color: '#6B7280' },
    action: 'low stock alert triggered for',
    target: 'Axor Starck X Shower Head (Brushed Nickel)',
    value: '6 units left',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9),
  },
  {
    id: '7',
    type: 'deal_created',
    user: { name: 'Rohan Mehta', initials: 'RM', color: '#2563EB' },
    action: 'created a deal with',
    target: 'K Raheja Corp',
    value: '₹3,40,000',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '8',
    type: 'payment_received',
    user: { name: 'Priya Sharma', initials: 'PS', color: '#7C3AED' },
    action: 'recorded payment from',
    target: 'Vatika Group',
    value: '₹1,24,000',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28),
  },
]

// ─── Top Customers ─────────────────────────────────────────────────────────────

export const topCustomers: Customer[] = [
  {
    rank: 1,
    name: 'Lodha Developers',
    initials: 'LD',
    color: '#2563EB',
    revenue: 8500000,
    orders: 14,
    outstanding: 0,
    trend: 'up',
  },
  {
    rank: 2,
    name: 'Oberoi Realty',
    initials: 'OR',
    color: '#7C3AED',
    revenue: 6200000,
    orders: 9,
    outstanding: 340000,
    trend: 'up',
  },
  {
    rank: 3,
    name: 'Jade Architects',
    initials: 'JA',
    color: '#059669',
    revenue: 4800000,
    orders: 22,
    outstanding: 224000,
    trend: 'neutral',
  },
  {
    rank: 4,
    name: 'K Raheja Corp',
    initials: 'KR',
    color: '#D97706',
    revenue: 3600000,
    orders: 11,
    outstanding: 124000,
    trend: 'down',
  },
  {
    rank: 5,
    name: 'Vatika Group',
    initials: 'VG',
    color: '#059669',
    revenue: 2900000,
    orders: 7,
    outstanding: 0,
    trend: 'up',
  },
]

// ─── Quick Actions ─────────────────────────────────────────────────────────────

export const quickActions: QuickAction[] = [
  { label: 'New Contact', icon: 'UserPlus', href: '/crm/contacts', color: '#2563EB' },
  { label: 'New Deal', icon: 'TrendingUp', href: '/crm/pipeline', color: '#7C3AED' },
  { label: 'New Invoice', icon: 'Receipt', href: '/invoicing/invoices', color: '#059669' },
  { label: 'New Order', icon: 'ShoppingCart', href: '/sales/orders', color: '#D97706' },
  { label: 'New Product', icon: 'PackagePlus', href: '/inventory/products', color: '#DC2626' },
  { label: 'Open ⌘K', icon: 'Command', action: 'palette', color: '#6B7280' },
]

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees.
 * Full form: ₹28,47,500 — used in KPI tiles and tooltips.
 * Abbreviated form: ₹28.5L / ₹1.2Cr — used in chart axes and badges.
 */
export function formatINR(value: number, abbreviated = false): string {
  if (abbreviated) {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`
    }
    return `₹${value}`
  }

  // Full Indian number formatting
  const absValue = Math.abs(Math.round(value))
  const str = absValue.toString()

  if (str.length <= 3) {
    return `₹${str}`
  }

  // Indian grouping: last 3 digits, then groups of 2
  const last3 = str.slice(-3)
  const remaining = str.slice(0, -3)
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `₹${grouped},${last3}`
}

/**
 * Compute percent change between current and previous values.
 */
export function formatPercentChange(
  current: number,
  previous: number,
): { value: number; direction: TrendDirection; label: string } {
  if (previous === 0) {
    return { value: 0, direction: 'neutral', label: '—' }
  }
  const pct = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(pct) * 10) / 10
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : ''
  return {
    value: rounded,
    direction,
    label: `${sign}${rounded}% vs last month`,
  }
}
