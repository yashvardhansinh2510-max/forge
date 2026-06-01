'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const INVOICING_TABS = [
  { label: 'Invoices', href: '/invoicing/invoices' },
  { label: 'Payments', href: '/invoicing/payments' },
]

export function InvoicingNav() {
  const pathname = usePathname()
  return (
    <div
      className="flex items-center gap-0"
      style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}
    >
      {INVOICING_TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href as never}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: 40,
              padding: '0 16px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              textDecoration: 'none',
              transition: 'color 150ms',
              userSelect: 'none',
            }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="invoicing-tab-indicator"
                style={{
                  position: 'absolute', bottom: -1, left: 0, right: 0,
                  height: 2, background: 'var(--accent)', borderRadius: '2px 2px 0 0',
                }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
