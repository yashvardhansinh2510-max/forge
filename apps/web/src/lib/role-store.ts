import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'owner' | 'manager' | 'worker'

interface RoleState {
  role: Role
  setRole: (role: Role) => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'owner',
      setRole: (role) => set({ role }),
    }),
    { name: 'forge-role' }
  )
)
