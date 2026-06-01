import { ReactNode } from 'react'
import Link from 'next/link'
import { Users, Shield, Key } from 'lucide-react'

const navItems = [
  { href: '/settings/users', label: 'Users', icon: Users },
  { href: '/settings/roles', label: 'Roles', icon: Shield },
  { href: '/settings/permissions', label: 'Permissions', icon: Key },
]

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <aside className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6 flex-shrink-0">
        <h2 className="text-xl font-bold mb-6 text-gray-900">Settings</h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-white overflow-auto">
        {children}
      </main>
    </div>
  )
}
