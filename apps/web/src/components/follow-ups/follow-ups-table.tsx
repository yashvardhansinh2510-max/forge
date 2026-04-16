'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, Phone, MessageCircle, Mail, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { Badge } from '@/components/shared/badge'
import { formatINR } from '@/lib/mock/dashboard-data'
import {
  getEffectiveStatus,
  FOLLOWUP_STATUS_CONFIG,
  CUSTOMER_TYPE_LABELS,
  type FollowUp,
  type ResponseMethod,
} from '@/lib/mock/followup-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const METHOD_ICON: Record<ResponseMethod, React.ReactNode> = {
  call:     <Phone size={11} />,
  whatsapp: <MessageCircle size={11} />,
  email:    <Mail size={11} />,
  visit:    <MapPin size={11} />,
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={12} />
  if (sorted === 'desc') return <ChevronDown size={12} />
  return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
}

function StatusChip({ followUp }: { followUp: FollowUp }) {
  const status = getEffectiveStatus(followUp)
  const cfg = FOLLOWUP_STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 6,
        background: cfg.bg,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.text,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.text,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}

function NextDateCell({ date }: { date: Date }) {
  const past = isPast(date)
  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return (
    <span
      style={{
        fontFamily: 'var(--font-ui)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 12,
        fontWeight: 600,
        color: past ? '#DC2626' : isToday ? '#D97706' : 'var(--text-secondary)',
      }}
    >
      {isToday ? 'Today' : format(date, 'dd MMM')}
    </span>
  )
}

function BrandChips({ brands }: { brands: string[] }) {
  const visible = brands.slice(0, 3)
  const extra = brands.length - 3
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', alignItems: 'center' }}>
      {visible.map((b) => (
        <span
          key={b}
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            background: 'var(--surface-tint)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            whiteSpace: 'nowrap',
          }}
        >
          {b}
        </span>
      ))}
      {extra > 0 && (
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{extra}</span>
      )}
    </div>
  )
}

interface FollowUpsTableProps {
  data: FollowUp[]
  onRowClick: (f: FollowUp) => void
  canEdit?: boolean
}

export function FollowUpsTable({ data, onRowClick }: FollowUpsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'nextFollowUpDate', desc: false },
  ])

  const columns = React.useMemo<ColumnDef<FollowUp>[]>(() => [
    {
      id: 'customer',
      header: 'Customer',
      size: 220,
      cell: ({ row }) => {
        const f = row.original
        const typeLabel = CUSTOMER_TYPE_LABELS[f.customerType]
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {f.customerName}
            </div>
            <Badge
              label={typeLabel}
              dot={
                f.customerType === 'architect' ? 'accent'
                : f.customerType === 'interior_designer' ? 'caution'
                : f.customerType === 'builder' ? 'neutral'
                : 'neutral'
              }
            />
          </div>
        )
      },
    },
    {
      id: 'type',
      header: 'Type / Ref',
      size: 150,
      cell: ({ row }) => {
        const f = row.original
        if (f.type === 'quotation' && f.quotationNumber) {
          return (
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {f.quotationNumber}
            </span>
          )
        }
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 7px',
              borderRadius: 5,
              background: 'rgba(0,113,227,0.06)',
              fontSize: 11,
              fontWeight: 600,
              color: '#0071E3',
            }}
          >
            Walk-in
          </span>
        )
      },
    },
    {
      id: 'brands',
      header: 'Brands',
      size: 180,
      enableSorting: false,
      cell: ({ row }) => <BrandChips brands={row.original.brandsInterested} />,
    },
    {
      id: 'status',
      header: 'Status',
      size: 120,
      cell: ({ row }) => <StatusChip followUp={row.original} />,
    },
    {
      accessorKey: 'nextFollowUpDate',
      header: 'Next Follow-up',
      size: 120,
      cell: ({ getValue }) => <NextDateCell date={getValue() as Date} />,
      sortingFn: 'datetime',
    },
    {
      id: 'lastResponse',
      header: 'Last Contact',
      size: 140,
      cell: ({ row }) => {
        const f = row.original
        const last = f.responses[0]
        if (!last) return <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {METHOD_ICON[last.method]}
            </span>
            <span suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {formatDistanceToNow(last.date, { addSuffix: true })}
            </span>
          </div>
        )
      },
    },
    {
      id: 'assignedTo',
      header: 'Assigned',
      size: 100,
      cell: ({ row }) => {
        const name = row.original.assignedTo
        const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        const color = name.includes('Suresh') ? '#0071E3' : '#7C3AED'
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: color, color: 'white',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {name.split(' ')[0]}
            </span>
          </div>
        )
      },
    },
    {
      id: 'value',
      header: 'Value',
      size: 110,
      cell: ({ row }) => {
        const f = row.original
        const val = f.quotationValue ?? f.estimatedBudget
        if (!val) return <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
        return (
          <span
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {formatINR(val, true)}
          </span>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ background: 'rgba(0,0,0,0.02)' }}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      width: header.getSize(),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => {
              const effective = getEffectiveStatus(row.original)
              const isOverdue = effective === 'overdue'
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: APPLE_EASE, delay: i * 0.03 }}
                  onClick={() => onRowClick(row.original)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 60ms',
                    borderLeft: isOverdue ? '3px solid #DC2626' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ padding: '12px 16px', verticalAlign: 'middle', borderTop: '1px solid var(--border-subtle)' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              )
            })}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: 48, textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)' }}
                >
                  No follow-ups match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
