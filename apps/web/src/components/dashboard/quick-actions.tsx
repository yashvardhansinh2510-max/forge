'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { motion } from 'framer-motion'
import {
  UserPlus,
  TrendingUp,
  Receipt,
  ShoppingCart,
  PackagePlus,
  Command,
} from 'lucide-react'
import { usePaletteStore } from '@forge/ui'
import { quickActions, type QuickAction } from '@/lib/mock/dashboard-data'

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus,
  TrendingUp,
  Receipt,
  ShoppingCart,
  PackagePlus,
  Command,
}

// ─── Hex → RGBA ───────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  action,
  index,
}: {
  action: QuickAction
  index: number
}) {
  const router = useRouter()
  const palette = usePaletteStore()
  const IconComponent = ICON_MAP[action.icon] ?? Command
  const [hovered, setHovered] = React.useState(false)

  function handleClick() {
    if (action.action === 'palette') {
      palette.open()
    } else if (action.href) {
      router.push(action.href as Route)
    }
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 32,
        padding: '0 12px',
        gap: 8,
        background: hovered ? hexToRgba(action.color, 0.06) : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${hovered ? hexToRgba(action.color, 0.3) : 'rgba(255,255,255,0.5)'}`,
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 150ms',
        boxShadow: hovered ? `0 2px 8px ${hexToRgba(action.color, 0.15)}` : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Icon */}
      <motion.div
        animate={{ rotate: hovered ? 8 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: hexToRgba(action.color, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComponent size={11} color={action.color} strokeWidth={2} />
      </motion.div>
      {/* Label */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'color 150ms',
          whiteSpace: 'nowrap',
        }}
      >
        {action.label}
      </span>
    </motion.button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.05)',
        borderRadius: 10,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.8)'
        el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.6)'
        el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          marginRight: 8,
        }}
      >
        Quick Actions
      </span>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--border-default)',
          flexShrink: 0,
        }}
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {quickActions.map((action, i) => (
          <ActionButton key={action.label} action={action} index={i} />
        ))}
      </div>
    </motion.div>
  )
}
