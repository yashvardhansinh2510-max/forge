'use client'

import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DealCard } from './deal-card'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { Deal, DealStage } from '@/lib/mock/crm-data'
import { PIPELINE_STAGES } from '@/lib/mock/crm-data'

function SortableDealCard({ deal, onClick }: { deal: Deal; onClick: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

interface StageColumnProps {
  stage: DealStage
  deals: Deal[]
  onDealClick: (deal: Deal) => void
}

export function StageColumn({ stage, deals, onDealClick }: StageColumnProps) {
  const stageConfig = PIPELINE_STAGES.find((s) => s.id === stage)!
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 240,
        maxWidth: 240,
        flexShrink: 0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          padding: '0 2px',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stageConfig.id === 'won'
                ? 'var(--positive)'
                : stageConfig.id === 'lost'
                  ? 'var(--negative)'
                  : 'var(--n-300)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {stageConfig.label}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: 'var(--n-100)',
              color: 'var(--text-tertiary)',
              padding: '1px 6px',
              borderRadius: 99,
            }}
          >
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-tertiary)',
            }}
          >
            {formatINR(totalValue, true)}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 100,
          background: isOver ? 'rgba(59,130,246,0.04)' : 'var(--surface-ground)',
          border: `1px solid ${isOver ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 10,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          transition: 'background 150ms, border-color 150ms',
        }}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} onClick={onDealClick} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 80,
              fontSize: 12,
              color: 'var(--text-tertiary)',
            }}
          >
            No deals
          </div>
        )}
      </div>
    </div>
  )
}
