'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/purchases', label: 'Tracker' },
  { href: '/purchases/new', label: 'New PO' },
  { href: '/purchases/boxes', label: 'Box Queue' },
] as const

export default function PurchasesNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-[var(--border)] bg-white/80 px-5 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Purchases
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Forge purchase tracker
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8] shadow-[0_8px_20px_rgba(37,99,235,0.12)]'
                    : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
