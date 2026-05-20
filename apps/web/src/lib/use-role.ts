'use client'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  return {
    role: 'owner' as Role,
    canEdit: true,
    canViewPayments: true,
  }
}
