'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Bell, ChevronRight } from 'lucide-react'
import { useBreadcrumbs, usePaletteStore, useNotificationStore } from '@forge/ui'
import { NotificationPanel } from './notification-panel'

export function Header() {
  const pathname = usePathname()
  const breadcrumbs = useBreadcrumbs(pathname)
  const { open: openPalette } = usePaletteStore()
  const { unreadCount } = useNotificationStore()

  const displayCrumbs: { label: string; href: string }[] =
    breadcrumbs.length > 3
      ? [breadcrumbs[0]!, { label: '...', href: '' }, ...breadcrumbs.slice(-2)]
      : breadcrumbs

  return (
    <header
      className="sticky top-0 z-40 hidden items-center justify-between border-b px-6 md:flex"
      style={{
        minHeight: '52px',
        backgroundColor: 'white',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5">
        <Link href="/dashboard" className="flex items-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M9 1L2 9h6l-1 6 7-8H8l1-6z"
              fill="var(--text-tertiary)"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {displayCrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href || i}>
            <ChevronRight
              size={12}
              style={{ color: 'var(--text-tertiary)' }}
              className="shrink-0"
            />
            {i === displayCrumbs.length - 1 ? (
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {crumb.label}
              </span>
            ) : crumb.href ? (
              <Link
                href={crumb.href as never}
                className="transition-colors hover:text-[--text-secondary]"
                style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          onClick={openPalette}
          className="flex h-7 cursor-pointer items-center gap-2 rounded-md border px-2.5 transition-colors hover:bg-[--surface-ground]"
          style={{
            width: '180px',
            borderColor: 'var(--border-default)',
            backgroundColor: 'white',
          }}
        >
          <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span
            className="flex-1 text-left"
            style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}
          >
            Search...
          </span>
          <kbd
            className="flex items-center rounded border px-1"
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--surface-ground)',
              borderColor: 'var(--border-default)',
              height: '18px',
              color: 'var(--text-tertiary)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <NotificationPanel>
          <button
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[--surface-ground]"
            style={{ backgroundColor: 'transparent' }}
          >
            <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute animate-pulse rounded-full"
                style={{
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  backgroundColor: '#3B82F6',
                  border: '1.5px solid white',
                }}
              />
            )}
          </button>
        </NotificationPanel>
      </div>
    </header>
  )
}
