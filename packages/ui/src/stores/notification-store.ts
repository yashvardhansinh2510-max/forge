'use client'

import { create } from 'zustand'

export type NotificationType =
  | 'overdue_invoice'
  | 'low_stock'
  | 'production_due'
  | 'deal_won'
  | 'deal_lost'
  | 'general'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: Date
  read: boolean
  href?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

function computeUnread(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length
}

const now = Date.now()

const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'overdue_invoice',
    title: 'Invoice #INV-0042 is overdue',
    description: 'Meridian Corp — ₹1,24,000 due 5 days ago',
    timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
    read: false,
    href: '/invoicing/invoices',
  },
  {
    id: '2',
    type: 'low_stock',
    title: 'Low stock alert: Omega-3 Capsules',
    description: 'Only 12 units remaining across all warehouses',
    timestamp: new Date(now - 2 * 60 * 60 * 1000),
    read: false,
    href: '/inventory/products',
  },
  {
    id: '3',
    type: 'deal_won',
    title: 'Deal won: Pinnacle Hospitals',
    description: '₹8,50,000 deal closed by Rohan Mehta',
    timestamp: new Date(now - 1 * 60 * 60 * 1000),
    read: false,
    href: '/crm/pipeline',
  },
  {
    id: '4',
    type: 'production_due',
    title: 'Production order #PO-0018 due today',
    description: '500 units of Vitamin D3 Softgels',
    timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
    read: true,
    href: '/manufacturing/orders',
  },
  {
    id: '5',
    type: 'low_stock',
    title: 'Low stock: Zinc Tablets 50mg',
    description: '18 units remaining — reorder point is 50',
    timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000),
    read: true,
    href: '/inventory/products',
  },
  {
    id: '6',
    type: 'general',
    title: 'Priya Sharma joined your workspace',
    description: 'Invited by you — role: Manager',
    timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000),
    read: true,
  },
]

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: initialNotifications,
  unreadCount: computeUnread(initialNotifications),
  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      )
      return { notifications, unreadCount: computeUnread(notifications) }
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}))
