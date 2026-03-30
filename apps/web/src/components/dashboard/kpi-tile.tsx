'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { motion } from 'framer-motion'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Users,
  PackageX,
  Receipt,
  Factory,
  ChevronRight,
  Minus,
} from 'lucide-react'
import { formatINR, formatPercentChange, type KPIItem, type KPIColor } from '@/lib/mock/dashboard-data'

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  IndianRupee,
  TrendingUp,
  Users,
  PackageX,
  Receipt,
  Factory,
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<KPIColor, { icon: string; iconBg: string }> = {
  blue:    { icon: '#2563EB', iconBg: 'rgba(37,99,235,0.09)' },
  violet:  { icon: '#7C3AED', iconBg: 'rgba(124,58,237,0.09)' },
  emerald: { icon: '#059669', iconBg: 'rgba(5,150,105,0.09)' },
  amber:   { icon: '#D97706', iconBg: 'rgba(217,119,6,0.09)' },
  orange:  { icon: '#EA580C', iconBg: 'rgba(234,88,12,0.09)' },
}

// ─── Animation ────────────────────────────────────────────────────────────────

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const tileVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
}

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KPITileSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 12,
        padding: '22px 20px',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="animate-pulse rounded-lg bg-zinc-100" style={{ width: 34, height: 34 }} />
        <div className="animate-pulse rounded-full bg-zinc-100" style={{ width: 44, height: 18 }} />
      </div>
      <div className="mt-5 animate-pulse rounded-md bg-zinc-100" style={{ width: '70%', height: 38 }} />
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 100, height: 13 }} />
          <div className="mt-1 animate-pulse rounded bg-zinc-100" style={{ width: 80, height: 11 }} />
        </div>
        <div className="animate-pulse rounded bg-zinc-100" style={{ width: 12, height: 12 }} />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface KPITileProps extends KPIItem {
  index: number
  isLoading?: boolean
}

export function KPITile({ index, isLoading, ...item }: KPITileProps) {
  const router = useRouter()
  const [displayValue, setDisplayValue] = React.useState(0)
  const [hasAnimated, setHasAnimated] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Count-up animation on intersection
  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const start = performance.now()
          const duration = 1100
          const target = item.value

          function frame(now: number) {
            const elapsed = now - start
            const t = Math.min(elapsed / duration, 1)
            setDisplayValue(easeOutExpo(t) * target)
            if (t < 1) {
              requestAnimationFrame(frame)
            }
          }

          requestAnimationFrame(frame)
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasAnimated, item.value])

  if (isLoading) return <KPITileSkeleton />

  const IconComponent = ICON_MAP[item.icon] ?? IndianRupee
  const trend = formatPercentChange(item.value, item.previousValue)
  const colorConfig = COLOR_MAP[item.color] ?? COLOR_MAP.blue
  const isAlertWarning = item.isAlert && item.value > 5

  const formattedValue =
    item.format === 'currency'
      ? formatINR(Math.round(displayValue))
      : Math.round(displayValue).toLocaleString('en-IN')

  return (
    <motion.div
      ref={ref}
      variants={tileVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.55, ease: APPLE_EASE, delay: index * 0.065 }}
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 12,
        padding: '22px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 160ms ease, transform 160ms ease',
        borderTop: isAlertWarning
          ? '2px solid rgba(220,38,38,0.5)'
          : `2px solid ${colorConfig.icon}22`,
        overflow: 'hidden',
        position: 'relative',
      }}
      className="group"
      onClick={() => router.push(item.href as Route)}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-raised)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-base)'
        el.style.transform = ''
      }}
    >
      {/* Top row — icon + trend */}
      <div className="flex items-center justify-between">
        {/* Colored icon */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: colorConfig.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComponent size={16} color={isAlertWarning ? '#DC2626' : colorConfig.icon} strokeWidth={1.9} />
        </div>

        {/* Trend — plain, no badge; alert tiles invert good/bad */}
        {(() => {
          const trendUp = trend.direction === 'up'
          const trendDown = trend.direction === 'down'
          // For alert metrics, up is bad, down is good
          const trendColor = trend.direction === 'neutral'
            ? 'var(--text-muted)'
            : item.isAlert
              ? trendUp ? 'var(--negative)' : 'var(--positive)'
              : trendUp ? 'var(--positive)' : 'var(--negative)'
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.01em',
                color: trendColor,
              }}
            >
              {trendUp ? <TrendingUp size={10} /> : trendDown ? <TrendingDown size={10} /> : <Minus size={10} />}
              {trend.direction !== 'neutral' && (
                <>{trendUp ? '+' : '−'}{trend.value}%</>
              )}
            </div>
          )
        })()}
      </div>

      {/* Hero number */}
      <div
        style={{
          marginTop: 18,
          fontFamily: 'var(--font-ui)',
          fontSize: item.format === 'currency' ? 34 : 40,
          fontWeight: 700,
          letterSpacing: item.format === 'currency' ? '-0.03em' : '-0.04em',
          color: isAlertWarning ? 'var(--negative)' : 'var(--text-primary)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {item.value === 0 ? (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 28 }}>—</span>
        ) : (
          formattedValue
        )}
      </div>

      {/* Label row */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {item.label}
          </div>
          {item.subLabel && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.subLabel}
            </div>
          )}
        </div>
        <ChevronRight
          size={13}
          color="var(--text-tertiary)"
          className="opacity-0 transition-all duration-[180ms] group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>
    </motion.div>
  )
}
