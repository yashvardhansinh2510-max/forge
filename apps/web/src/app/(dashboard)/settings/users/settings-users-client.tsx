'use client'

import { useEffect, useState } from 'react'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AppRole } from '@/lib/permissions'

type User = {
  id: string
  name: string
  email: string
  role: string
  clerkId: string | null
  isActive: boolean
}

const ROLE_COLORS: Record<string, string> = {
  OWNER:          '#3B82F6',
  ADMIN:          '#8B5CF6',
  OPS_MANAGER:    '#F59E0B',
  BILLING_STAFF:  '#10B981',
  DISPATCH_STAFF: '#06B6D4',
  SALES_STAFF:    '#6366F1',
  READ_ONLY:      '#9CA3AF',
  MANAGER:        '#F59E0B',
  WORKER:         '#9CA3AF',
}

export function SettingsUsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((data: unknown) => {
        setUsers(Array.isArray(data) ? (data as User[]) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setUpdating(userId)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    setUpdating(null)
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setUpdating(userId)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)))
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Loading users…
      </div>
    )
  }

  const isOwner = (user: User) => user.role?.toUpperCase() === 'OWNER'

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
          >
            Users &amp; Roles
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage team member access levels and account status.
          </p>
        </div>
        <a
          href="https://dashboard.clerk.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-subtle)]"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
        >
          + Invite via Clerk
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-subtle)' }}>
              {['Name', 'Email', 'Role', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: i < users.length - 1 ? '1px solid var(--border-default)' : undefined,
                  opacity: user.isActive ? 1 : 0.55,
                }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: ROLE_COLORS[user.role?.toUpperCase()] ?? '#9CA3AF' }}
                    >
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>

                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  {user.email}
                </td>

                <td className="px-4 py-3">
                  {isOwner(user) ? (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${ROLE_COLORS.OWNER}18`, color: ROLE_COLORS.OWNER, fontFamily: 'var(--font-ui)' }}
                    >
                      Owner
                    </span>
                  ) : (
                    <select
                      value={user.role?.toUpperCase()}
                      disabled={updating === user.id || !user.isActive}
                      onChange={(e) => void handleRoleChange(user.id, e.target.value as AppRole)}
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
                      style={{
                        borderColor:  'var(--border-default)',
                        background:   'var(--surface)',
                        color:        ROLE_COLORS[user.role?.toUpperCase()] ?? 'var(--text-primary)',
                        fontFamily:   'var(--font-ui)',
                        cursor:       updating === user.id ? 'wait' : 'pointer',
                      }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>

                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: user.isActive ? '#D1FAE5' : '#FEE2E2',
                      color:      user.isActive ? '#065F46' : '#991B1B',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: user.isActive ? '#10B981' : '#EF4444' }}
                    />
                    {user.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  {!isOwner(user) && (
                    <button
                      type="button"
                      disabled={updating === user.id}
                      onClick={() => void handleToggleActive(user.id, !user.isActive)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-subtle)] disabled:opacity-40"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
                    >
                      {updating === user.id ? '…' : user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
