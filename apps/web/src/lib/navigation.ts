import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShoppingBag,
  BookOpen,
  Tag,
  Settings2,
  PhoneCall,
  Wallet,
  ScrollText,
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
      { label: 'Purchases', href: '/purchases', icon: ShoppingBag },
      { label: 'Payments', href: '/payments', icon: Wallet },
      { label: 'Follow-ups', href: '/follow-ups', icon: PhoneCall, badge: 'overdue' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'CRM', href: '/crm/contacts', icon: Users },
    ],
  },
  {
    label: 'Configure',
    items: [
      { label: 'Catalogue', href: '/catalogue', icon: BookOpen },
      { label: 'Price Lists', href: '/settings/price-lists', icon: Tag },
      { label: 'Users', href: '/settings/users', icon: Users },
      { label: 'Audit Logs', href: '/settings/audit-logs', icon: ScrollText },
      { label: 'Settings', href: '/settings', icon: Settings2 },
    ],
  },
]
