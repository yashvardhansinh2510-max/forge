'use client'

// ─── PurchasesView — 3-column layout coordinator ─────────────────────────────
//
// Wires together:
//   Col A (160px)  → CompanyFilterPanel  (brand tiles + status pills)
//   Col B (340px)  → POListColumn        (PO list + search + needs-po)
//   Col C (flex-1) → POCodePanel         (PO detail + code table + footer)
//
// Manages cross-column actions:
//   • Status advance  → updatePOField({ status })
//   • Brand click     → setActiveBrand (filters Col B)

import * as React from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { CompanyFilterPanel }  from './CompanyFilterPanel'
import { POListColumn }        from './POListColumn'
import { POCodePanel, POCodePanelEmpty } from './POCodePanel'
import type { POStatus } from '@/lib/mock/procurement-data'

export function PurchasesView() {
  const orders          = useProcurementStore((s) => s.orders)
  const updatePOField   = useProcurementStore((s) => s.updatePOField)
  const selectedPOId    = usePurchasesStore((s) => s.selectedPOId)
  const highlightLineId = usePurchasesStore((s) => s.highlightLineId)
  const setActiveBrand  = usePurchasesStore((s) => s.setActiveBrand)

  const selectedOrder = React.useMemo(
    () => orders.find((o) => o.id === selectedPOId) ?? null,
    [orders, selectedPOId],
  )

  function handleStatusAdvance(to: POStatus) {
    if (!selectedPOId) return
    updatePOField(selectedPOId, { status: to })
  }

  function handleBrandClick(brand: string) {
    setActiveBrand(brand.toUpperCase())
  }

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
    }}>
      {/* Column A — filter panel */}
      <CompanyFilterPanel />

      {/* Column B — PO list */}
      <POListColumn />

      {/* Column C — PO detail */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedOrder ? (
          <POCodePanel
            order={selectedOrder}
            highlightLineId={highlightLineId}
            onStatusAdvance={handleStatusAdvance}
            onBrandClick={handleBrandClick}
          />
        ) : (
          <POCodePanelEmpty />
        )}
      </div>
    </div>
  )
}
