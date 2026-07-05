'use client'

import React, { createContext, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { type AppRole, type Permission, hasPermission, normalizeRole } from './permissions'

// Re-export for backward compat
export type { AppRole }
export type Role = AppRole

export { hasPermission, normalizeRole }

export { ROLE_LABELS } from './permissions'

type RoleValue = {
  role: AppRole
  /** Quick permission check — use inside components */
  can: (perm: Permission) => boolean
  /** Legacy convenience booleans */
  canEdit: boolean
  canViewPayments: boolean
}

const RoleContext = createContext<RoleValue>({
  role: 'OWNER',
  can: () => true,
  canEdit: true,
  canViewPayments: true,
})

export function ClerkRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const raw = (user?.publicMetadata?.role as string | undefined) ?? 'OWNER'
  const role = normalizeRole(raw)

  const value: RoleValue = {
    role,
    can: (perm) => hasPermission(role, perm),
    canEdit: hasPermission(role, 'can_move_stage'),
    canViewPayments: hasPermission(role, 'can_view_payments'),
  }

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleValue {
  return useContext(RoleContext)
}

/** Convenience hook — returns true if current user has permission */
export function usePermission(perm: Permission): boolean {
  const { can } = useContext(RoleContext)
  return can(perm)
}
