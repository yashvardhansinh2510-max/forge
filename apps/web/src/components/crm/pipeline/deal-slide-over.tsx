'use client'

import { format } from 'date-fns'
import { Calendar, TrendingUp, User, Building2 } from 'lucide-react'
import { SlideOver, DetailField } from '../shared/slide-over'
import { DealStageBadge } from '../shared/status-badge'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { Deal } from '@/lib/mock/crm-data'

interface DealSlideOverProps {
  deal: Deal | null
  onClose: () => void
}

export function DealSlideOver({ deal, onClose }: DealSlideOverProps) {
  if (!deal) return null

  return (
    <SlideOver open={!!deal} onClose={onClose} title={deal.title} subtitle={deal.companyName ?? undefined}>
      {/* Value + stage */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}
          >
            {formatINR(deal.value)}
          </div>
          <div style={{ marginTop: 4 }}>
            <DealStageBadge stage={deal.stage} size="md" />
          </div>
        </div>

        {/* Probability pill */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--surface-ground)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            padding: '10px 16px',
          }}
        >
          <TrendingUp size={16} color="var(--accent)" />
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: 4,
              letterSpacing: '-0.02em',
            }}
          >
            {deal.probability}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Probability</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 20 }} />

      <div className="flex items-center gap-2 mb-3">
        <User size={14} color="var(--text-tertiary)" />
        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{deal.contactName}</span>
      </div>
      {deal.companyName && (
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} color="var(--text-tertiary)" />
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{deal.companyName}</span>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 20 }} />

      <DetailField label="Owner" value={deal.owner.name} />
      <DetailField
        label="Close Date"
        value={
          <div className="flex items-center gap-1.5">
            <Calendar size={13} color="var(--text-tertiary)" />
            {format(deal.closeDate, 'MMMM d, yyyy')}
          </div>
        }
      />
      <DetailField label="Project Type" value={deal.projectType} />
      <DetailField label="Brands" value={deal.brands.join(', ')} />
    </SlideOver>
  )
}
