'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Receipt,
  Package,
  Factory,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useNotificationStore, popoverVariants, type Notification } from '@forge/ui'

const TYPE_CONFIG: Record<
  string,
  { bg: string; color: string; icon: LucideIcon }
> = {
  overdue_invoice: { bg: '#FFF1F2', color: '#BE123C', icon: Receipt },
  low_stock: { bg: '#FFFBEB', color: '#B45309', icon: Package },
  production_due: { bg: '#EFF6FF', color: '#1D4ED8', icon: Factory },
  deal_won: { bg: '#F0FDF4', color: '#15803D', icon: TrendingUp },
  deal_lost: { bg: '#FFF1F2', color: '#BE123C', icon: TrendingDown },
  general: { bg: '#F4F4F5', color: '#52525B', icon: Bell },
}

function groupNotifications(notifications: Notification[]) {
  const today: Notification[] = []
  const thisWeek: Notification[] = []
  const earlier: Notification[] = []

  for (const n of notifications) {
    const ts = new Date(n.timestamp)
    if (isToday(ts)) {
      today.push(n)
    } else if (isThisWeek(ts)) {
      thisWeek.push(n)
    } else {
      earlier.push(n)
    }
  }

  const groups: { label: string; items: Notification[] }[] = []
  if (today.length > 0) groups.push({ label: 'Today', items: today })
  if (thisWeek.length > 0) groups.push({ label: 'This Week', items: thisWeek })
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier })
  return groups
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { markRead } = useNotificationStore()
  const fallback = { bg: '#F4F4F5', color: '#52525B', icon: Bell } as const
  const config = TYPE_CONFIG[notification.type] ?? fallback
  const Icon = config.icon

  return (
    <button
      onClick={() => markRead(notification.id)}
      className="flex w-full cursor-pointer gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[--surface-ground]"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: notification.read ? 'white' : '#EFF6FF',
        borderLeft: notification.read ? 'none' : '2px solid #3B82F6',
        paddingLeft: notification.read ? '16px' : '14px',
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: config.bg,
        }}
      >
        <Icon size={14} style={{ color: config.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}
        >
          {notification.title}
        </div>
        <div
          className="mt-0.5 line-clamp-2"
          style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
        >
          {notification.description}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span
          suppressHydrationWarning
          className="whitespace-nowrap"
          style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}
        >
          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: false })}
        </span>
        {!notification.read && (
          <div
            className="mt-1 rounded-full"
            style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent)' }}
          />
        )}
      </div>
    </button>
  )
}

export function NotificationPanel({
  children,
}: {
  children: React.ReactNode
}) {
  const { notifications, unreadCount, markAllRead } = useNotificationStore()
  const [open, setOpen] = React.useState(false)
  const groups = groupNotifications(notifications)
  const allRead = unreadCount === 0

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <AnimatePresence>
        {open && (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content
              align="end"
              sideOffset={8}
              className="z-50"
              asChild
            >
              <motion.div
                variants={popoverVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="overflow-hidden rounded-xl border shadow-xl"
                style={{
                  width: '380px',
                  backgroundColor: 'white',
                  borderColor: 'var(--border-default)',
                  boxShadow: 'var(--shadow-xl)',
                }}
              >
                <div
                  className="flex h-12 items-center justify-between border-b px-4"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    Notifications
                  </span>
                  <button
                    onClick={markAllRead}
                    disabled={allRead}
                    className="cursor-pointer"
                    style={{
                      fontSize: '13px',
                      color: 'var(--accent)',
                      opacity: allRead ? 0.5 : 1,
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    Mark all read
                  </button>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {groups.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bell
                        size={32}
                        className="mx-auto mb-3"
                        style={{ color: 'var(--text-tertiary)' }}
                      />
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        You&apos;re all caught up
                      </div>
                      <div
                        className="mt-1"
                        style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}
                      >
                        No new notifications
                      </div>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.label}>
                        <div
                          className="px-4 py-2"
                          style={{
                            backgroundColor: 'var(--surface-ground)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {group.label}
                        </div>
                        {group.items.map((n) => (
                          <NotificationItem key={n.id} notification={n} />
                        ))}
                      </div>
                    ))
                  )}
                </div>

                <div
                  className="flex h-11 items-center justify-center border-t"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <span
                    className="cursor-pointer hover:underline"
                    style={{ fontSize: '13px', color: 'var(--accent)' }}
                  >
                    View all notifications →
                  </span>
                </div>
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  )
}
