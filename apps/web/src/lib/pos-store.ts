'use client'

import * as React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  type POSProduct,
  type Finish,
  getBundledParts,
  getDefaultFinish,
} from '@/lib/mock/pos-data'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RoomItem {
  id: string
  product: POSProduct
  finish: Finish
  quantity: number
  itemDiscount: number    // per-item % discount (0-60)
  isAutoAdded: boolean    // true = auto-bundled concealed part
  sortOrder: number
}

export interface Room {
  id: string
  name: string
  items: RoomItem[]
  sortOrder: number
  roomDiscount: number   // per-room/bathroom % discount (0-60)
}

export interface ActiveProject {
  id: string
  name: string
  clientName: string
  clientPhone: string    // customer contact number
  siteAddress: string    // site / delivery address
  referenceBy: string    // who referred this client
  globalDiscount: number
}

interface POSState {
  project: ActiveProject
  rooms: Room[]
  activeRoomId: string | null
  selectedBrand: string | null
  selectedCategory: string | null
  modalProduct: POSProduct | null
}

interface POSActions {
  // Project
  setProject: (project: ActiveProject) => void
  setGlobalDiscount: (pct: number) => void
  setClientName: (name: string) => void
  setClientPhone: (phone: string) => void
  setSiteAddress: (address: string) => void
  setReferenceBy: (ref: string) => void
  // Rooms
  addRoom: (name: string) => void
  removeRoom: (id: string) => void
  renameRoom: (id: string, name: string) => void
  setActiveRoom: (id: string) => void
  setRoomDiscount: (roomId: string, pct: number) => void
  reorderRooms: (fromIndex: number, toIndex: number) => void
  // Items
  addItemToActiveRoom: (product: POSProduct, finish: Finish, qty: number, includeConcealedParts?: boolean) => void
  removeItem: (roomId: string, itemId: string) => void
  updateItemQty: (roomId: string, itemId: string, delta: number) => void
  updateItemDiscount: (roomId: string, itemId: string, discount: number) => void
  reorderItems: (roomId: string, fromIndex: number, toIndex: number) => void
  moveItem: (fromRoomId: string, toRoomId: string, itemId: string) => void
  updateItemFinish: (roomId: string, itemId: string, finish: Finish) => void
  // Catalog
  setSelectedBrand: (brand: string | null) => void
  setSelectedCategory: (category: string | null) => void
  // Modal
  openModal: (product: POSProduct) => void
  closeModal: () => void
  // Reset
  resetBuilder: () => void
}

// ─── Initial State ─────────────────────────────────────────────────────────────

const DEFAULT_ROOMS: Room[] = [
  { id: 'room-1', name: 'Master Bathroom', items: [], sortOrder: 0, roomDiscount: 0 },
  { id: 'room-2', name: 'Guest Bathroom', items: [], sortOrder: 1, roomDiscount: 0 },
]

