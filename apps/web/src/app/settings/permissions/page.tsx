'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-helpers'
import { Button } from '@forge/ui'

export default function PermissionsPage() {
  const { data, mutate, isLoading } = useSWR('/api/settings/permissions', fetcher)
  const { data: roles } = useSWR('/api/settings/roles', fetcher)
  const [saving, setSaving] = useState(false)

  // Local state to track toggles before saving
  const [localChanges, setLocalChanges] = useState<Record<string, boolean>>({})

  if (isLoading || !roles || !data) return <div className="p-4">Loading permissions...</div>

  const { permissions = [], rolePermissions = [] } = data || {}

  // Group permissions
  const groups: Record<string, any[]> = {}
  permissions.forEach((p: any) => {
    if (p.group) {
      if (!groups[p.group]) groups[p.group] = []
      groups[p.group]?.push(p)
    }
  })

  const hasPermission = (roleId: string, permissionId: string) => {
    const key = `${roleId}-${permissionId}`
    if (localChanges[key] !== undefined) return localChanges[key]
    return rolePermissions.some((rp: any) => rp.roleId === roleId && rp.permissionId === permissionId)
  }

  const togglePermission = (roleId: string, permissionId: string, roleName: string) => {
    if (roleName === 'OWNER') return // Owner is immutable
    const key = `${roleId}-${permissionId}`
    setLocalChanges(prev => ({ ...prev, [key]: !hasPermission(roleId, permissionId) }))
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      // Group changes by role
      const rolesToUpdate = new Set(Object.keys(localChanges).map(k => k.split('-')[0]).filter((x): x is string => !!x))
      
      for (const roleId of Array.from(rolesToUpdate)) {
        // Build final list of permission IDs for this role
        const finalPermissionIds = permissions
          .filter((p: any) => p.id && hasPermission(roleId, p.id as string))
          .map((p: any) => p.id)
          .filter((id: string | undefined): id is string => !!id)
        
        await fetch('/api/settings/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId, permissionIds: finalPermissionIds })
        })
      }
      
      await mutate()
      setLocalChanges({})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Permission Matrix</h1>
        <Button onClick={saveChanges} disabled={saving || Object.keys(localChanges).length === 0}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-0 z-10">Permission</th>
              {roles.map((r: any) => (
                <th key={r.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groups).map(([groupName, perms]) => (
              <React.Fragment key={groupName}>
                <tr>
                  <td colSpan={roles.length + 1} className="bg-gray-100 px-6 py-2 text-sm font-semibold text-gray-800">
                    {groupName}
                  </td>
                </tr>
                {perms.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 bg-white sticky left-0 shadow-[1px_0_0_0_#e5e7eb]">
                      {p.module}: {p.action}
                    </td>
                    {roles.map((r: any) => (
                      <td key={r.id} className="px-6 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          checked={hasPermission(r.id, p.id as string)}
                          disabled={r.name === 'OWNER'}
                          onChange={() => togglePermission(r.id, p.id as string, r.name)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
