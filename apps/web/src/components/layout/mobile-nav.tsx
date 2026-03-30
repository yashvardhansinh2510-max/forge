'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  MoreHorizontal,
  Factory,
  Receipt,
  BarChart3,
  Settings2,
} from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@forge/ui'

interface NavTab {
  label: string
  href: string
  icon: LucideIcon
}

const PRIMARY_TABS: NavTab[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/crm/contacts', icon: Users },
  { label: 'Sales', href: '/sales/orders', icon: ShoppingCart },
  { label: 'Inventory', href: '/inventory/products', icon: Package },
]

const MORE_ITEMS: NavTab[] = [
  { label: 'Manufacturing', href: '/manufacturing/orders', icon: Factory },
  { label: 'Invoicing', href: '/invoicing/invoices', icon: Receipt },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings2 },
]

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const isMoreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href))

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t md:hidden"
        style={{
          backgroundColor: 'var(--shell-bg)',
          borderColor: 'rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {PRIMARY_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href as never}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2',
              )}
            >
              <div className="relative">
                <tab.icon
                  size={20}
                  style={{ color: isActive ? 'white' : '#71717A' }}
                />
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: '4px',
                      height: '4px',
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isActive ? 'white' : '#71717A',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-2"
        >
          <div className="relative">
            <MoreHorizontal
              size={20}
              style={{ color: isMoreActive ? 'white' : '#71717A' }}
            />
            {isMoreActive && (
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: '4px',
                  height: '4px',
                  backgroundColor: 'var(--accent)',
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: isMoreActive ? 'white' : '#71717A',
            }}
          >
            More
          </span>
        </button>
      </nav>

      {/* More sheet */}
      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <AnimatePresence>
          {moreOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild>
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
                  style={{
                    backgroundColor: 'var(--shell-bg)',
                    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                  }}
                >
                  <div className="mx-auto mt-2 mb-4 h-1 w-8 rounded-full bg-white/20" />
                  <div className="px-4 pb-4">
                    {MORE_ITEMS.map((item) => {
                      const isActive = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href as never}
                          onClick={() => setMoreOpen(false)}
                          className="flex h-12 items-center gap-3 rounded-lg px-3"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                            color: isActive ? 'white' : '#D4D4D8',
                          }}
                        >
                          <item.icon size={18} style={{ color: isActive ? 'white' : '#A1A1AA' }} />
                          <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </>
  )
}