const DEFAULT_PROJECT: ActiveProject = {
  id: 'new-project',
  name: 'New Project',
  clientName: '',
  clientPhone: '',
  siteAddress: '',
  referenceBy: '',
  globalDiscount: 0,
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState & POSActions>()(
  persist(
    immer((set) => ({
      project: DEFAULT_PROJECT,
      rooms: DEFAULT_ROOMS,
      activeRoomId: 'room-1',
      selectedBrand: 'Grohe',
      selectedCategory: null,
      modalProduct: null,

      // ── Project ──────────────────────────────────────────────────────────
      setProject: (project) =>
        set((s) => { s.project = project }),

      setGlobalDiscount: (pct) =>
        set((s) => { s.project.globalDiscount = Math.max(0, Math.min(60, pct)) }),

      setClientName: (name) =>
        set((s) => { s.project.clientName = name }),

      setClientPhone: (phone) =>
        set((s) => { s.project.clientPhone = phone }),

      setSiteAddress: (address) =>
        set((s) => { s.project.siteAddress = address }),

      setReferenceBy: (ref) =>
        set((s) => { s.project.referenceBy = ref }),

      // ── Rooms ────────────────────────────────────────────────────────────
      addRoom: (name) =>
        set((s) => {
          const id = `room-${Date.now()}`
          s.rooms.push({ id, name, items: [], sortOrder: s.rooms.length, roomDiscount: 0 })
          s.activeRoomId = id
        }),

      removeRoom: (id) =>
        set((s) => {
          s.rooms = s.rooms.filter((r) => r.id !== id)
          if (s.activeRoomId === id) {
            s.activeRoomId = s.rooms[0]?.id ?? null
          }
        }),

      renameRoom: (id, name) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === id)
          if (room) room.name = name
        }),

      setActiveRoom: (id) =>
        set((s) => { s.activeRoomId = id }),

      setRoomDiscount: (roomId, pct) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          if (room) room.roomDiscount = Math.max(0, Math.min(60, pct))
        }),

      reorderRooms: (fromIndex, toIndex) =>
        set((s) => {
          const [moved] = s.rooms.splice(fromIndex, 1)
          if (moved) s.rooms.splice(toIndex, 0, moved)
          s.rooms.forEach((r, i) => { r.sortOrder = i })
        }),

      // ── Items ────────────────────────────────────────────────────────────
      addItemToActiveRoom: (product, finish, qty, includeConcealedParts = false) =>
        set((s) => {
          const roomId = s.activeRoomId
          if (!roomId) return
          const room = s.rooms.find((r) => r.id === roomId)
          if (!room) return

          // Same product + finish → increment qty
          const existing = room.items.find(
            (i) => i.product.id === product.id && i.finish.code === finish.code
          )
          if (existing) {
            existing.quantity += qty
            return
          }

          // Add main item
          room.items.push({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            product,
            finish,
            quantity: qty,
            itemDiscount: 0,
            isAutoAdded: false,
            sortOrder: room.items.length,
          })

          // Only bundle concealed parts if user explicitly opted in
          if (includeConcealedParts) {
            const parts = getBundledParts(product.id)
            for (const part of parts) {
              const alreadyHasPart = room.items.some((i) => i.product.id === part.id)
              if (alreadyHasPart) continue
              const partFinish = getDefaultFinish(part) ?? { name: '', code: '', color: '#9ca3af', priceAdj: 0 }
              room.items.push({
                id: `item-${Date.now()}-${part.id}`,
                product: part,
                finish: partFinish,
                quantity: 1,
                itemDiscount: 0,
                isAutoAdded: true,
                sortOrder: room.items.length,
              })
            }
          }
        }),

      removeItem: (roomId, itemId) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          if (room) room.items = room.items.filter((i) => i.id !== itemId)
        }),

      updateItemQty: (roomId, itemId, delta) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          const item = room?.items.find((i) => i.id === itemId)
          if (item) item.quantity = Math.max(1, item.quantity + delta)
        }),

      updateItemDiscount: (roomId, itemId, discount) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          const item = room?.items.find((i) => i.id === itemId)
          if (item) item.itemDiscount = Math.max(0, Math.min(60, discount))
        }),

      reorderItems: (roomId, fromIndex, toIndex) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          if (!room) return
          const mainItems = room.items.filter((i) => !i.isAutoAdded)
          const autoItems = room.items.filter((i) => i.isAutoAdded)
          const [moved] = mainItems.splice(fromIndex, 1)
          if (moved) mainItems.splice(toIndex, 0, moved)
          mainItems.forEach((item, i) => { item.sortOrder = i })
          room.items = [...mainItems, ...autoItems]
        }),

      moveItem: (fromRoomId, toRoomId, itemId) =>
        set((s) => {
          const fromRoom = s.rooms.find((r) => r.id === fromRoomId)
          const toRoom = s.rooms.find((r) => r.id === toRoomId)
          if (!fromRoom || !toRoom) return
          const itemIndex = fromRoom.items.findIndex((i) => i.id === itemId)
          if (itemIndex === -1) return
          const [item] = fromRoom.items.splice(itemIndex, 1)
          if (item) {
            item.sortOrder = toRoom.items.length
            toRoom.items.push(item)
          }
        }),

      updateItemFinish: (roomId, itemId, finish) =>
        set((s) => {
          const room = s.rooms.find((r) => r.id === roomId)
          const item = room?.items.find((i) => i.id === itemId)
          if (item) item.finish = finish
        }),

      // ── Catalog ──────────────────────────────────────────────────────────
      setSelectedBrand: (brand) =>
        set((s) => {
          s.selectedBrand = brand
          s.selectedCategory = null
        }),

      setSelectedCategory: (category) =>
        set((s) => { s.selectedCategory = category }),

      // ── Modal ────────────────────────────────────────────────────────────
      openModal: (product) =>
        set((s) => { s.modalProduct = product }),

      closeModal: () =>
        set((s) => { s.modalProduct = null }),

      // ── Reset ────────────────────────────────────────────────────────────
      resetBuilder: () =>
        set((s) => {
          s.rooms = DEFAULT_ROOMS.map((r) => ({ ...r, items: [], roomDiscount: 0 }))
          s.activeRoomId = 'room-1'
          s.selectedBrand = 'Grohe'
          s.selectedCategory = null
          s.modalProduct = null
        }),
    })),
    {
      name: 'forge-pos-store-v3',   // version bump clears all stale data
      storage: createJSONStorage(() => {
        // Safe localStorage wrapper — returns empty on SSR
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      partialize: (state) => ({
        project: state.project,
        rooms: state.rooms,
        activeRoomId: state.activeRoomId,
      }),
      // Migrate or wipe incompatible stored state
      migrate: () => ({
        project: DEFAULT_PROJECT,
        rooms: DEFAULT_ROOMS,
        activeRoomId: 'room-1',
      }),
      version: 3,
    }
  )
)

// ─── Selector Helpers ──────────────────────────────────────────────────────────

export function useActiveRoom() {
  return usePOSStore((s) => s.rooms.find((r) => r.id === s.activeRoomId) ?? null)
}

export function useTotals() {
  const rooms    = usePOSStore((s) => s.rooms)
  const discount = usePOSStore((s) => s.project.globalDiscount)

  return React.useMemo(() => {
    let totalMRP   = 0
    let totalOffer = 0
    let totalItems = 0

    for (const room of rooms) {
      for (const item of room.items) {
        const unitMRP    = item.product.mrp + item.finish.priceAdj
        const lineMRP    = unitMRP * item.quantity
        // Apply the highest of global, room-level, or item-level discount
        const effectiveDiscount = Math.max(discount, room.roomDiscount ?? 0, item.itemDiscount ?? 0)
        const lineOffer  = lineMRP * (1 - effectiveDiscount / 100)
        totalMRP   += lineMRP
        totalOffer += lineOffer
        totalItems += item.quantity
      }
    }

    return {
      totalMRP,
      totalOffer,
      totalDiscount: totalMRP - totalOffer,
      discountPct: discount,
      totalItems,
      roomCount: rooms.length,
    }
  }, [rooms, discount])
}
