'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  MOCK_PURCHASE_ORDERS,
  MOCK_INVENTORY_BOXES,
  LEGAL_TRANSITIONS,
  type MockPurchaseOrder,
  type MockPOLineItem,
  type MockInventoryBox,
  type MockInventoryBoxItem,
  type MockDispatchRecord,
  type POStatus,
  type POMode,
  type POLineStatus,
  type POStage,
  type RecipientRole,
  type DraftPOLine,
  type BoxItemStatus,
  type BoxAllocationStatus,
  type CustomerAllocation,
} from '@/lib/mock/procurement-data'
import type { POSProduct } from '@/lib/mock/pos-data'

// ─── Draft PO State ─────────────────────────────────────────────────────────

interface DraftPO {
  mode:       POMode | null
  projectId:  string | null
  projectName: string | null
  revisionId: string | null
  vendorName: string | null
  lines:      DraftPOLine[]
}

const EMPTY_DRAFT: DraftPO = {
  mode: null, projectId: null, projectName: null,
  revisionId: null, vendorName: null, lines: [],
}

// ─── Store Types ────────────────────────────────────────────────────────────

interface ProcurementState {
  orders:        MockPurchaseOrder[]
  boxes:         MockInventoryBox[]
  draftPO:       DraftPO
  sidebarOpen:   boolean
  activeOrderId: string | null
}

interface ProcurementActions {
  // Draft PO
  openDraft:    (mode: POMode, opts?: { projectId?: string; projectName?: string; revisionId?: string; vendorName?: string }) => void
  closeDraft:   () => void
  addLine:      (product: POSProduct, qty: number, clientOfferRate?: number, roomName?: string) => void
  updateLine:   (productId: string, patch: Partial<Pick<DraftPOLine, 'qty' | 'landingCost'>>) => void
  removeLine:   (productId: string) => void
  clearDraft:   () => void
  submitDraft:  () => Promise<void>

  // PO list
  setActiveOrder: (id: string | null) => void
  updatePOStatus: (id: string, status: POStatus) => void

  // Box operations (optimistic)
  dispatchBoxItem: (boxId: string, itemId: string, qty: number) => void

  // Full dispatch with audit record (optimistic — mirrors the API body)
  addDispatchRecord: (
    boxId: string,
    itemId: string,
    payload: {
      qty:            number
      recipientName?: string
      recipientRole?: RecipientRole
      customNote?:    string
    },
  ) => void

  // Inline editing — PO header fields
  updatePOField: (
    poId: string,
    patch: Partial<Pick<MockPurchaseOrder, 'status' | 'vendorName' | 'notes' | 'expectedDelivery' | 'landingCostTotal'>>,
  ) => void

  // Inline editing — line items
  updateLineItem: (
    poId: string,
    lineId: string,
    patch: Partial<Pick<MockPOLineItem, 'productSku' | 'productName' | 'qtyOrdered' | 'qtyReceived' | 'landingCost' | 'clientOfferRate' | 'status'>>,
  ) => void

  // Add a blank line item to a DRAFT PO
  addLineItem: (poId: string, line: Omit<MockPOLineItem, 'id'>) => void

  // ── Tracker: allocation mutations ─────────────────────────────────────────

  /** Update a customer allocation's box status */
  updateAllocationStatus: (
    poId: string,
    lineId: string,
    customerId: string,
    status: BoxAllocationStatus,
  ) => void

  /** Update a customer allocation's scheduled delivery date */
  updateAllocationDelivery: (
    poId: string,
    lineId: string,
    customerId: string,
    date: string | null,
  ) => void

  /** Update the custom note on a GIVEN_OTHER allocation */
  updateAllocationNote: (
    poId: string,
    lineId: string,
    customerId: string,
    note: string,
  ) => void

  /** Update how many units of a line item have been received at godown */
  updateLineQtyReceived: (poId: string, lineId: string, qty: number) => void

  /** Add a new customer allocation to a line item */
  addCustomerAllocation: (
    poId: string,
    lineId: string,
    allocation: CustomerAllocation,
  ) => void

