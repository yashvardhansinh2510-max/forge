'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Building2, FileText, Smartphone, Wallet, CreditCard } from 'lucide-react'
import { formatINR } from '@/lib/mock/sales-data'
import type { Payment, PaymentMethod } from '@/lib/mock/sales-data'

interface PaymentsTableProps {
  data: Payment[]
  globalFilter: string
}

const METHOD_CONFIG: Record<PaymentMethod, { icon: React.ReactNode; label: string }> = {
  bank_transfer: { icon: <Building2 size={14} />, label: 'Bank Transfer' },
  cheque: { icon: <FileText size={14} />, label: 'Cheque' },
  upi: { icon: <Smartphone size={14} />, label: 'UPI' },
  cash: { icon: <Wallet size={14} />, label: 'Cash' },
  credit_card: { icon: <CreditCard size={14} />, label: 'Credit Card' },
}

export function PaymentsTable({ data, globalFilter }: PaymentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'receivedAt', desc: true }])

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: 'invoiceNumber',
        accessorKey: 'invoiceNumber',
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
        cell: ({ getValue }) => (
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        size: 130,
        cell: ({ getValue }) => (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 13,
              color: '#15803D',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatINR(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'method',
        accessorKey: 'method',
        header: 'Method',
        size: 140,
        cell: ({ getValue }) => {
          const method = getValue() as PaymentMethod
          const config = METHOD_CONFIG[method]
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>{config.icon}</span>
              {config.label}
            </div>
          )
        },
      },
      {
        id: 'reference',
        accessorKey: 'reference',
        header: 'Reference',
        size: 160,
        cell: ({ getValue }) => (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'received',
        accessorKey: 'receivedAt',
        header: 'Received',
        size: 120,
        cell: ({ getValue }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {format(new Date(getValue() as Date), 'dd MMM yyyy')}
          </span>
        ),
      },
      {
        id: 'receivedAt',
        accessorKey: 'receivedAt',
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
    state: { sorting, globalFilter, columnVisibility: { receivedAt: false } },
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
                if (header.id === 'receivedAt') return null
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
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {row.getVisibleCells().map((cell) => {
                if (cell.column.id === 'receivedAt') return null
                return (
                  <td
                    key={cell.id}
                    style={{ padding: '12px 16px', verticalAlign: 'middle' }}
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
                No payments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
