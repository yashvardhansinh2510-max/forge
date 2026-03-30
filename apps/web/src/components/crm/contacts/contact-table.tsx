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
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { contacts, type Contact } from '@/lib/mock/crm-data'
import { DealStageBadge } from '../shared/status-badge'
import { formatINR } from '@/lib/mock/dashboard-data'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 32 }: { initials: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
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

// ─── Column Definitions ───────────────────────────────────────────────────────

interface ContactTableProps {
  onRowClick: (contact: Contact) => void
  searchQuery: string
}

export function ContactTable({ onRowClick, searchQuery }: ContactTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns: ColumnDef<Contact>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Contact',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar initials={row.original.name.charAt(0)} color={row.original.color} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {row.original.name}
              </div>
              <a href={`mailto:${row.original.email}`} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                {row.original.email}
              </a>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'company',
        header: 'Company',
        cell: ({ getValue }) => (
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => <DealStageBadge stage={row.original.stage} />,
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Revenue',
        cell: ({ getValue }) => {
          const val = getValue() as number
          return (
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 600,
                color: val > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {val > 0 ? formatINR(val) : '—'}
            </span>
          )
        },
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {row.original.owner.name}
          </span>
        ),
      },
      {
        accessorKey: 'lastActivityAt',
        header: 'Last Active',
        cell: ({ getValue }) => (
          <span suppressHydrationWarning style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {formatDistanceToNow(getValue() as Date, { addSuffix: true })}
          </span>
        ),
      },
    ],
    [],
  )

  const filtered = React.useMemo(
    () =>
      searchQuery
        ? contacts.filter(
            (c) =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.company ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.email.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : contacts,
    [searchQuery],
  )

  const table = useReactTable({
    data: filtered,
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
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
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
      {filtered.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-tertiary)',
          }}
        >
          No contacts found
        </div>
      )}
    </div>
  )
}
