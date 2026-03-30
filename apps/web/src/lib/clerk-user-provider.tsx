'use client'

// This file is only imported when Clerk is configured.
// It safely uses Clerk hooks inside a ClerkProvider tree.

import * as React from 'react'
import { useUser, useOrganization, useClerk } from '@clerk/nextjs'
import { UserContext, type UserContextValue } from './user-context'

export function ClerkUserProvider({ children }: { children: React.ReactNode }) {
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
  const orgName = organization?.name ?? 'Personal'

  const value: UserContextValue = {
    fullName,
    firstName,
    email,
    imageUrl,
    initials,
    orgName,
    signOut,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
