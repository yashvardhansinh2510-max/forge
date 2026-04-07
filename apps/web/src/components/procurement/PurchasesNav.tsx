'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDraftLineCount } from '@/lib/procurement-store'

const TABS = [
  { href: '/purchases',            label: 'Tracker'     },
  { href: '/purchases/new',        label: 'New PO'      },
  { href: '/purchases/boxes',      label: 'Box Tracker' },
  { href: '/purchases/follow-up',  label: 'Follow-Up'   },
]

export function PurchasesNav() {
  const pathname   = usePathname()
  const draftCount = useDraftLineCount()

  function isActive(href: string) {
    if (href === '/purchases') return pathname === '/purchases'
    return pathname.startsWith(href)
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'var(--background)', flexShrink: 0,
    }}>
      {TABS.map(({ href, label }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href as never}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '10px 12px', borderRadius: '4px 4px 0 0',
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: 'none', borderBottom: active
                ? '2px solid var(--text-primary)'
                : '2px solid transparent',
              fontFamily: 'var(--font-ui)',
              transition: 'color 0.15s',
            }}
          >
            {label}
            {href === '/purchases/new' && draftCount > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20,
                background: 'var(--text-primary)', color: 'var(--background)',
                fontFamily: 'var(--font-ui)', minWidth: 16, textAlign: 'center',
              }}>
                {draftCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
