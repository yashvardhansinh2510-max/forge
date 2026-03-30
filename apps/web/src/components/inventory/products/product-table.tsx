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
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { StockBadge, TierBadge } from '../shared/stock-badge'
import { StockLevelBar } from '../shared/stock-level-bar'
import { ProductImage } from '../shared/product-image'
import { formatINR } from '@/lib/mock/sales-data'
import { formatQty, type Product } from '@/lib/mock/inventory-data'

const APPLE_EASE = [0.22, 1, 0.36, 1] as const

interface ProductTableProps {
  data: Product[]
  globalFilter: string
  onRowClick: (product: Product) => void
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp size={12} />
  if (sorted === 'desc') return <ChevronDown size={12} />
  return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
}

function marginColor(pct: number): string {
  if (pct >= 40) return 'var(--positive)'
  if (pct >= 25) return 'var(--text-primary)'
  return 'var(--caution)'
}

function stockQtyColor(status: Product['status']): string {
  if (status === 'in_stock') return 'var(--positive)'
  if (status === 'low_stock') return 'var(--caution)'
  return 'var(--negative)'
}

function GstBadge({ rate }: { rate: number }) {
  const is28 = rate === 28
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
        background: is28 ? '#FFF7ED' : '#EFF6FF',
        color: is28 ? '#C2410C' : '#2563EB',
        border: `1px solid ${is28 ? '#FED7AA' : '#BFDBFE'}`,
        fontFamily: 'var(--font-ui)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {rate}%
    </span>
  )
}

export function ProductTable({ data, globalFilter, onRowClick }: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }])

  const columns = React.useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProductImage subCategory={row.original.subCategory} name={row.original.name} size="xs" />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 550,
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}
              >
                {row.original.name}
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
          </div>
        ),
      },
      {
        accessorKey: 'brand',
        header: 'Brand',
        size: 120,
        cell: ({ row }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {row.original.brand}
          </span>
        ),
      },
      {
        accessorKey: 'tier',
        header: 'Tier',
        size: 80,
        cell: ({ row }) => <TierBadge tier={row.original.tier} />,
      },
      {
        accessorKey: 'subCategory',
        header: 'Category',
        size: 140,
        cell: ({ row }) => (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {row.original.subCategory}
          </span>
        ),
      },
      {
        accessorKey: 'totalStock',
        header: 'Stock',
        size: 140,
        cell: ({ row }) => (
          <div style={{ width: 130 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: stockQtyColor(row.original.status),
                }}
              >
                {formatQty(row.original.totalStock, row.original.unit)}
              </span>
              <StockBadge status={row.original.status} />
            </div>
            <StockLevelBar
              current={row.original.totalStock}
              reorderPoint={row.original.reorderPoint}
              status={row.original.status}
            />
          </div>
        ),
      },
      {
        id: 'margin',
        header: 'Margin',
        size: 80,
        enableSorting: false,
        cell: ({ row }) => {
          const { unitPrice, costPrice } = row.original
          const pct = unitPrice > 0 ? ((unitPrice - costPrice) / unitPrice) * 100 : 0
          return (
            <span
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                color: marginColor(pct),
              }}
            >
              {pct.toFixed(0)}%
            </span>
          )
        },
      },
      {
        accessorKey: 'gstRate',
        header: 'GST',
        size: 60,
        cell: ({ getValue }) => <GstBadge rate={getValue() as number} />,
      },
      {
        accessorKey: 'unitPrice',
        header: 'Price',
        size: 100,
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
            fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {formatINR(getValue() as number)}
          </span>
        ),
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
        background: 'var(--surface)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-base)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
                      background: 'var(--n-50)',
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
                transition={{ duration: 0.28, ease: APPLE_EASE, delay: i * 0.02 }}
                onClick={() => onRowClick(row.original)}
                style={{
                  height: 52,
                  cursor: 'pointer',
                  transition: 'background 60ms',
                }}
                className="last:border-0"
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background =
                    'rgba(0,0,0,0.018)'
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
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
