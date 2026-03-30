'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, LabelList } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { pipelineData, formatINR } from '@/lib/mock/dashboard-data'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PipelineChartSkeleton() {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        padding: 20,
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 130, height: 15 }} />
          <div
            className="mt-1.5 animate-pulse rounded bg-zinc-100"
            style={{ width: 90, height: 12 }}
          />
        </div>
        <div className="animate-pulse rounded-md bg-zinc-100" style={{ width: 70, height: 22 }} />
      </div>
      <div className="animate-pulse rounded-lg bg-zinc-100" style={{ height: 200 }} />
    </div>
  )
}

// ─── Custom Label ─────────────────────────────────────────────────────────────

interface LabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  index?: number
}

function CustomLabel({ x = 0, y = 0, width = 0, height = 0, value = 0, index = 0 }: LabelProps) {
  const entry = pipelineData[index]
  if (!entry) return null
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={4}
      fontSize={11}
      fill="#A1A1AA"
      fontFamily="var(--font-ui)"
    >
      {value} · {formatINR(entry.value, true)}
    </text>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PipelineChartProps {
  isLoading?: boolean
}

export function PipelineChart({ isLoading = false }: PipelineChartProps) {
  if (isLoading) return <PipelineChartSkeleton />

  const totalValue = pipelineData.reduce((sum, s) => sum + s.value, 0)
  const wonDeals = pipelineData.find((s) => s.stage === 'Won')
  const lostDeals = { count: 3, value: 800000 } // mock lost data
  const totalClosed = (wonDeals?.count ?? 0) + lostDeals.count
  const winRate = totalClosed > 0 ? ((wonDeals?.count ?? 0) / totalClosed) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-base)',
        borderRadius: 12,
        padding: 20,
        transition: 'box-shadow var(--t-base)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-raised)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'var(--shadow-base)'
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Pipeline by Stage
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            34 active deals
          </div>
        </div>
        <div
          style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 600,
            padding: '0 8px',
            height: 22,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {formatINR(totalValue, true)} total
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={pipelineData}
          layout="vertical"
          margin={{ top: 0, right: 80, bottom: 0, left: 0 }}
        >
          <defs>
            {pipelineData.map((entry, index) => (
              <linearGradient
                key={`grad-${index}`}
                id={`pipelineGrad${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="stage"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#52525B', fontWeight: 500 }}
            width={90}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            barSize={20}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {pipelineData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={`url(#pipelineGrad${index})`} />
            ))}
            <LabelList content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Win Rate Strip */}
      <div
        className="mt-4 flex items-center justify-between pt-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Won</div>
          <div
            className="flex items-center gap-1"
            style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}
          >
            <TrendingUp size={12} />
            {wonDeals?.count ?? 0} deals · {formatINR(wonDeals?.value ?? 0, true)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Lost</div>
          <div
            className="flex items-center gap-1"
            style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}
          >
            <TrendingDown size={12} />
            {lostDeals.count} deals · {formatINR(lostDeals.value, true)}
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
            Win Rate
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {winRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </motion.div>
  )
}
