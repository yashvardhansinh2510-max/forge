'use client'

import * as React from 'react'

export type Role = 'owner' | 'manager' | 'worker'

export interface AuthContextValue {
  mode: 'clerk' | 'local'
  role: Role
  canEdit: boolean
  canViewPayments: boolean
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
}

export const localAuthValue: AuthContextValue = {
  mode: 'local',
  role: 'owner',
  canEdit: true,
  canViewPayments: true,
}

export const AuthContext = React.createContext<AuthContextValue>(localAuthValue)

export function useAuth() {
  return React.useContext(AuthContext)
}
