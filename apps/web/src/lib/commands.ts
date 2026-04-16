import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  ShoppingBag,
  BarChart3,
  Settings2,
  FileText,
  TrendingUp,
  Upload,
  Download,
  Activity,
  UserPlus,
} from 'lucide-react'

export type CommandGroup = 'jump' | 'create' | 'action'
export type CommandCategory =
  | 'crm'
  | 'sales'
  | 'purchases'
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
  purchases: { bg: '#FFFBEB', color: '#B45309' },
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
    id: 'jump-quotations',
    label: 'Quotation Builder',
    href: '/pos',
    group: 'jump',
    icon: ClipboardList,
    category: 'sales',
  },
  {
    id: 'jump-quotations-list',
    label: 'Quotations List',
    href: '/sales/quotations',
    group: 'jump',
    icon: FileText,
    category: 'sales',
  },
  {
    id: 'jump-purchases',
    label: 'Purchases',
    href: '/purchases',
    group: 'jump',
    icon: ShoppingBag,
    category: 'purchases',
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
    id: 'create-quotation',
    label: 'New Quotation',
    group: 'create',
    icon: FileText,
    category: 'sales',
  },

  // Actions
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
]
