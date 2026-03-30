'use client'

import * as React from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import { PageContainer } from '@/components/layout/page-container'
import { CRMNav } from '../shared/crm-nav'
import { StageColumn } from './stage-column'
import { DealCard } from './deal-card'
import { DealSlideOver } from './deal-slide-over'
import { deals as initialDeals, PIPELINE_STAGES, type Deal, type DealStage } from '@/lib/mock/crm-data'
import { formatINR } from '@/lib/mock/dashboard-data'

export function PipelineClient() {
  const [dealItems, setDealItems] = React.useState<Deal[]>(initialDeals)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = React.useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const activeDeal = activeId ? dealItems.find((d) => d.id === activeId) ?? null : null

  const totalValue = dealItems
    .filter((d) => d.stage !== 'lost')
    .reduce((sum, d) => sum + d.value, 0)

  const wonValue = dealItems
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + d.value, 0)

  function getDealsByStage(stage: DealStage) {
    return dealItems.filter((d) => d.stage === stage)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const overId = over.id as string
    const isStage = PIPELINE_STAGES.some((s) => s.id === overId)
    const newStage = isStage
      ? (overId as DealStage)
      : (dealItems.find((d) => d.id === overId)?.stage ?? null)

    if (!newStage) return

    setDealItems((prev) =>
      prev.map((d) =>
        d.id === active.id ? { ...d, stage: newStage, updatedAt: new Date() } : d,
      ),
    )
  }

  const subtitle = `${dealItems.length} deals · ${formatINR(totalValue, true)} pipeline · ${formatINR(wonValue, true)} won`

  return (
    <PageContainer title="CRM" subtitle={subtitle}>
      <CRMNav />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/* Kanban board */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 16,
          }}
        >
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage.id}
              deals={getDealsByStage(stage.id)}
              onDealClick={setSelectedDeal}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDeal ? (
            <DealCard deal={activeDeal} onClick={() => {}} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealSlideOver deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </PageContainer>
  )
}
