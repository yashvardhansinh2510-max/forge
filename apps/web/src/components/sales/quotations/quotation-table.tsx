'use client'

import * as React from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/shared/badge'
import { calcDocumentTotals, type Quotation } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={12} />
  if (sorted === 'desc') return <ChevronDown size={12} />
  return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
}

function ValidUntilCell({ date }: { date: Date }) {
  const isExpired = date < new Date()
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  return (
    <span
      style={{
        fontFamily: 'var(--font-ui)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 12,
        color: isExpired ? 'var(--negative)' : 'var(--text-tertiary)',
      }}
    >
      {format(date, 'dd MMM')}
      {!isExpired && daysLeft > 0 && daysLeft <= 5 && (
        <span style={{ color: 'var(--caution)', marginLeft: 4 }}>({daysLeft}d)</span>
      )}
    </span>
  )
}

interface QuotationTableProps {
  data: Quotation[]
  globalFilter: string
  onRowClick: (q: Quotation) => void
}

export function QuotationTable({ data, globalFilter, onRowClick }: QuotationTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }])

  const columns = React.useMemo<ColumnDef<Quotation>[]>(() => [
    {
      accessorKey: 'number',
      header: '#',
      size: 120,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 600 }}>
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer & Project',
      size: 260,
      cell: ({ row }) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {row.original.customerName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
            {row.original.projectName}
          </div>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {row.original.lineItems.length} {row.original.lineItems.length === 1 ? 'item' : 'items'}
        </span>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      size: 120,
      cell: ({ row }) => {
        const t = calcDocumentTotals(row.original.lineItems)
        return (
          <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatINR(t.grandTotal, true)}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue }) => {
        const status = getValue() as string
        const dotMap: Record<string, 'neutral' | 'accent' | 'positive' | 'negative'> = {
          draft: 'neutral',
          sent: 'accent',
          viewed: 'accent',
          accepted: 'positive',
          declined: 'negative',
          expired: 'neutral',
        }
        const dot = dotMap[status] ?? 'neutral'
        const label = status.charAt(0).toUpperCase() + status.slice(1)
        return <Badge label={label} dot={dot} />
      },
    },
    {
      accessorKey: 'validUntil',
      header: 'Valid Until',
      size: 100,
      cell: ({ getValue }) => <ValidUntilCell date={getValue() as Date} />,
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent',
      size: 100,
      cell: ({ getValue }) => {
        const d = getValue() as Date | undefined
        return (
          <span suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {d ? formatDistanceToNow(d, { addSuffix: true }) : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      size: 1,
      enableHiding: true,
      cell: () => null,
      sortingFn: 'datetime',
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility: { createdAt: false } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
                      {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
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
                transition={{ duration: 0.3, ease: APPLE_EASE, delay: i * 0.03 }}
                onClick={() => onRowClick(row.original)}
                style={{ cursor: 'pointer', transition: 'background 60ms' }}
                className="group h-[52px]"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {row.getVisibleCells().filter(c => c.column.id !== 'createdAt').map((cell) => (
                  <td key={cell.id} style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)' }}>
                  No quotations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
