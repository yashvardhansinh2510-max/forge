'use client'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  WORKER: 'Worker',
  SALES: 'Sales',
  PROCUREMENT: 'Procurement',
  ACCOUNTS: 'Accounts',
  WAREHOUSE: 'Warehouse',
  VIEWER: 'Viewer',
  // lowercase aliases for hook consumers
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
