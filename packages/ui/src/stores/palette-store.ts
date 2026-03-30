'use client'

import { create } from 'zustand'

interface PaletteState {
  isOpen: boolean
  query: string
  open: () => void
  close: () => void
  toggle: () => void
  setQuery: (query: string) => void
}

export const usePaletteStore = create<PaletteState>()((set) => ({
  isOpen: false,
  query: '',
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => set((state) => (state.isOpen ? { isOpen: false, query: '' } : { isOpen: true })),
  setQuery: (query) => set({ query }),
}))
