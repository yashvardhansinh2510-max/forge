'use client'

import * as React from 'react'
import { AuthContext, localAuthValue } from './auth-context'
import { UserContext, userContextDefaults } from '@/lib/user-context'

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={localAuthValue}>
      <UserContext.Provider value={userContextDefaults}>{children}</UserContext.Provider>
    </AuthContext.Provider>
  )
}
