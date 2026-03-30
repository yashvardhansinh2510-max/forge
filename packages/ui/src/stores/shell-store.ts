'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShellState {
  sidebarCollapsed: boolean
  _hasHydrated: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      _hasHydrated: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'forge_shell',
      skipHydration: true,
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => () => {
        useShellStore.setState({ _hasHydrated: true })
      },
    },
  ),
)
