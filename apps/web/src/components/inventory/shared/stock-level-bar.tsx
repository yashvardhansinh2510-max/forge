'use client'

import { motion } from 'framer-motion'
import type { StockStatus } from '@/lib/mock/inventory-data'

interface StockLevelBarProps {
  current: number
  reorderPoint: number
  max?: number
  status: StockStatus
  showLabel?: boolean
}

const STATUS_COLOR: Record<StockStatus, string> = {
  in_stock: '#22C55E',
  low_stock: '#F59E0B',
  out_of_stock: '#EF4444',
}

export function StockLevelBar({ current, reorderPoint, max, status, showLabel = false }: StockLevelBarProps) {
  const maxVal = max ?? Math.max(current * 1.5, reorderPoint * 3, 10)
  const pct = Math.min((current / maxVal) * 100, 100)
  const reorderPct = Math.min((reorderPoint / maxVal) * 100, 100)
  const color = STATUS_COLOR[status]

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{current} units</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Reorder: {reorderPoint}</span>
        </div>
      )}
      <div
        style={{
          position: 'relative',
          height: 6,
          background: 'var(--surface-ground)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            background: color,
            borderRadius: 99,
          }}
        />
        {/* Reorder point marker */}
        <div
          style={{
            position: 'absolute',
            left: `${reorderPct}%`,
            top: 0,
            bottom: 0,
            width: 1.5,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  )
}
