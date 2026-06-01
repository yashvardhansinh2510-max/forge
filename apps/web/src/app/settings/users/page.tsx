'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-helpers'
import { Button } from '@forge/ui'
import { Plus, Shield, UserX, UserCheck } from 'lucide-react'

export default function UsersPage() {
  const { data: users, mutate, isLoading } = useSWR('/api/settings/users', fetcher)
  const { data: roles } = useSWR('/api/settings/roles', fetcher)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/settings/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    mutate()
  }

  const handleRoleChange = async (id: string, roleId: string) => {
    await fetch(`/api/settings/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })
    mutate()
  }

  if (isLoading) return <div className="p-4">Loading users...</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <Button onClick={() => setInviteModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user: any) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    className="border-gray-300 rounded-md text-sm"
                    value={user.roleId || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="" disabled>Select role</option>
                    {roles?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : user.status === 'DISABLED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {user.status || (user.isActive ? 'ACTIVE' : 'DISABLED')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.status === 'DISABLED' || !user.isActive ? (
                    <Button variant="secondary" size="sm" onClick={() => handleStatusChange(user.id, 'ACTIVE')} className="text-green-600 hover:bg-green-50">
                      <UserCheck className="w-4 h-4 mr-1" /> Enable
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => handleStatusChange(user.id, 'DISABLED')} className="text-red-600 hover:bg-red-50">
                      <UserX className="w-4 h-4 mr-1" /> Disable
                    </Button>
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
