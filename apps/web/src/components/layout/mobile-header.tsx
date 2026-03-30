'use client'

import * as React from 'react'
import { Menu, Bell, Search } from 'lucide-react'
import { usePaletteStore, useNotificationStore } from '@forge/ui'
import { NotificationPanel } from './notification-panel'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { open: openPalette } = usePaletteStore()
  const { unreadCount } = useNotificationStore()

  return (
    <header
      className="flex items-center justify-between border-b px-4 md:hidden"
      style={{
        height: '52px',
        backgroundColor: 'white',
        borderColor: 'var(--border-default)',
      }}
    >
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[--surface-ground]"
      >
        <Menu size={20} style={{ color: 'var(--text-secondary)' }} />
      </button>

      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M9 1L2 9h6l-1 6 7-8H8l1-6z"
            fill="var(--text-primary)"
            stroke="var(--text-primary)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          Forge
        </span>
      </div>

      <div className="flex items-center gap-1">
        <NotificationPanel>
          <button className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[--surface-ground]">
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
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
        <button
          onClick={openPalette}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[--surface-ground]"
        >
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </header>
  )
}
