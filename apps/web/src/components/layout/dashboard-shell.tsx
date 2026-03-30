'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Toaster } from 'sonner'
import { pageVariants, useRecentPages, useBreadcrumbs } from '@forge/ui'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from './command-palette'
import { MobileHeader } from './mobile-header'
import { MobileNav } from './mobile-nav'
import { NAV_GROUPS, isNavItemActive } from '@/lib/navigation'
import { DefaultUserProvider } from '@/lib/user-context'
import { ClerkUserProvider } from '@/lib/clerk-user-provider'
import Link from 'next/link'

const clerkConfigured =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'string' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 8

function MobileSidebarDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="fixed left-0 top-0 z-40 flex h-full w-[280px] flex-col overflow-y-auto"
                style={{ backgroundColor: 'var(--shell-bg)' }}
              >
                {/* Logo */}
                <div
                  className="flex h-[52px] items-center gap-2 border-b px-3.5"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M9 1L2 9h6l-1 6 7-8H8l1-6z"
                      fill="white"
                      stroke="white"
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: 'white',
                    }}
                  >
                    Forge
                  </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-2">
                  {NAV_GROUPS.map((group, gi) => (
                    <div key={gi}>
                      {group.label && (
                        <div
                          className="px-3.5 pb-1 pt-4"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#71717A',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {group.label}
                        </div>
                      )}
                      <div className="mx-1.5 space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = isNavItemActive(pathname, item.href)
                          return (
                            <Link
                              key={item.href}
                              href={item.href as never}
                              onClick={() => onOpenChange(false)}
                              className="relative flex h-9 items-center gap-2.5 rounded-md px-2.5"
                              style={{
                                backgroundColor: isActive
                                  ? 'rgba(255,255,255,0.10)'
                                  : 'transparent',
                                color: isActive ? 'white' : '#D4D4D8',
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
                              <item.icon
                                size={16}
                                style={{ color: isActive ? 'white' : '#A1A1AA' }}
                              />
                              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                {item.label}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const { addRecentPage } = useRecentPages()
  const breadcrumbs = useBreadcrumbs(pathname)

  const isPOS         = pathname === '/pos'
  const isFullHeight  = isPOS || pathname === '/payments' || pathname.startsWith('/purchases')

  // Track recent pages on route change
  React.useEffect(() => {
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1]
    if (lastCrumb) {
      addRecentPage({ label: lastCrumb.label, href: pathname, icon: '' })
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex overflow-hidden"
      style={{
        height: '100dvh',
        backgroundColor: 'var(--surface-ground)',
      }}
    >
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop header — hidden on full-screen POS */}
        {!isFullHeight && <Header />}
        {/* Mobile header — hidden on full-screen pages */}
        {!isFullHeight && <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />}

        <main
          className={isFullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto pb-16 md:pb-0'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={isFullHeight ? undefined : pageVariants}
              initial={isFullHeight ? undefined : 'initial'}
              animate={isFullHeight ? undefined : 'animate'}
              exit={isFullHeight ? undefined : 'exit'}
              style={isFullHeight ? { height: '100%', display: 'flex', flexDirection: 'column' } : undefined}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav — hidden on full-screen pages */}
      {!isFullHeight && <MobileNav />}

      {/* Mobile sidebar drawer */}
      <MobileSidebarDrawer
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />

      {/* Global overlays */}
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '14px',
          },
        }}
      />
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const Provider = clerkConfigured ? ClerkUserProvider : DefaultUserProvider
  return (
    <Provider>
      <ShellContent>{children}</ShellContent>
    </Provider>
  )
}
