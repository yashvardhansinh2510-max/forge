'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { GeneralSection } from '@/components/settings/general-section'
import { SettingsUsersClient } from './users/settings-users-client'

type SectionId = 'general' | 'users' | 'notifications' | 'integrations'

type NavSection =
  | { id: SectionId; label: string; href?: never }
  | { id: null; label: string; href: string }

const NAV_ITEMS: NavSection[] = [
  { id: 'general', label: 'General' },
  { id: 'users', label: 'Users & Roles' },
  { id: null, label: 'Price Lists', href: '/settings/price-lists' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
]

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <p
        className="text-sm"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)' }}
      >
        {title} — coming soon
      </p>
    </div>
  )
}

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('general')

  return (
    <PageContainer title="Settings">
      <div
        className="flex min-h-[600px] overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border-default)', background: 'var(--surface)' }}
      >
        {/* Left nav */}
        <nav
          className="flex w-52 shrink-0 flex-col border-r py-3"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-subtle)' }}
        >
          {NAV_ITEMS.map((item) => {
            if (item.id === null) {
              return (
                <Link
                  key={item.label}
                  href={item.href as never}
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--text-primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--text-secondary)')
                  }
                >
                  {item.label}
                  <ExternalLink size={11} className="opacity-50" />
                </Link>
              )
            }

            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="relative flex items-center px-4 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: isActive ? 500 : 400,
                  textAlign: 'left',
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right content */}
        <div className="flex-1 overflow-auto">
          {active === 'general' && <GeneralSection />}
          {active === 'users' && <SettingsUsersClient />}
          {active === 'notifications' && <PlaceholderSection title="Notifications" />}
          {active === 'integrations' && <PlaceholderSection title="Integrations" />}
        </div>
      </div>
    </PageContainer>
  )
}
