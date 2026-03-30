'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  MOCK_PURCHASES,
  FUNNEL_STAGES,
  type PurchaseOrder,
  type PurchaseStatus,
  type FunnelStage,
} from '@/lib/mock/purchases-data'

interface PurchasesState {
  orders: PurchaseOrder[]
}

interface PurchasesActions {
  addOrder: (order: PurchaseOrder) => void
  updateBrandStage: (poId: string, brand: string, stage: FunnelStage) => void
  updateBrandDetails: (
    poId: string,
    brand: string,
    patches: Partial<{ poNumber: string; vendorOrderRef: string; expectedDeliveryDate: string; notes: string }>
  ) => void
  updateBrandQty: (poId: string, brand: string, field: 'receivedQty' | 'shippedToClientQty', delta: number) => void
  updatePOStatus: (poId: string, status: PurchaseStatus) => void
  updatePONotes: (poId: string, notes: string) => void
}

// Derive PO status from brand stages
function deriveStatus(order: PurchaseOrder): PurchaseStatus {
  if (order.status === 'cancelled') return 'cancelled'
  const stages = order.brands.map((b) => b.stage)
  if (stages.every((s) => s === 'delivered')) return 'fulfilled'
  if (stages.some((s) => s !== 'pending')) return 'partial'
  return order.status === 'draft' ? 'draft' : 'confirmed'
}

export const usePurchasesStore = create<PurchasesState & PurchasesActions>()(
  immer((set) => ({
    orders: MOCK_PURCHASES,

    addOrder: (order) =>
      set((s) => {
        s.orders.unshift(order)
      }),

    updateBrandStage: (poId, brand, stage) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const bf = po.brands.find((b) => b.brand === brand)
        if (!bf) return
        bf.stage = stage
        // Auto-update qty when reaching godown
        if (stage === 'at_godown' && bf.receivedQty === 0) {
          bf.receivedQty = bf.items.reduce((sum, i) => sum + i.quantity, 0)
        }
        // Auto-update shipped when delivered
        if (stage === 'delivered') {
          const totalQty = bf.items.reduce((sum, i) => sum + i.quantity, 0)
          bf.shippedToClientQty = totalQty
        }
        po.status = deriveStatus(po as PurchaseOrder)
        po.updatedAt = new Date().toISOString()
      }),

    updateBrandDetails: (poId, brand, patches) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const bf = po.brands.find((b) => b.brand === brand)
        if (!bf) return
        if (patches.poNumber !== undefined) bf.poNumber = patches.poNumber || null
        if (patches.vendorOrderRef !== undefined) bf.vendorOrderRef = patches.vendorOrderRef || null
        if (patches.expectedDeliveryDate !== undefined) bf.expectedDeliveryDate = patches.expectedDeliveryDate || null
        if (patches.notes !== undefined) bf.notes = patches.notes
        po.updatedAt = new Date().toISOString()
      }),

    updateBrandQty: (poId, brand, field, delta) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const bf = po.brands.find((b) => b.brand === brand)
        if (!bf) return
        const totalQty = bf.items.reduce((sum, i) => sum + i.quantity, 0)
        bf[field] = Math.max(0, Math.min(totalQty, bf[field] + delta))
        // Auto-advance stage based on qty
        if (field === 'receivedQty' && bf[field] > 0 && bf.stage === 'ordered') {
          bf.stage = 'at_godown'
        }
        if (field === 'shippedToClientQty') {
          if (bf[field] >= totalQty) {
            bf.stage = 'delivered'
          } else if (bf[field] > 0) {
            bf.stage = 'partially_shipped'
          }
        }
        po.status = deriveStatus(po as PurchaseOrder)
        po.updatedAt = new Date().toISOString()
      }),

    updatePOStatus: (poId, status) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        po.status = status
        po.updatedAt = new Date().toISOString()
      }),

    updatePONotes: (poId, notes) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        po.internalNotes = notes
        po.updatedAt = new Date().toISOString()
      }),
  }))
)

// Re-export for convenience
export { FUNNEL_STAGES }
