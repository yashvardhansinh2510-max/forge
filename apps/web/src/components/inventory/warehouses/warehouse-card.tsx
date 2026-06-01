'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone } from 'lucide-react'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { Warehouse } from '@/lib/mock/inventory-data'
import { Badge } from '@/components/shared/badge'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const TYPE_CONFIG: Record<Warehouse['type'], { label: string }> = {
  showroom: { label: 'Showroom' },
  godown: { label: 'Godown' },
  dispatch: { label: 'Dispatch Hub' },
}

interface WarehouseCardProps {
  warehouse: Warehouse
  index: number
  onClick: () => void
}

function UtilizationBar({ pct }: { pct: number }) {
  const fillColor = pct > 85 ? '#DC2626' : '#2563EB'
  return (
    <div style={{ position: 'relative', height: 6, background: 'var(--n-150)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: APPLE_EASE, delay: 0.1 }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          background: fillColor,
          borderRadius: 99,
        }}
      />
    </div>
  )
}

export function WarehouseCard({ warehouse, index, onClick }: WarehouseCardProps) {
  const typeConfig = TYPE_CONFIG[warehouse.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: APPLE_EASE, delay: index * 0.08 }}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-base)',
        transition: 'box-shadow 150ms, transform 150ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-raised)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-base)'
        el.style.transform = ''
      }}
    >
      <div style={{ padding: '16px 18px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              {warehouse.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <MapPin size={11} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{warehouse.city}, {warehouse.state}</span>
            </div>
          </div>
          <Badge label={typeConfig.label} />
        </div>

        {/* Utilization */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Utilization</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {warehouse.utilization}%
            </span>
          </div>
          <UtilizationBar pct={warehouse.utilization} />
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: 'SKUs', value: warehouse.totalSKUs.toString() },
            { label: 'Units', value: warehouse.totalUnits.toLocaleString() },
            { label: 'Value', value: formatINR(warehouse.totalValue, true) },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'var(--surface-ground)',
                borderRadius: 8,
                padding: '8px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--n-150)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--text-tertiary)',
              }}
            >
              {warehouse.manager.initials}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{warehouse.manager.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Phone size={11} style={{ color: 'var(--text-tertiary)' }} />
            <a
              href={`tel:${warehouse.phone}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                textDecoration: 'none',
              }}
            >
              {warehouse.phone}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
