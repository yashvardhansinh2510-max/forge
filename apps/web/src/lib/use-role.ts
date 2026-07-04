'use client'

import { useUser, useClerk } from '@clerk/nextjs'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export function useRole() {
  // Check if Clerk is configured and user is loaded
  const { user, isLoaded } = useUser()
  const clerk = useClerk()

  // If Clerk is not configured or user isn't loaded yet, return default worker role
  if (!isLoaded || !clerk.client) {
    return {
      role: 'worker' as Role,
      canEdit: false,
      canViewPayments: false,
    }
  }

  const role = ((user?.publicMetadata?.role as string | undefined) ?? 'worker') as Role

  return {
    role,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
  }
}
