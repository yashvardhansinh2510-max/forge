'use client'

import * as React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserContextValue {
  fullName: string
  firstName: string
  email: string
  imageUrl: string | null
  initials: string
  orgName: string
  signOut: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const userContextDefaults: UserContextValue = {
  fullName: 'User',
  firstName: '',
  email: '',
  imageUrl: null,
  initials: 'U',
  orgName: 'Personal',
  signOut: () => {},
}

export const UserContext = React.createContext<UserContextValue>(userContextDefaults)

export function useShellUser() {
  return React.useContext(UserContext)
}

// ─── Default provider (no Clerk) ──────────────────────────────────────────────

export function DefaultUserProvider({ children }: { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={userContextDefaults}>{children}</UserContext.Provider>
  )
}
