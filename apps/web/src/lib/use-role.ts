'use client'

import { ROLE_LABELS, useAuth, type Role } from './auth/auth-context'

export { ROLE_LABELS }
export type { Role }

export function useRole() {
  return useAuth()
}
