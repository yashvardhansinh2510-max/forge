'use client'

import { create } from 'zustand'

interface POSSeriesState {
  selectedSeries: string | null
  setSelectedSeries: (series: string | null) => void
}

export const usePOSSeriesStore = create<POSSeriesState>()((set) => ({
  selectedSeries: null,
  setSelectedSeries: (series) => set({ selectedSeries: series }),
}))
