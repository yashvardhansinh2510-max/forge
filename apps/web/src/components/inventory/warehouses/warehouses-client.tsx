'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { InventoryNav } from '../shared/inventory-nav'
import { WarehouseCard } from './warehouse-card'
import { WarehouseSlideOver } from './warehouse-slide-over'
import { warehouses, type Warehouse } from '@/lib/mock/inventory-data'

export function WarehousesClient() {
  const [selected, setSelected] = React.useState<Warehouse | null>(null)

  const totalValue = warehouses.reduce((sum, w) => sum + w.totalValue, 0)
  const totalSKUs = warehouses.reduce((sum, w) => sum + w.totalSKUs, 0)

  const actions = (
    <Button size="sm" onClick={() => toast.success('Add warehouse coming soon')}>
      <Plus size={14} className="mr-1.5" />
      Add Warehouse
    </Button>
  )

  return (
    <PageContainer
      title="Inventory"
      subtitle={`${warehouses.length} warehouses · ${totalSKUs} SKUs`}
      actions={actions}
    >
      <InventoryNav />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {warehouses.map((warehouse, i) => (
          <WarehouseCard
            key={warehouse.id}
            warehouse={warehouse}
            index={i}
            onClick={() => setSelected(warehouse)}
          />
        ))}
      </div>

      <WarehouseSlideOver warehouse={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  )
}
