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

const ROLE_OPTIONS: Role[] = ['owner', 'manager', 'worker']

export function SettingsUsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
  }, [])

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdating(userId)
    await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
    setUpdating(null)
  }

  if (loading) {
    return <div className="p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading users…</div>
  }

  return (
    <div className="p-6">
      <h1
        className="mb-6 text-xl font-semibold"
        style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
      >
        Users
      </h1>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                  {user.name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={updating === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className="rounded border px-2 py-1 text-sm"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
