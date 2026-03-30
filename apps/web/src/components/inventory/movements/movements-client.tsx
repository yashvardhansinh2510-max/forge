'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, ArrowUp, ArrowDown, ArrowLeftRight, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { InventoryNav } from '../shared/inventory-nav'
import { MovementsTable } from './movements-table'
import { LogMovementModal } from './log-movement-modal'
import { movements, type MovementType } from '@/lib/mock/inventory-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const TYPE_FILTERS: { label: string; value: MovementType | 'all'; icon: React.ElementType }[] = [
  { label: 'All', value: 'all', icon: ArrowLeftRight },
  { label: 'In', value: 'IN', icon: ArrowUp },
  { label: 'Out', value: 'OUT', icon: ArrowDown },
  { label: 'Transfer', value: 'TRANSFER', icon: ArrowLeftRight },
  { label: 'Adjust', value: 'ADJUST', icon: SlidersHorizontal },
  { label: 'Return', value: 'RETURN', icon: RotateCcw },
]

const SUMMARY_TILES = [
  {
    label: 'Total Movements',
    value: movements.length,
  },
  {
    label: 'Stock In',
    value: movements.filter((m) => m.type === 'IN' || m.type === 'RETURN').length,
  },
  {
    label: 'Stock Out',
    value: movements.filter((m) => m.type === 'OUT').length,
  },
  {
    label: 'Transfers',
    value: movements.filter((m) => m.type === 'TRANSFER').length,
  },
]

export function MovementsClient() {
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<MovementType | 'all'>('all')
  const [logOpen, setLogOpen] = React.useState(false)

  const filtered = movements.filter((m) => {
    const matchType = typeFilter === 'all' || m.type === typeFilter
    const matchSearch =
      !search ||
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.reference.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const actions = (
    <Button size="sm" onClick={() => setLogOpen(true)}>
      <Plus size={14} className="mr-1.5" />
      Log Movement
    </Button>
  )

  return (
    <PageContainer
      title="Inventory"
      subtitle={`${movements.length} movements · ${filtered.length} shown`}
      actions={actions}
    >
      <InventoryNav />

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUMMARY_TILES.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: APPLE_EASE, delay: i * 0.05 }}
            style={{
              flex: '1 1 120px',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-base)',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              {tile.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tile.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by product, SKU, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 32,
              padding: '0 10px 0 30px',
              fontSize: 13,
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              outline: 'none',
              background: 'white',
              boxSizing: 'border-box',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TYPE_FILTERS.map((f) => {
            const Icon = f.icon
            const active = typeFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  background: active ? 'var(--accent-light)' : 'white',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
              >
                {f.value !== 'all' && <Icon size={11} />}
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <MovementsTable data={filtered} globalFilter={search} />

      <LogMovementModal open={logOpen} onClose={() => setLogOpen(false)} />
    </PageContainer>
  )
}
