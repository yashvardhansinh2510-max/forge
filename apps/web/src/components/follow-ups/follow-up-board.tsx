'use client'

import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, isPast } from 'date-fns'
import { toast } from 'sonner'
import {
  FOLLOWUP_STATUS_CONFIG,
  CUSTOMER_TYPE_LABELS,
  getEffectiveStatus,
  type FollowUp,
  type FollowUpStatus,
} from '@/lib/mock/followup-data'
import { formatINR } from '@/lib/mock/dashboard-data'

// Statuses shown as columns (won/lost are separate "terminal" columns)
const BOARD_COLUMNS: FollowUpStatus[] = ['pending', 'contacted', 'interested', 'negotiating', 'won', 'lost']

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white', borderRadius: 14, padding: 24,
          width: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.16)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: '0 14px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border-default)', background: 'white',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: '0 14px', borderRadius: 7, fontSize: 13,
              background: confirmColor, color: 'white',
              border: 'none', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Deal card ───────────────────────────────────────────────────────────────

function FollowUpCard({
  followUp,
  onClick,
  isDragging = false,
}: { followUp: FollowUp; onClick?: (f: FollowUp) => void; isDragging?: boolean }) {
  const effective = getEffectiveStatus(followUp)
  const cfg = FOLLOWUP_STATUS_CONFIG[effective]
  const val = followUp.quotationValue ?? followUp.estimatedBudget
  const isOverdue = effective === 'overdue'

  return (
    <div
      onClick={() => onClick?.(followUp)}
      style={{
        padding: 12,
        borderRadius: 10,
        background: isDragging ? 'rgba(255,255,255,0.85)' : 'white',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${isOverdue ? '#DC2626' : cfg.text}`,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.14)' : 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'grab',
        opacity: isDragging ? 0.85 : 1,
        transform: isDragging ? 'rotate(1.5deg)' : undefined,
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        if (!isDragging) (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      {/* Name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
        {followUp.customerName}
      </div>

      {/* Type + customer type */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
        <span
          style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: followUp.type === 'walk_in' ? 'rgba(0,113,227,0.08)' : 'rgba(142,142,147,0.1)',
            color: followUp.type === 'walk_in' ? '#0071E3' : '#636366',
          }}
        >
          {followUp.type === 'walk_in' ? 'Walk-in' : followUp.quotationNumber ?? 'Quotation'}
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)',
          }}
        >
          {CUSTOMER_TYPE_LABELS[followUp.customerType]}
        </span>
      </div>

      {/* Brands */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {followUp.brandsInterested.slice(0, 3).map((b) => (
          <span
            key={b}
            style={{
              fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
              background: 'var(--surface-tint)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {b}
          </span>
        ))}
      </div>

      {/* Footer: date + value */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11,
            color: isPast(followUp.nextFollowUpDate) ? '#DC2626' : 'var(--text-tertiary)',
            fontWeight: isPast(followUp.nextFollowUpDate) ? 700 : 500,
          }}
        >
          {format(followUp.nextFollowUpDate, 'dd MMM')}
        </span>
        {val && (
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatINR(val, true)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Sortable card wrapper ────────────────────────────────────────────────────

function SortableCard({
  followUp,
  onClick,
}: { followUp: FollowUp; onClick: (f: FollowUp) => void }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: followUp.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <FollowUpCard followUp={followUp} onClick={onClick} isDragging={false} />
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  items,
  onCardClick,
}: {
  status: FollowUpStatus
  items: FollowUp[]
  onCardClick: (f: FollowUp) => void
}) {
  const cfg = FOLLOWUP_STATUS_CONFIG[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const totalValue = items.reduce((s, f) => s + (f.quotationValue ?? f.estimatedBudget ?? 0), 0)

  return (
    <div
      style={{ minWidth: 230, maxWidth: 230, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10, padding: '0 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: cfg.text, flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            {cfg.label}
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
              background: 'var(--surface-tint)', color: 'var(--text-tertiary)',
            }}
          >
            {items.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span
            style={{
              fontSize: 10, color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
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
          minHeight: 120,
          borderRadius: 10,
          padding: 8,
          background: isOver ? 'rgba(0,113,227,0.04)' : 'rgba(0,0,0,0.02)',
          border: `1.5px dashed ${isOver ? 'rgba(0,113,227,0.3)' : 'transparent'}`,
          transition: 'background 150ms, border-color 150ms',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <SortableContext items={items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {items.map((f) => (
            <SortableCard key={f.id} followUp={f} onClick={onCardClick} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)', fontSize: 12,
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Board ─────────────────────────────────────────────────────────────────────

interface FollowUpBoardProps {
  data: FollowUp[]
  onCardClick: (f: FollowUp) => void
  onStatusChange: (id: string, status: FollowUpStatus) => void
  canEdit?: boolean
}

export function FollowUpBoard({ data, onCardClick, onStatusChange, canEdit = true }: FollowUpBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [pendingMove, setPendingMove] = React.useState<{
    id: string
    newStatus: FollowUpStatus
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeItem = activeId ? data.find((f) => f.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const overId = over.id as string
    const currentItem = data.find((f) => f.id === active.id)
    if (!currentItem) return

    // Determine target status
    const isColumn = BOARD_COLUMNS.includes(overId as FollowUpStatus)
    const targetStatus: FollowUpStatus | null = isColumn
      ? (overId as FollowUpStatus)
      : (data.find((f) => f.id === overId)?.status ?? null)

    if (!targetStatus || targetStatus === currentItem.status) return

    // Confirm before moving to Won or Lost (terminal states)
    if (targetStatus === 'won' || targetStatus === 'lost') {
      setPendingMove({ id: active.id as string, newStatus: targetStatus })
    } else {
      onStatusChange(active.id as string, targetStatus)
      toast.success(`Moved to ${FOLLOWUP_STATUS_CONFIG[targetStatus].label}`)
    }
  }

  function handleConfirmMove() {
    if (!pendingMove) return
    onStatusChange(pendingMove.id, pendingMove.newStatus)
    toast.success(`Marked as ${FOLLOWUP_STATUS_CONFIG[pendingMove.newStatus].label}`)
    setPendingMove(null)
  }

  const byStatus = React.useMemo(() => {
    const map: Record<string, FollowUp[]> = {}
    BOARD_COLUMNS.forEach((s) => { map[s] = [] })
    data.forEach((f) => {
      // Cards with effective 'overdue' status display in pending column
      const col = f.status === 'overdue' ? 'pending' : f.status
      if (map[col]) map[col]!.push(f)
    })
    return map
  }, [data])

  return (
    <>
      <DndContext
        sensors={canEdit ? sensors : []}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {BOARD_COLUMNS.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              items={byStatus[status] ?? []}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? <FollowUpCard followUp={activeItem} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={!!pendingMove}
        title={`Mark as ${pendingMove ? FOLLOWUP_STATUS_CONFIG[pendingMove.newStatus].label : ''}?`}
        body={
          pendingMove?.newStatus === 'won'
            ? 'This will mark the follow-up as Won. If linked to a quotation, it will be set to Accepted.'
            : 'This will mark the follow-up as Lost. If linked to a quotation, it will be set to Declined.'
        }
        confirmLabel={pendingMove?.newStatus === 'won' ? 'Mark Won' : 'Mark Lost'}
        confirmColor={pendingMove?.newStatus === 'won' ? '#1A7F37' : '#CF222E'}
        onConfirm={handleConfirmMove}
        onCancel={() => setPendingMove(null)}
      />
    </>
  )
}
