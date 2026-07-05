'use client'

import * as React from 'react'
import { useClerk, useOrganization, useUser } from '@clerk/nextjs'
import { AuthContext, type AuthContextValue, type Role } from './auth-context'
import { UserContext, type UserContextValue } from '@/lib/user-context'

function normalizeRole(role: unknown): Role {
  return role === 'owner' || role === 'manager' || role === 'worker' ? role : 'worker'
}

export function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { organization } = useOrganization()
  const { signOut } = useClerk()

  const fullName = user?.fullName ?? 'User'
  const firstName = user?.firstName ?? ''
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const imageUrl = user?.imageUrl ?? null
  const initials = (
    (fullName.split(' ')[0]?.[0] ?? '') + (fullName.split(' ')[1]?.[0] ?? '')
  ).toUpperCase() || 'U'

  const shellUser: UserContextValue = {
    fullName,
    firstName,
    email,
    imageUrl,
    initials,
    orgName: organization?.name ?? 'Personal',
    signOut,
  }

  const role = normalizeRole(user?.publicMetadata?.role)
  const auth: AuthContextValue = {
    mode: 'clerk',
    role,
    canEdit: role !== 'worker',
    canViewPayments: role !== 'worker',
  }

  return (
    <AuthContext.Provider value={auth}>
      <UserContext.Provider value={shellUser}>{children}</UserContext.Provider>
    </AuthContext.Provider>
  )
}
