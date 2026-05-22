'use client'

import React, { createContext, useContext } from 'react'
import { useUser } from '@clerk/nextjs'

export type Role = 'owner' | 'manager' | 'worker'

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

type RoleValue = { role: Role; canEdit: boolean; canViewPayments: boolean }

const RoleContext = createContext<RoleValue>({
  role: 'owner',
  canEdit: true,
  canViewPayments: true,
})

// Rendered inside ClerkProvider only — reads Clerk user and feeds context
export function ClerkRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const role = ((user?.publicMetadata?.role as string | undefined) ?? 'owner') as Role
  return (
    <RoleContext.Provider value={{ role, canEdit: role !== 'worker', canViewPayments: role !== 'worker' }}>
      {children}
    </RoleContext.Provider>
  )
}

// Safe to call anywhere — falls back to owner defaults when Clerk is not configured
export function useRole(): RoleValue {
  return useContext(RoleContext)
}
