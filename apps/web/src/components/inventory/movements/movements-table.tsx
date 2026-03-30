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
import { ChevronUp, ChevronDown, ChevronsUpDown, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { type StockMovement } from '@/lib/mock/inventory-data'
import { Badge, type BadgeDot } from '@/components/shared/badge'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

const TYPE_DOT: Record<string, BadgeDot> = {
  IN: 'positive',
  OUT: 'negative',
  ADJUST: 'caution',
  TRANSFER: 'accent',
  RETURN: 'neutral',
}

function CopyableRef({ reference }: { reference: string }) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(reference).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Reference copied')
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-ui)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--accent)',
        }}
      >
        {reference}
      </span>
      <button
        onClick={handleCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          border: '1px solid var(--border-default)',
          background: 'white',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          transition: 'all 100ms',
        }}
      >
        {copied ? <Check size={10} style={{ color: '#15803D' }} /> : <Copy size={10} />}
      </button>
    </div>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={12} />
  if (sorted === 'desc') return <ChevronDown size={12} />
  return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
}

interface MovementsTableProps {
  data: StockMovement[]
  globalFilter: string
}

export function MovementsTable({ data, globalFilter }: MovementsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }])

  const columns = React.useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        size: 150,
        cell: ({ getValue }) => <CopyableRef reference={getValue() as string} />,
      },
      {
        accessorKey: 'productName',
        header: 'Product',
        size: 220,
        cell: ({ row }) => (
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 1,
              }}
            >
              {row.original.productName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.original.sku}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 100,
        cell: ({ getValue }) => {
          const type = getValue() as string
          const dot = TYPE_DOT[type]
          return <Badge label={type} dot={dot} />
        },
      },
      {
        id: 'from',
        header: 'From',
        size: 150,
        enableSorting: false,
        cell: ({ row }) => (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {row.original.fromWarehouseName ?? '—'}
          </span>
        ),
      },
      {
        id: 'to',
        header: 'To',
        size: 150,
        enableSorting: false,
        cell: ({ row }) => (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {row.original.toWarehouseName ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        size: 80,
        cell: ({ row }) => {
          const { quantity, type } = row.original
          const isNegative = type === 'OUT' || quantity < 0
          return (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isNegative ? 'var(--negative)' : 'var(--positive)',
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isNegative ? '' : '+'}{quantity}
            </span>
          )
        },
      },
      {
        accessorKey: 'performedBy',
        header: 'By',
        size: 130,
        cell: ({ getValue }) => (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        size: 130,
        cell: ({ getValue }) => (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {format(getValue() as Date, 'MMM d, yyyy')}
          </span>
        ),
        sortingFn: 'datetime',
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm), var(--shadow-card-inset)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                      letterSpacing: '0.06em',
                      background: 'var(--surface-bg)',
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
            {table.getRowModel().rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: APPLE_EASE, delay: i * 0.025 }}
                style={{
                  height: 52,
                  transition: 'background 60ms',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.018)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    fontSize: 14,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  No movements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
