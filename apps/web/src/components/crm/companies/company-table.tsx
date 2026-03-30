'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { companies, type Company } from '@/lib/mock/crm-data'
import { formatINR } from '@/lib/mock/dashboard-data'

function Avatar({ initials, size = 32 }: { initials: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'var(--n-150)',
        color: 'var(--text-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

interface CompanyTableProps {
  onRowClick: (company: Company) => void
  searchQuery: string
}

export function CompanyTable({ onRowClick, searchQuery }: CompanyTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns: ColumnDef<Company>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Company',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar initials={row.original.name.charAt(0)} color={row.original.color} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {row.original.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {row.original.website ?? row.original.city}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Revenue',
        cell: ({ getValue }) => (
          <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatINR(getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'totalContacts',
        header: 'Contacts',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: 'totalDeals',
        header: 'Deals',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Since',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {format(getValue() as Date, 'MMM yyyy')}
          </span>
        ),
      },
    ],
    [],
  )

  const filtered = React.useMemo(
    () =>
      searchQuery
        ? companies.filter(
            (c) =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.website ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.industry.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : companies,
    [searchQuery],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    background: 'var(--surface-ground)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span style={{ opacity: 0.4 }}>
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp size={11} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown size={11} />
                        ) : (
                          <ArrowUpDown size={11} />
                        )}
                      </span>
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              onClick={() => onRowClick(row.original)}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'background 80ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#FAFAFA'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = ''
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
