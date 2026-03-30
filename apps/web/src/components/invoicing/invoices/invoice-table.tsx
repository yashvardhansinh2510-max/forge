'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { isPast } from 'date-fns'
import { format } from 'date-fns'
import { Badge } from '@/components/shared/badge'
import { calcDocumentTotals, formatINR } from '@/lib/mock/sales-data'
import type { Invoice } from '@/lib/mock/sales-data'

interface InvoiceTableProps {
  data: Invoice[]
  globalFilter: string
  onRowClick: (inv: Invoice) => void
}

function abbreviateINR(value: number): string {
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(2)}L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`
  return formatINR(value)
}

export function InvoiceTable({ data, globalFilter, onRowClick }: InvoiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        id: 'number',
        accessorKey: 'number',
        header: '#',
        size: 130,
        cell: ({ getValue }) => (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'customer',
        accessorKey: 'customerName',
        header: 'Customer',
        size: 220,
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              {row.original.customerName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
            >
              {row.original.billingAddress}
            </div>
          </div>
        ),
      },
      {
        id: 'value',
        header: 'Value',
        size: 110,
        accessorFn: (row) => calcDocumentTotals(row.lineItems).grandTotal,
        cell: ({ getValue }) => (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {abbreviateINR(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'paid',
        header: 'Paid',
        size: 140,
        accessorFn: (row) => row.paidAmount,
        cell: ({ row }) => {
          const totals = calcDocumentTotals(row.original.lineItems)
          const grand = totals.grandTotal
          const paid = row.original.paidAmount
          const status = row.original.status

          if (status === 'paid') {
            return (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
                Paid in full
              </span>
            )
          }

          if (paid > 0) {
            const pct = Math.min((paid / grand) * 100, 100)
            return (
              <div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--n-150)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'var(--caution)',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {abbreviateINR(paid)} / {abbreviateINR(grand)}
                </span>
              </div>
            )
          }

          return <span style={{ color: 'var(--text-tertiary)' }}>—</span>
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        size: 110,
        cell: ({ getValue }) => {
          const status = getValue() as string
          const dotMap: Record<string, 'positive' | 'accent' | 'negative' | 'caution' | 'neutral'> = {
            paid: 'positive',
            sent: 'accent',
            overdue: 'negative',
            partial: 'caution',
            draft: 'neutral',
          }
          const dot = dotMap[status] ?? 'neutral'
          const label = status.charAt(0).toUpperCase() + status.slice(1)
          return <Badge label={label} dot={dot} />
        },
      },
      {
        id: 'dueDate',
        accessorKey: 'dueDate',
        header: 'Due',
        size: 100,
        cell: ({ getValue, row }) => {
          const date = new Date(getValue() as string)
          const overdue = row.original.status === 'overdue' && isPast(date)
          return (
            <span
              style={{
                fontSize: 13,
                color: overdue ? 'var(--negative)' : 'var(--text-muted)',
                fontWeight: overdue ? 600 : 400,
              }}
            >
              {format(date, 'dd MMM yyyy')}
            </span>
          )
        },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: '',
        size: 0,
        enableHiding: true,
      },
    ],
    []
  )

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
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {hg.headers.map((header) => {
                if (header.id === 'createdAt') return null
                return (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc'
                      ? ' ↑'
                      : header.column.getIsSorted() === 'desc'
                        ? ' ↓'
                        : ''}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => onRowClick(row.original)}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background =
                  'rgba(0,0,0,0.02)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
              }}
            >
              {row.getVisibleCells().map((cell) => {
                if (cell.column.id === 'createdAt') return null
                return (
                  <td
                    key={cell.id}
                    style={{
                      padding: '12px 16px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </motion.tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 14,
                }}
              >
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
