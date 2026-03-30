import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShoppingCart,
  Truck,
  Package,
  Boxes,
  ShoppingBag,
  Receipt,
  Wallet,
  BarChart3,
  BookOpen,
  Tag,
  Settings2,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: 'overdue'
}

export interface NavGroup {
  label: string | null
  items: NavItem[]
}

/**
 * Check if a nav item should be active for the given pathname.
 * For items with sub-routes (e.g. /crm/contacts), matches the module prefix (/crm)
 * so that /crm/pipeline also highlights CRM.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const segments = href.split('/').filter(Boolean)
  if (segments.length >= 2) {
    const modulePrefix = `/${segments[0]!}`
    return pathname === modulePrefix || pathname.startsWith(modulePrefix + '/')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Quotation Builder', href: '/pos', icon: ClipboardList },
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      { label: 'CRM', href: '/crm/contacts', icon: Users },
      { label: 'Sales', href: '/sales/quotations', icon: ShoppingCart },
      { label: 'Deliveries', href: '/sales/deliveries', icon: Truck },
      { label: 'Samples', href: '/samples', icon: Package },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Inventory', href: '/inventory/products', icon: Boxes },
      { label: 'Purchases', href: '/purchases', icon: ShoppingBag },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoicing', href: '/invoicing/invoices', icon: Receipt, badge: 'overdue' },
      { label: 'Payments',  href: '/payments',           icon: Wallet },
      { label: 'Reports',   href: '/reports',            icon: BarChart3 },
    ],
  },
  {
    label: 'Configure',
    items: [
      { label: 'Catalogue', href: '/catalogue', icon: BookOpen },
      { label: 'Price Lists', href: '/settings/price-lists', icon: Tag },
      { label: 'Settings', href: '/settings', icon: Settings2 },
    ],
  },
]
