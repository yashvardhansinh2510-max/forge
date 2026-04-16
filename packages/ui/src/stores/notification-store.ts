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
    type: 'deal_won',
    title: 'Follow-up won: Sanjay Patil',
    description: '₹1,76,000 — Vitra S50 + Grohe Rainshower package',
    timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
    read: false,
    href: '/follow-ups',
  },
  {
    id: '2',
    type: 'overdue_invoice',
    title: 'Follow-up overdue: Deepak Sawant',
    description: 'Grohe Euphoria — 3 days past follow-up date',
    timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
    read: false,
    href: '/follow-ups',
  },
  {
    id: '3',
    type: 'general',
    title: 'New walk-in: Mahesh Thakur',
    description: 'Kajaria + Vitra — ₹12,00,000 bulk project',
    timestamp: new Date(now - 1 * 60 * 60 * 1000),
    read: false,
    href: '/follow-ups',
  },
  {
    id: '4',
    type: 'production_due',
    title: 'PO-2025-0042 partially received',
    description: '18 of 40 units received at Bhiwandi godown',
    timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000),
    read: true,
    href: '/purchases',
  },
  {
    id: '5',
    type: 'general',
    title: 'Payment received: Prestige Group',
    description: '₹86,200 — advance for Q-2025-0047',
    timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000),
    read: true,
    href: '/payments',
  },
  {
    id: '6',
    type: 'general',
    title: 'Ramesh Pawar joined your workspace',
    description: 'Invited by you — role: Sales',
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
