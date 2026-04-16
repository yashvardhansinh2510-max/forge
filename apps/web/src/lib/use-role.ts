'use client'

import { useUser } from '@clerk/nextjs'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  const { user } = useUser()
  const role = ((user?.publicMetadata?.role as string | undefined) ?? 'worker') as Role

  return {
    role,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
  }
}
