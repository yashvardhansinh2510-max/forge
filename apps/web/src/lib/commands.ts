import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Building2,
  ShoppingCart,
  Package,
  Factory,
  Receipt,
  BarChart3,
  Settings2,
  FileText,
  Layers,
  CreditCard,
  ArrowLeftRight,
  Warehouse,
  UserPlus,
  TrendingUp,
  Upload,
  Download,
  Activity,
} from 'lucide-react'

export type CommandGroup = 'jump' | 'create' | 'action'
export type CommandCategory =
  | 'crm'
  | 'sales'
  | 'inventory'
  | 'manufacturing'
  | 'finance'
  | 'settings'

export interface Command {
  id: string
  label: string
  description?: string
  href?: string
  group: CommandGroup
  icon: LucideIcon
  category: CommandCategory
  shortcut?: string
}

export const CATEGORY_COLORS: Record<CommandCategory, { bg: string; color: string }> = {
  crm: { bg: '#EFF6FF', color: '#2563EB' },
  sales: { bg: '#F0FDF4', color: '#15803D' },
  inventory: { bg: '#FFFBEB', color: '#B45309' },
  manufacturing: { bg: '#FFF1F2', color: '#BE123C' },
  finance: { bg: '#F5F3FF', color: '#6D28D9' },
  settings: { bg: '#F4F4F5', color: '#52525B' },
}

export const COMMANDS: Command[] = [
  // Jump To
  {
    id: 'jump-dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    group: 'jump',
    icon: LayoutDashboard,
    category: 'settings',
  },
  {
    id: 'jump-contacts',
    label: 'Contacts',
    href: '/crm/contacts',
    group: 'jump',
    icon: Users,
    category: 'crm',
  },
  {
    id: 'jump-companies',
    label: 'Companies',
    href: '/crm/companies',
    group: 'jump',
    icon: Building2,
    category: 'crm',
  },
  {
    id: 'jump-pipeline',
    label: 'Pipeline',
    href: '/crm/pipeline',
    group: 'jump',
    icon: TrendingUp,
    category: 'crm',
  },
  {
    id: 'jump-sales-orders',
    label: 'Sales Orders',
    href: '/sales/orders',
    group: 'jump',
    icon: ShoppingCart,
    category: 'sales',
  },
  {
    id: 'jump-quotations',
    label: 'Quotations',
    href: '/sales/quotes',
    group: 'jump',
    icon: FileText,
    category: 'sales',
  },
  {
    id: 'jump-products',
    label: 'Products',
    href: '/inventory/products',
    group: 'jump',
    icon: Package,
    category: 'inventory',
  },
  {
    id: 'jump-warehouses',
    label: 'Warehouses',
    href: '/inventory/warehouses',
    group: 'jump',
    icon: Warehouse,
    category: 'inventory',
  },
  {
    id: 'jump-stock-movements',
    label: 'Stock Movements',
    href: '/inventory/movements',
    group: 'jump',
    icon: ArrowLeftRight,
    category: 'inventory',
  },
  {
    id: 'jump-production-orders',
    label: 'Production Orders',
    href: '/manufacturing/orders',
    group: 'jump',
    icon: Factory,
    category: 'manufacturing',
  },
  {
    id: 'jump-bom',
    label: 'Bill of Materials',
    href: '/manufacturing/bom',
    group: 'jump',
    icon: Layers,
    category: 'manufacturing',
  },
  {
    id: 'jump-invoices',
    label: 'Invoices',
    href: '/invoicing/invoices',
    group: 'jump',
    icon: Receipt,
    category: 'finance',
  },
  {
    id: 'jump-payments',
    label: 'Payments',
    href: '/invoicing/payments',
    group: 'jump',
    icon: CreditCard,
    category: 'finance',
  },
  {
    id: 'jump-reports',
    label: 'Reports',
    href: '/reports',
    group: 'jump',
    icon: BarChart3,
    category: 'settings',
  },
  {
    id: 'jump-settings',
    label: 'Settings',
    href: '/settings',
    group: 'jump',
    icon: Settings2,
    category: 'settings',
  },

  // Create
  {
    id: 'create-contact',
    label: 'New Contact',
    group: 'create',
    icon: UserPlus,
    category: 'crm',
  },
  {
    id: 'create-company',
    label: 'New Company',
    group: 'create',
    icon: Building2,
    category: 'crm',
  },
  {
    id: 'create-deal',
    label: 'New Deal',
    group: 'create',
    icon: TrendingUp,
    category: 'crm',
  },
  {
    id: 'create-invoice',
    label: 'New Invoice',
    group: 'create',
    icon: Receipt,
    category: 'finance',
  },
  {
    id: 'create-sales-order',
    label: 'New Sales Order',
    group: 'create',
    icon: ShoppingCart,
    category: 'sales',
  },
  {
    id: 'create-quotation',
    label: 'New Quotation',
    group: 'create',
    icon: FileText,
    category: 'sales',
  },
  {
    id: 'create-product',
    label: 'New Product',
    group: 'create',
    icon: Package,
    category: 'inventory',
  },
  {
    id: 'create-production-order',
    label: 'New Production Order',
    group: 'create',
    icon: Factory,
    category: 'manufacturing',
  },

  // Actions
  {
    id: 'action-record-payment',
    label: 'Record Payment',
    group: 'action',
    icon: CreditCard,
    category: 'finance',
  },
  {
    id: 'action-import-contacts',
    label: 'Import Contacts',
    group: 'action',
    icon: Upload,
    category: 'crm',
  },
  {
    id: 'action-export-csv',
    label: 'Export CSV',
    group: 'action',
    icon: Download,
    category: 'settings',
  },
  {
    id: 'action-invite-member',
    label: 'Invite Team Member',
    group: 'action',
    icon: UserPlus,
    category: 'settings',
  },
  {
    id: 'action-activity-log',
    label: 'View Activity Log',
    group: 'action',
    icon: Activity,
    category: 'settings',
  },
  {
    id: 'action-log-movement',
    label: 'Log Stock Movement',
    description: 'Record a stock in, out, transfer, or adjustment',
    href: '/inventory/movements',
    group: 'action',
    icon: ArrowLeftRight,
    category: 'inventory',
  },
]
