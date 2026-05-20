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

export const quickActions: QuickAction[] = [
  { label: 'New Contact', icon: 'UserPlus', href: '/crm/contacts', color: '#6366f1' },
  { label: 'New Quotation', icon: 'Receipt', href: '/sales/quotations', color: '#0ea5e9' },
  { label: 'New Order', icon: 'ShoppingCart', href: '/sales/orders', color: '#10b981' },
  { label: 'Add Product', icon: 'PackagePlus', href: '/inventory/products', color: '#f59e0b' },
  { label: 'Command Palette', icon: 'Command', action: 'palette', color: '#8b5cf6' },
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
