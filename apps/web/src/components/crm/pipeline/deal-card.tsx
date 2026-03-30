'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { formatINR } from '@/lib/mock/dashboard-data'
import { type Deal } from '@/lib/mock/crm-data'

interface DealCardProps {
  deal: Deal
  onClick: (deal: Deal) => void
  isDragging?: boolean
}

export function DealCard({ deal, onClick, isDragging = false }: DealCardProps) {
  const visibleBrands = deal.brands.slice(0, 3)
  const extraBrands = deal.brands.length - 3

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onClick(deal)}
      style={{
        background: isDragging ? 'rgba(255,255,255,0.95)' : 'white',
        borderRadius: 8,
        padding: '12px 14px',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging ? 'var(--shadow-float)' : 'var(--shadow-base)',
        transition: 'box-shadow 120ms',
        userSelect: 'none',
        borderLeft: '2px solid var(--n-150)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-raised)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-base)'
        }
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: '18px',
          marginBottom: 10,
        }}
      >
        {deal.title}
      </div>

      {/* Company + avatar row */}
      <div className="flex items-center gap-2 mb-1">
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--n-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 600,
            flexShrink: 0,
            color: 'var(--text-tertiary)',
          }}
        >
          {deal.owner.initials}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          {deal.contactName}
        </span>
        {deal.companyName && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {deal.companyName}</span>
        )}
      </div>

      {/* Project type + units */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {deal.projectType && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-ground)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              padding: '1px 6px',
            }}
          >
            {deal.projectType}
          </span>
        )}
        {deal.units > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{deal.units} units</span>
        )}
      </div>

      {/* Value + probability */}
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {formatINR(deal.value, true)}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp size={11} color="var(--text-tertiary)" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{deal.probability}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={11} color="var(--text-tertiary)" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
              {format(deal.closeDate, 'MMM d')}
            </span>
          </div>
        </div>
      </div>

      {/* Brand pills */}
      {deal.brands.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {visibleBrands.map((brand) => (
            <span
              key={brand}
              style={{
                background: 'var(--n-100)',
                border: '1px solid var(--n-150)',
                color: 'var(--text-muted)',
                fontSize: 10,
                fontWeight: 500,
                padding: '0 6px',
                height: 16,
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                letterSpacing: '0.01em',
              }}
            >
              {brand}
            </span>
          ))}
          {extraBrands > 0 && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                padding: '2px 4px',
                fontWeight: 500,
              }}
            >
              +{extraBrands} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}
