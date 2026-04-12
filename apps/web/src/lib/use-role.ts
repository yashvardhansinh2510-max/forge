'use client'

import { useRoleStore, type Role } from './role-store'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  const { role, setRole } = useRoleStore()
  return {
    role,
    setRole,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
    canSwitchRole: role !== 'worker',
  }
}
