import {
  formatRelativeTime,
  getLineDispatchStatuses,
  getLinePrimaryStatus,
  DISPATCH_STATUS_LABEL,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

export function exportToCSV(lines: PurchaseTrackerLine[], filename = 'stock-export.csv'): void {
  const headers = [
    'Product', 'SKU', 'Finish', 'Brand',
    'Customer', 'Project',
    'Stage', 'Qty Ordered', 'Qty at Stage',
    'Location', 'Last Activity', 'Age (days)',
  ]

  const rows = lines.map((l) => {
    const primary    = getLinePrimaryStatus(l)
    const primaryQty = getLineDispatchStatuses(l).find((s) => s.status === primary)?.qty ?? 0
    const ageDays    = l.createdAt
      ? Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86_400_000)
      : ''
    const lastActivity = l.lastActivityAt
      ? formatRelativeTime(new Date(l.lastActivityAt))
      : ''

    return [
      l.product.name,
      l.product.sku,
      l.product.finishName ?? '',
      l.product.brand,
      l.customer?.name ?? '',
      l.customer?.siteAddress ?? '',
      DISPATCH_STATUS_LABEL[primary],
      l.qtyOrdered,
      primaryQty,
      l.currentLocation ?? '',
      lastActivity,
      ageDays,
    ]
  })

  // UTF-8 BOM ensures Excel opens CSV correctly (handles ₹ and Indian brand names)
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
