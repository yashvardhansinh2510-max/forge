'use client'

import { useEffect, useState } from 'react'
import { type Role, ROLE_LABELS } from '@/lib/use-role'

type User = {
  id: string
  name: string
  email: string
  role: Role
  clerkId: string | null
}

const EDITABLE_ROLES: Role[] = ['manager', 'worker']

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

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdating(userId)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Loading users…
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
        >
          Users &amp; Roles
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage team member access levels.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface-subtle)',
              }}
            >
              <th className="px-4 py-3 text-left font-medium" style={{ fontFamily: 'var(--font-ui)' }}>Name</th>
              <th className="px-4 py-3 text-left font-medium" style={{ fontFamily: 'var(--font-ui)' }}>Email</th>
              <th className="px-4 py-3 text-left font-medium" style={{ fontFamily: 'var(--font-ui)' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: i < users.length - 1 ? '1px solid var(--border-default)' : undefined,
                }}
              >
                <td
                  className="px-4 py-3"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
                >
                  {user.name}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
                >
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  {user.role === 'owner' ? (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        color: '#3B82F6',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Owner
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      disabled={updating === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="rounded border px-2 py-1 text-sm"
                      style={{
                        borderColor: 'var(--border-default)',
                        background: 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {EDITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="mt-6 text-sm"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
      >
        To invite new team members, use the{' '}
        <a
          href="https://dashboard.clerk.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          Clerk dashboard
        </a>
        .
      </p>
    </div>
  )
}
