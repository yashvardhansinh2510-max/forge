'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useShellUser } from '@/lib/user-context'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { LucideIcon } from 'lucide-react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  User,
  Building2,
  Keyboard,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { useShellStore, usePaletteStore, useNotificationStore, sidebarVariants, cn } from '@forge/ui'
import { NAV_GROUPS, isNavItemActive } from '@/lib/navigation'

function ForgeLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className="flex h-[52px] items-center border-b px-3.5"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path
          d="M9 1L2 9h6l-1 6 7-8H8l1-6z"
          fill="white"
          stroke="white"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.12 }}
            className="ml-2 overflow-hidden whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'white',
            }}
          >
            Forge
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { orgName } = useShellUser()
  const initials = orgName.slice(0, 2).toUpperCase()

  return (
    <div className="mx-2.5 my-2">
      <div
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 transition-colors"
        style={{ color: 'var(--shell-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-full text-white"
          style={{
            width: collapsed ? '26px' : '22px',
            height: collapsed ? '26px' : '22px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: 'var(--accent)',
            margin: collapsed ? '0 auto' : undefined,
          }}
        >
          {initials}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.12 }}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
            >
              <span
                className="truncate"
                style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5' }}
              >
                {orgName}
              </span>
              <ChevronsUpDown size={12} className="shrink-0" style={{ color: '#71717A' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function NewButton({ collapsed }: { collapsed: boolean }) {
  const { open } = usePaletteStore()

  return (
    <div className="mx-2.5 mb-2">
      <button
        onClick={open}
        className="flex h-8 w-full cursor-pointer items-center rounded-md border border-dashed transition-all"
        style={{
          borderColor: 'rgba(255,255,255,0.15)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? undefined : '10px',
          paddingRight: collapsed ? undefined : '10px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderStyle = 'solid'
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderStyle = 'dashed'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <Plus size={13} style={{ color: '#A1A1AA' }} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.12 }}
              className="ml-2 overflow-hidden whitespace-nowrap"
              style={{ fontSize: '13px', color: '#A1A1AA' }}
            >
              New
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}

function NavItemLink({
  label,
  href,
  icon: Icon,
  badge,
  collapsed,
  isActive,
}: {
  label: string
  href: string
  icon: LucideIcon
  badge?: 'overdue'
  collapsed: boolean
  isActive: boolean
}) {
  const { notifications } = useNotificationStore()
  const overdueBadgeCount = badge === 'overdue'
    ? notifications.filter((n) => n.type === 'overdue_invoice' && !n.read).length
    : 0

  const linkContent = (
    <Link
      href={href as never}
      className={cn(
        'relative flex items-center rounded-md transition-colors',
        collapsed ? 'h-8 w-11 justify-center' : 'h-8 gap-2.5 px-2.5',
      )}
      style={{
        backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: isActive ? 'white' : '#D4D4D8',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = '#F4F4F5'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#D4D4D8'
        }
      }}
    >
      {isActive && (
        <div
          className="absolute left-0"
          style={{
            top: '4px',
            bottom: '4px',
            width: '2px',
            backgroundColor: '#3B82F6',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <Icon
        size={16}
        className="shrink-0"
        style={{ color: isActive ? 'white' : '#A1A1AA' }}
      />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 overflow-hidden whitespace-nowrap"
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {overdueBadgeCount > 0 && !collapsed && (
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            backgroundColor: 'rgba(239,68,68,0.15)',
            color: '#FCA5A5',
            fontSize: '11px',
            fontWeight: 600,
            paddingLeft: '6px',
            paddingRight: '6px',
            height: '18px',
            borderRadius: '9px',
          }}
        >
          {overdueBadgeCount}
        </span>
      )}
      {overdueBadgeCount > 0 && collapsed && (
        <div
          className="absolute"
          style={{
            top: '4px',
            right: '4px',
            width: '6px',
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: '#EF4444',
          }}
        />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <TooltipPrimitive.Root delayDuration={0}>
        <TooltipPrimitive.Trigger asChild>{linkContent}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={8}
            className="z-50 rounded-md px-2 py-1 shadow-lg"
            style={{
              backgroundColor: '#27272A',
              color: 'white',
              fontSize: '12px',
            }}
          >
            {label}
            <TooltipPrimitive.Arrow style={{ fill: '#27272A' }} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    )
  }

  return linkContent
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { fullName, email, imageUrl, initials, signOut } = useShellUser()

  const avatarEl = imageUrl ? (
    <img
      src={imageUrl}
      alt={fullName}
      className="shrink-0 rounded-full object-cover"
      style={{ width: '28px', height: '28px' }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: '28px',
        height: '28px',
        backgroundColor: '#3B82F6',
        color: 'white',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {initials.toUpperCase()}
    </div>
  )

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex w-full cursor-pointer items-center rounded-md transition-colors',
            collapsed ? 'h-11 justify-center' : 'h-11 gap-2.5 px-2.5',
          )}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {avatarEl}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className="min-w-0 flex-1 overflow-hidden text-left"
              >
                <div
                  className="truncate"
                  style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5' }}
                >
                  {fullName}
                </div>
                <div className="truncate" style={{ fontSize: '11px', color: '#71717A' }}>
                  {email}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side="right"
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] rounded-lg border shadow-xl"
          style={{
            backgroundColor: '#27272A',
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {avatarEl}
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#F4F4F5' }}>{fullName}</div>
              <div className="truncate" style={{ fontSize: '11px', color: '#71717A' }}>{email}</div>
            </div>
          </div>
          <div className="py-1">
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#F4F4F5', fontSize: '13px' }}
            >
              <User size={14} style={{ color: '#A1A1AA' }} />
              View Profile
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#F4F4F5', fontSize: '13px' }}
            >
              <Building2 size={14} style={{ color: '#A1A1AA' }} />
              Switch Organization
            </DropdownMenuPrimitive.Item>
          </div>
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <div className="py-1">
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#F4F4F5', fontSize: '13px' }}
            >
              <Keyboard size={14} style={{ color: '#A1A1AA' }} />
              Keyboard Shortcuts
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#F4F4F5', fontSize: '13px' }}
            >
              <Sparkles size={14} style={{ color: '#A1A1AA' }} />
              What&apos;s New
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#F4F4F5', fontSize: '13px' }}
            >
              <HelpCircle size={14} style={{ color: '#A1A1AA' }} />
              Help & Support
            </DropdownMenuPrimitive.Item>
          </div>
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <div className="py-1">
            <DropdownMenuPrimitive.Item
              className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm outline-none hover:bg-white/[0.08]"
              style={{ color: '#FCA5A5', fontSize: '13px' }}
              onSelect={() => signOut()}
            >
              <LogOut size={14} style={{ color: '#FCA5A5' }} />
              Sign Out
            </DropdownMenuPrimitive.Item>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, _hasHydrated, toggleSidebar } = useShellStore()

  React.useEffect(() => {
    useShellStore.persist.rehydrate()
  }, [])

  const pathname = usePathname()

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <motion.aside
        variants={sidebarVariants}
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        className="sticky top-0 z-30 hidden h-screen flex-col overflow-hidden border-r md:flex"
        style={{
          backgroundColor: 'var(--shell-bg)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <ForgeLogo collapsed={sidebarCollapsed} />
        <OrgSwitcher collapsed={sidebarCollapsed} />
        <NewButton collapsed={sidebarCollapsed} />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !sidebarCollapsed && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3.5 pb-1 pt-4"
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.28)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.10em',
                    }}
                  >
                    {group.label}
                  </motion.div>
                </AnimatePresence>
              )}
              <div className="mx-1.5 space-y-0.5">
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    badge={item.badge}
                    collapsed={sidebarCollapsed}
                    isActive={isNavItemActive(pathname, item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="border-t pb-2 pt-2"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3.5 py-1"
                style={{ fontSize: '11px', color: '#52525B' }}
              >
                ⌘K to search anywhere
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-1.5">
            <UserMenu collapsed={sidebarCollapsed} />
          </div>

          <div className="mx-1.5 mt-1">
            <button
              onClick={toggleSidebar}
              className="flex h-8 w-full cursor-pointer items-center rounded-md transition-colors"
              style={{
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                paddingLeft: sidebarCollapsed ? undefined : '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={13} style={{ color: '#52525B' }} />
              ) : (
                <>
                  <ChevronLeft size={13} style={{ color: '#52525B' }} />
                  <span className="ml-2" style={{ fontSize: '12px', color: '#52525B' }}>
                    Collapse
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>
    </TooltipPrimitive.Provider>
  )
}
