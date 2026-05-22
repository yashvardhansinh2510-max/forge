'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { StatsRevenuePoint } from '@/app/api/dashboard/stats/route'

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const revenue = payload.find((p) => p.dataKey === 'revenue')?.value ?? 0

  return (
    <div style={{ background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.32)', minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#60A5FA', letterSpacing: '-0.02em' }}>
        {formatINR(revenue)}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RevenueChartSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 'var(--r-md)', padding: 20 }}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 120, height: 15 }} />
          <div className="mt-1.5 animate-pulse rounded bg-zinc-100" style={{ width: 90, height: 12 }} />
        </div>
      </div>
      <div className="animate-pulse rounded-lg bg-zinc-100" style={{ height: 220 }} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RevenueChartProps {
  isLoading?: boolean
  data?: StatsRevenuePoint[]
}

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

export function RevenueChart({ isLoading = false, data }: RevenueChartProps) {
  if (isLoading) return <RevenueChartSkeleton />

  const points = data ?? []
  const totalRevenue = points.reduce((sum, d) => sum + d.revenue, 0)
  const hasData = totalRevenue > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: APPLE_EASE }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, padding: 20, transition: 'box-shadow var(--t-base)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-raised)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-base)' }}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Revenue Trend</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Last 6 months ·{' '}
            {hasData
              ? <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatINR(totalRevenue, true)} collected</span>
              : <span>No payment data yet</span>
            }
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Collected</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.12} />
              <stop offset="50%" stopColor="#2563EB" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal vertical={false} stroke="var(--n-150)" strokeDasharray="0" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }} tickFormatter={(v: number) => formatINR(v, true)} width={60} dx={-4} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#2563EB', stroke: 'white', strokeWidth: 2.5 }}
            isAnimationActive
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