  /**
   * Move qty units of a line item from one stage to the next.
   * Mirrors the server-side move-stage API for optimistic mock updates.
   * Returns an error string if the move is invalid, or null on success.
   */
  moveStage: (
    poId:      string,
    lineId:    string,
    fromStage: 'ORDERED' | POStage,
    toStage:   POStage,
    qty:       number,
  ) => string | null
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useProcurementStore = create<ProcurementState & ProcurementActions>()(
  immer((set, get) => ({
    orders:        MOCK_PURCHASE_ORDERS,
    boxes:         MOCK_INVENTORY_BOXES,
    draftPO:       EMPTY_DRAFT,
    sidebarOpen:   false,
    activeOrderId: null,

    // ── Draft PO ────────────────────────────────────────────────────────────

    openDraft: (mode, opts = {}) =>
      set((s) => {
        s.draftPO = {
          mode,
          projectId:  opts.projectId  ?? null,
          projectName: opts.projectName ?? null,
          revisionId: opts.revisionId ?? null,
          vendorName: opts.vendorName ?? null,
          lines: s.draftPO.lines,  // preserve any pre-loaded lines
        }
        s.sidebarOpen = true
      }),

    closeDraft: () =>
      set((s) => { s.sidebarOpen = false }),

    addLine: (product, qty, clientOfferRate, roomName) =>
      set((s) => {
        const existing = s.draftPO.lines.find((l) => l.productId === product.id)
        if (existing) {
          existing.qty += qty
        } else {
          s.draftPO.lines.push({
            productId:       product.id,
            product,
            qty,
            landingCost:     null,
            clientOfferRate: clientOfferRate ?? null,
            roomName,
          })
        }
        s.sidebarOpen = true
      }),

    updateLine: (productId, patch) =>
      set((s) => {
        const line = s.draftPO.lines.find((l) => l.productId === productId)
        if (!line) return
        if (patch.qty          !== undefined) line.qty          = patch.qty
        if (patch.landingCost  !== undefined) line.landingCost  = patch.landingCost
      }),

    removeLine: (productId) =>
      set((s) => {
        s.draftPO.lines = s.draftPO.lines.filter((l) => l.productId !== productId)
      }),

    clearDraft: () =>
      set((s) => { s.draftPO = EMPTY_DRAFT; s.sidebarOpen = false }),

    submitDraft: async () => {
      const { draftPO } = get()
      if (!draftPO.mode || draftPO.lines.length === 0) return

      // Optimistic insert as SUBMITTED
      const newOrder: MockPurchaseOrder = {
        id:        `po-${Date.now()}`,
        poNumber:  `PO-${new Date().getFullYear()}-${String(get().orders.length + 1).padStart(4, '0')}`,
        mode:      draftPO.mode,
        status:    'SUBMITTED',
        projectId:        draftPO.projectId,
        projectName:      draftPO.projectName,
        clientName:       null,
        revisionId:       draftPO.revisionId,
        vendorName:       draftPO.vendorName,
        expectedDelivery: null,
        notes:            '',
        landingCostTotal: null,
        lineItems: draftPO.lines.map((l, i) => ({
          id:                  `line-new-${i}`,
          productId:           l.productId,
          productName:         l.product.name,
          productSku:          l.product.sku,
          productBrand:        l.product.brand,
          productImage:        '',
          qtyOrdered:          l.qty,
          qtyReceived:         0,
          landingCost:         l.landingCost,
          clientOfferRate:     l.clientOfferRate,
          status:              'PENDING' as const,
          customerAllocations: [],
          qtyPendingCo:        0,
          qtyPendingDist:      0,
          qtyAtGodown:         0,
          qtyInBox:            0,
          qtyDispatched:       0,
          qtyNotDisplayed:     0,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      set((s) => {
        s.orders.unshift(newOrder)
        s.draftPO       = EMPTY_DRAFT
        s.sidebarOpen   = false
        s.activeOrderId = newOrder.id
      })
    },

    // ── PO list ─────────────────────────────────────────────────────────────

    setActiveOrder: (id) =>
      set((s) => { s.activeOrderId = id }),

    updatePOStatus: (id, status) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === id)
        if (po) { po.status = status; po.updatedAt = new Date().toISOString() }
      }),

    // ── Box operations ───────────────────────────────────────────────────────

    dispatchBoxItem: (boxId, itemId, qty) =>
      set((s) => {
        const box = s.boxes.find((b) => b.id === boxId)
        if (!box) return
        const item = box.items.find((i) => i.id === itemId)
        if (!item) return

        const newQty = Math.min(item.qtyTotal, item.qtyDispatched + qty)
        item.qtyDispatched = newQty
        item.status = (newQty >= item.qtyTotal
          ? 'FULLY_DISPATCHED'
          : 'PARTIALLY_DISPATCHED') as BoxItemStatus
      }),

    addDispatchRecord: (boxId, itemId, payload) =>
      set((s) => {
        const box = s.boxes.find((b) => b.id === boxId)
        if (!box) return
        const item = box.items.find((i) => i.id === itemId)
        if (!item) return

        const baseUnitIndex = item.qtyDispatched
        const now = new Date().toISOString()

        for (let i = 0; i < payload.qty; i++) {
          const record: MockDispatchRecord = {
            id:                `dr-${Date.now()}-${i}`,
            unitIndex:         baseUnitIndex + i + 1,
            recipientName:     payload.recipientName ?? 'Client',
            recipientRole:     payload.recipientRole ?? 'CLIENT',
            customNote:        payload.customNote ?? null,
            isCustomRecipient: !!(payload.recipientName),
            dispatchedAt:      now,
            dispatchedBy:      'Buildcon Team',
          }
          item.dispatchRecords.push(record)
        }

        const newQty = Math.min(item.qtyTotal, item.qtyDispatched + payload.qty)
        item.qtyDispatched = newQty
        item.status = (newQty >= item.qtyTotal
          ? 'FULLY_DISPATCHED'
          : 'PARTIALLY_DISPATCHED') as BoxItemStatus
      }),

    // ── PO header inline editing ─────────────────────────────────────────────

    updatePOField: (poId, patch) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        if (patch.status           !== undefined) po.status           = patch.status
        if (patch.vendorName       !== undefined) po.vendorName       = patch.vendorName
        if (patch.notes            !== undefined) po.notes            = patch.notes
        if (patch.expectedDelivery !== undefined) po.expectedDelivery = patch.expectedDelivery
        if (patch.landingCostTotal !== undefined) po.landingCostTotal = patch.landingCostTotal
        po.updatedAt = new Date().toISOString()
      }),

    // ── Line item inline editing ─────────────────────────────────────────────

    updateLineItem: (poId, lineId, patch) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        if (patch.productSku      !== undefined) line.productSku      = patch.productSku
        if (patch.productName     !== undefined) line.productName     = patch.productName
        if (patch.qtyOrdered      !== undefined) line.qtyOrdered      = Math.max(1, patch.qtyOrdered)
        if (patch.qtyReceived     !== undefined) line.qtyReceived     = Math.max(0, Math.min(line.qtyOrdered, patch.qtyReceived))
        if (patch.landingCost     !== undefined) line.landingCost     = patch.landingCost
        if (patch.clientOfferRate !== undefined) line.clientOfferRate = patch.clientOfferRate
        if (patch.status          !== undefined) line.status          = patch.status as POLineStatus
        po.updatedAt = new Date().toISOString()
      }),

    // ── Add line item to a DRAFT PO ──────────────────────────────────────────

    addLineItem: (poId, line) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        po.lineItems.push({
          ...line,
          id: `line-new-${Date.now()}`,
        })
        po.updatedAt = new Date().toISOString()
      }),

    // ── Tracker allocation mutations ─────────────────────────────────────────

    updateAllocationStatus: (poId, lineId, customerId, status) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        const alloc = line.customerAllocations.find((a) => a.customerId === customerId)
        if (!alloc) return
        alloc.boxStatus = status
        if (status !== 'GIVEN_OTHER') alloc.customNote = null
        po.updatedAt = new Date().toISOString()
      }),

    updateAllocationDelivery: (poId, lineId, customerId, date) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        const alloc = line.customerAllocations.find((a) => a.customerId === customerId)
        if (!alloc) return
        alloc.scheduledDelivery = date
        po.updatedAt = new Date().toISOString()
      }),

    updateAllocationNote: (poId, lineId, customerId, note) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        const alloc = line.customerAllocations.find((a) => a.customerId === customerId)
        if (!alloc) return
        alloc.customNote = note
        po.updatedAt = new Date().toISOString()
      }),

    updateLineQtyReceived: (poId, lineId, qty) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        const clamped = Math.max(0, Math.min(line.qtyOrdered, qty))
        line.qtyReceived = clamped
        line.status = clamped === 0
          ? 'PENDING'
          : clamped >= line.qtyOrdered
            ? 'FULLY_RECEIVED'
            : 'PARTIALLY_RECEIVED'
        po.updatedAt = new Date().toISOString()
      }),

    addCustomerAllocation: (poId, lineId, allocation) =>
      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) return
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) return
        const existing = line.customerAllocations.find((a) => a.customerId === allocation.customerId)
        if (existing) {
          existing.qty += allocation.qty
        } else {
          line.customerAllocations.push(allocation)
        }
        po.updatedAt = new Date().toISOString()
      }),

    // ── Stage movement ───────────────────────────────────────────────────────

    moveStage: (poId, lineId, fromStage, toStage, qty) => {
      // Validate legal transition
      const legal = LEGAL_TRANSITIONS[fromStage] as POStage[]
      if (!legal.includes(toStage)) {
        return `Cannot move from ${fromStage} to ${toStage}`
      }
      if (qty < 1) return 'Quantity must be at least 1'

      const STAGE_FIELD: Record<'ORDERED' | POStage, keyof MockPOLineItem | null> = {
        ORDERED:       null,
        PENDING_CO:    'qtyPendingCo',
        PENDING_DIST:  'qtyPendingDist',
        AT_GODOWN:     'qtyAtGodown',
        IN_BOX:        'qtyInBox',
        DISPATCHED:    'qtyDispatched',
        NOT_DISPLAYED: 'qtyNotDisplayed',
      }

      let error: string | null = null

      set((s) => {
        const po = s.orders.find((o) => o.id === poId)
        if (!po) { error = 'PO not found'; return }
        const line = po.lineItems.find((l) => l.id === lineId)
        if (!line) { error = 'Line not found'; return }

        // Compute available qty at fromStage
        let available: number
        if (fromStage === 'ORDERED') {
          const staged = line.qtyPendingCo + line.qtyPendingDist + line.qtyAtGodown +
                         line.qtyInBox + line.qtyDispatched + line.qtyNotDisplayed
          available = line.qtyOrdered - staged
        } else {
          const f = STAGE_FIELD[fromStage] as keyof MockPOLineItem
          available = line[f] as number
        }

        if (qty > available) {
          error = `Only ${available} unit(s) available at ${fromStage}`
          return
        }

        // Apply movement
        if (fromStage !== 'ORDERED') {
          const f = STAGE_FIELD[fromStage] as keyof MockPOLineItem
          ;(line[f] as number) -= qty
        }
        const t = STAGE_FIELD[toStage] as keyof MockPOLineItem
        ;(line[t] as number) += qty

        po.updatedAt = new Date().toISOString()
      })

      return error
    },
  })),
)

// ─── Selectors ──────────────────────────────────────────────────────────────

export const useDraftLines     = () => useProcurementStore((s) => s.draftPO.lines)
export const useDraftLineCount = () => useProcurementStore((s) => s.draftPO.lines.length)
export const useSidebarOpen    = () => useProcurementStore((s) => s.sidebarOpen)
