'use client'

// ─── usePurchasesStore — UI filter + selection state ─────────────────────────
//
// Manages the Purchase Tracker UI state:
//   viewMode         → Company View vs Customer View
//   activeBrand      → brand tab bar selection (ALL or specific brand)
//   activeCompanies  → vendor company filter ([] = all companies)
//   activeStatuses   → multi-select status pill array ([] = ALL)
//   selectedLineId   → which SKU line is open in the right detail panel
//   selectedPOId     → which PO is open (legacy, kept for compatibility)
//   activeCustomerId → which customer is selected in Customer View
//   expandedLineId   → which line item has customer box grid expanded
//   searchQuery      → product name / SKU search in Code Panel
//   highlightLineId  → line to scroll/highlight after SKU search navigation
//
// Data mutations live in procurement-store.ts.
// This store is UI-only — no writes to orders/allocations.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { POStatus } from '@/lib/mock/procurement-data'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode     = 'company' | 'customer'
export type StatusFilter = POStatus | 'ALL'
export type BrandFilter  = string   | 'ALL'

/** Keys matching the 7 KPI stat cards in TrackerKPIStrip */
export type KPICardKey =
  | 'totalOrdered'
  | 'pendingFromCo'
  | 'pendingFromDist'
  | 'atGodown'
  | 'inBox'
  | 'dispatched'
  | 'notDisplayed'

interface PurchasesUIState {
  viewMode:          ViewMode
  activeBrand:       BrandFilter
  /** Vendor company names filter. Empty array = all companies. */
  activeCompanies:   string[]
  /** Multi-select status filter. Empty array = ALL statuses. */
  activeStatuses:    StatusFilter[]
  /** Line item ID selected in right detail panel */
  selectedLineId:    string | null
  /** PO ID (legacy compatibility) */
  selectedPOId:      string | null
  activeCustomerId:  string | null
  /** Line item ID whose customer box grid is expanded inline */
  expandedLineId:    string | null
  searchQuery:       string
  /** True when search query ≥ 3 chars — shows results overlay */
  skuSearchActive:   boolean
  /** Line item to scroll/highlight in Right Panel after SKU search navigation */
  highlightLineId:   string | null
  // legacy compat
  expandedBoxItemId: string | null
  /** Which KPI card's drill-down panel is open (null = all closed) */
  openKPICard: KPICardKey | null
  /** When set, PartialMoveModal is open for this line */
  moveStageModal: { poId: string; lineId: string } | null
}

