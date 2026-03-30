'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  CUSTOMER_ACCOUNTS,
  PAYMENT_RECORDS,
  type CustomerAccount,
  type CustomerPaymentRecord,
  type PaymentMode,
} from '@/lib/mock/payments-data'

// ─── State / Actions ──────────────────────────────────────────────────────────

interface PaymentsState {
  accounts:    CustomerAccount[]
  payments:    CustomerPaymentRecord[]
  selectedId:  string | null
  activeTab:   'customer' | 'company'
  yearFilter:  number
  monthFilter: number | null   // 1–12 or null = all
  searchQuery: string
  sortBy:      'name' | 'pending' | 'lastPayment'
}

interface PaymentsActions {
  setSelectedId:  (id: string | null) => void
  setActiveTab:   (tab: 'customer' | 'company') => void
  setYearFilter:  (year: number) => void
  setMonthFilter: (month: number | null) => void
  setSearchQuery: (q: string) => void
  setSortBy:      (sort: 'name' | 'pending' | 'lastPayment') => void
  recordPayment:  (
    customerId: string,
    brand:      string,
    amount:     number,
    mode:       PaymentMode,
    reference:  string | null,
    note:       string | null,
  ) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePaymentsStore = create<PaymentsState & PaymentsActions>()(
  immer((set) => ({
    accounts:    CUSTOMER_ACCOUNTS,
    payments:    PAYMENT_RECORDS,
    selectedId:  'proj-005',
    activeTab:   'customer',
    yearFilter:  2026,
    monthFilter: null,
    searchQuery: '',
    sortBy:      'pending',

    setSelectedId:  (id)    => set((s) => { s.selectedId  = id }),
    setActiveTab:   (tab)   => set((s) => { s.activeTab   = tab }),
    setYearFilter:  (year)  => set((s) => { s.yearFilter  = year }),
    setMonthFilter: (month) => set((s) => { s.monthFilter = month }),
    setSearchQuery: (q)     => set((s) => { s.searchQuery = q }),
    setSortBy:      (sort)  => set((s) => { s.sortBy      = sort }),

    recordPayment: (customerId, brand, amount, mode, reference, note) =>
      set((s) => {
        const customerName = s.accounts.find(a => a.customerId === customerId)?.customerName ?? ''
        const today = new Date().toISOString().split('T')[0] ?? new Date().toDateString()

        const newRecord: CustomerPaymentRecord = {
          id:           `pay-${Date.now()}`,
          customerId,
          customerName,
          brand,
          amount,
          mode,
          reference,
          paidAt:       today,
          note,
          recordedBy:   'Buildcon Team',
        }

        // Prepend so it appears at top of history
        s.payments.unshift(newRecord)

        // Update received in the account
        const account = s.accounts.find(a => a.customerId === customerId)
        if (!account) return
        const ba = account.brandAccounts.find(b => b.brand === brand)
        if (ba) ba.received = Math.min(ba.billed, ba.received + amount)
      }),
  })),
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useSelectedAccount = () =>
  usePaymentsStore((s) => s.accounts.find(a => a.customerId === s.selectedId) ?? null)

export const usePaymentsForCustomer = (customerId: string) =>
  usePaymentsStore((s) => s.payments.filter(p => p.customerId === customerId))
