'use client'

import * as React from 'react'
import { BrandSidebar } from './brand-sidebar'
import { ProductGrid } from './product-grid'
import { ProductModal } from './product-modal'
import { RoomPanel } from './room-panel'

export function POSBuilder() {
  const [brandCollapsed, setBrandCollapsed] = React.useState(false)
  const [roomCollapsed, setRoomCollapsed]   = React.useState(false)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <BrandSidebar
        collapsed={brandCollapsed}
        onToggle={() => setBrandCollapsed((v) => !v)}
      />
      <ProductGrid />
      <RoomPanel
        collapsed={roomCollapsed}
        onToggle={() => setRoomCollapsed((v) => !v)}
      />
      <ProductModal />
    </div>
  )
}
