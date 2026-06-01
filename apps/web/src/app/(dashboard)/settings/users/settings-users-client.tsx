'use client'

import { useEffect, useState } from 'react'
import { ROLE_LABELS } from '@/lib/use-role'
import type { UserRole } from '@forge/db'

type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  clerkId: string | null
}

const ROLE_OPTIONS: UserRole[] = ['OWNER', 'MANAGER', 'WORKER']

export function SettingsUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
  }, [])

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdating(userId)
    const res = await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    }
    setUpdating(null)
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setUpdating(userId)
    const res = await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)))
    }
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
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  opacity: user.isActive ? 1 : 0.5,
                }}
              >
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
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
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
                <td className="px-4 py-3">
                  <button
                    disabled={updating === user.id}
                    onClick={() => handleToggleActive(user.id, !user.isActive)}
                    className="rounded px-2 py-1 text-xs font-medium"
                    style={{
                      background: user.isActive ? 'var(--surface-hover)' : 'var(--surface)',
                      color: user.isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      border: '1px solid var(--border)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {user.isActive ? 'Active' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
