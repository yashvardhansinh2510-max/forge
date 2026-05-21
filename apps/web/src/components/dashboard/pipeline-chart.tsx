'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, LabelList } from 'recharts'
import type { StatsPipelineStage } from '@/app/api/dashboard/stats/route'

// ── Stage colours ─────────────────────────────────────────────────────────────

const STAGE_COLORS = ['#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8']

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PipelineChartSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, padding: 20 }}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="animate-pulse rounded bg-zinc-100" style={{ width: 130, height: 15 }} />
          <div className="mt-1.5 animate-pulse rounded bg-zinc-100" style={{ width: 90, height: 12 }} />
        </div>
      </div>
      <div className="animate-pulse rounded-lg bg-zinc-100" style={{ height: 200 }} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PipelineChartProps {
  isLoading?: boolean
  data?: StatsPipelineStage[]
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  LOCKED: 'Locked',
  FINALIZED: 'Finalized',
}

export function PipelineChart({ isLoading = false, data }: PipelineChartProps) {
  if (isLoading) return <PipelineChartSkeleton />

  const stages = (data ?? []).map((s) => ({ ...s, stageLabel: STAGE_LABELS[s.stage] ?? s.stage }))
  const totalQty = stages.reduce((sum, s) => sum + s.count, 0)
  const finalized = stages.find((s) => s.stage === 'FINALIZED')?.count ?? 0

  // CustomLabel needs access to stages — defined as a closure
  function CustomLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: {
    x?: number; y?: number; width?: number; height?: number; value?: number
  }) {
    if (value === 0) return null
    return (
      <text x={x + width + 8} y={y + height / 2} dy={4} fontSize={11} fill="#A1A1AA" fontFamily="var(--font-ui)">
        {value}
      </text>
    )
  }

  if (totalQty === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}
      >
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>No quotations yet.</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-base)', borderRadius: 12, padding: 20, transition: 'box-shadow var(--t-base)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-raised)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-base)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Quotation Pipeline</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            By status · all time
          </div>
        </div>
        <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '0 8px', height: 22, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          {totalQty} units
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={stages} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 0 }}>
          <defs>
            {stages.map((_, index) => (
              <linearGradient key={`grad-${index}`} id={`stageGrad${index}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={STAGE_COLORS[index] ?? '#3B82F6'} stopOpacity={0.7} />
                <stop offset="100%" stopColor={STAGE_COLORS[index] ?? '#3B82F6'} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="stageLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#52525B', fontWeight: 500 }} width={110} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive animationDuration={1200} animationEasing="ease-out">
            {stages.map((_, index) => (
              <Cell key={`cell-${index}`} fill={`url(#stageGrad${index})`} />
            ))}
            <LabelList content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Open</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {totalQty - finalized} quotations
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Finalized</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#15803D', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {finalized}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