interface PurchasesUIActions {
  setViewMode:        (mode: ViewMode)           => void
  setActiveBrand:     (brand: BrandFilter)       => void
  /** Toggle a vendor company in the filter. */
  toggleCompany:      (company: string)          => void
  setAllCompanies:    (companies: string[])       => void
  clearCompanies:     ()                         => void
  /** Toggle a status in the multi-select. ALL clears others. */
  toggleStatus:       (status: StatusFilter)     => void
  setStatuses:        (statuses: StatusFilter[]) => void
  clearStatuses:      ()                         => void
  /** Select a line item to show in the right detail panel */
  setSelectedLine:    (lineId: string | null)    => void
  selectPO:           (id: string | null)        => void
  setActiveCustomer:  (id: string | null)        => void
  /** Toggle inline expanded customer box grid for a line item */
  toggleExpandedLine: (lineId: string)           => void
  expandBoxItem:      (lineItemId: string | null) => void
  setSearch:          (q: string)                => void
  clearSearch:        ()                         => void
  openPOAtLine:       (poId: string, lineId: string) => void
  /** Toggle a KPI card drill-down panel (clicking same card closes it) */
  toggleKPICard:      (card: KPICardKey) => void
  closeKPICard:       ()                => void
  openMoveStageModal:  (poId: string, lineId: string) => void
  closeMoveStageModal: ()               => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePurchasesStore = create<PurchasesUIState & PurchasesUIActions>()(
  immer((set) => ({
    viewMode:          'company',
    activeBrand:       'ALL',
    activeCompanies:   [],
    activeStatuses:    [],
    selectedLineId:    null,
    selectedPOId:      null,
    activeCustomerId:  null,
    expandedLineId:    null,
    searchQuery:       '',
    skuSearchActive:   false,
    highlightLineId:   null,
    expandedBoxItemId: null,
    openKPICard:       null,
    moveStageModal:    null,

    setViewMode: (mode) =>
      set((s) => { s.viewMode = mode }),

    setActiveBrand: (brand) =>
      set((s) => {
        s.activeBrand      = brand
        s.selectedLineId   = null
        s.selectedPOId     = null
        s.highlightLineId  = null
        s.expandedLineId   = null
        s.activeCompanies  = []
      }),

    toggleCompany: (company) =>
      set((s) => {
        const idx = s.activeCompanies.indexOf(company)
        if (idx === -1) {
          s.activeCompanies.push(company)
        } else {
          s.activeCompanies.splice(idx, 1)
        }
      }),

    setAllCompanies: (companies) =>
      set((s) => { s.activeCompanies = companies }),

    clearCompanies: () =>
      set((s) => { s.activeCompanies = [] }),

    toggleStatus: (status) =>
      set((s) => {
        if (status === 'ALL') {
          s.activeStatuses = []
          return
        }
        const idx = s.activeStatuses.indexOf(status)
        if (idx === -1) {
          s.activeStatuses = s.activeStatuses.filter((x) => x !== 'ALL').concat(status)
        } else {
          s.activeStatuses.splice(idx, 1)
        }
      }),

    setStatuses: (statuses) =>
      set((s) => { s.activeStatuses = statuses }),

    clearStatuses: () =>
      set((s) => { s.activeStatuses = [] }),

    setSelectedLine: (lineId) =>
      set((s) => {
        s.selectedLineId  = lineId
        s.skuSearchActive = false
      }),

    selectPO: (id) =>
      set((s) => {
        s.selectedPOId     = id
        s.highlightLineId  = null
        s.skuSearchActive  = false
        s.expandedBoxItemId = null
      }),

    setActiveCustomer: (id) =>
      set((s) => {
        s.activeCustomerId = id
        s.selectedLineId   = null
        s.selectedPOId     = null
        s.highlightLineId  = null
      }),

    toggleExpandedLine: (lineId) =>
      set((s) => {
        s.expandedLineId = s.expandedLineId === lineId ? null : lineId
      }),

    expandBoxItem: (lineItemId) =>
      set((s) => {
        s.expandedBoxItemId = s.expandedBoxItemId === lineItemId ? null : lineItemId
      }),

    setSearch: (q) =>
      set((s) => {
        s.searchQuery     = q
        s.skuSearchActive = q.trim().length >= 3
      }),

    clearSearch: () =>
      set((s) => {
        s.searchQuery     = ''
        s.skuSearchActive = false
      }),

    openPOAtLine: (poId, lineId) =>
      set((s) => {
        s.selectedPOId    = poId
        s.selectedLineId  = lineId
        s.highlightLineId = lineId
        s.skuSearchActive = false
        s.searchQuery     = ''
      }),

    toggleKPICard: (card) =>
      set((s) => {
        s.openKPICard = s.openKPICard === card ? null : card
      }),

    closeKPICard: () =>
      set((s) => { s.openKPICard = null }),

    openMoveStageModal: (poId, lineId) =>
      set((s) => { s.moveStageModal = { poId, lineId } }),

    closeMoveStageModal: () =>
      set((s) => { s.moveStageModal = null }),
  })),
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useViewMode          = () => usePurchasesStore((s) => s.viewMode)
export const useActiveBrand       = () => usePurchasesStore((s) => s.activeBrand)
export const useActiveCompanies   = () => usePurchasesStore((s) => s.activeCompanies)
export const useActiveStatuses    = () => usePurchasesStore((s) => s.activeStatuses)
export const useSelectedLineId    = () => usePurchasesStore((s) => s.selectedLineId)
export const useSelectedPOId      = () => usePurchasesStore((s) => s.selectedPOId)
export const useSearchQuery       = () => usePurchasesStore((s) => s.searchQuery)
export const useSkuSearch         = () => usePurchasesStore((s) => s.skuSearchActive)
export const useHighlightLine     = () => usePurchasesStore((s) => s.highlightLineId)
export const useActiveCustomerId  = () => usePurchasesStore((s) => s.activeCustomerId)
export const useExpandedLineId    = () => usePurchasesStore((s) => s.expandedLineId)
export const useExpandedBoxItemId = () => usePurchasesStore((s) => s.expandedBoxItemId)
export const useOpenKPICard       = () => usePurchasesStore((s) => s.openKPICard)

export const useStatusActive = (status: StatusFilter) =>
  usePurchasesStore((s) =>
    s.activeStatuses.length === 0 || s.activeStatuses.includes(status),
  )
