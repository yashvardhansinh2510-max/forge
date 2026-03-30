// lib/excelExporter.ts
// Client-side Excel generation using ExcelJS.
// All functions return a Blob suitable for direct download.

import ExcelJS from 'exceljs'
import type { MockPurchaseOrder, MockPOLineItem } from '@/lib/mock/procurement-data'
import type { FlatLine } from '@/lib/tracker-utils'
import type { KPICardKey } from '@/lib/usePurchasesStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FF1F2937' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10,
}

const BODY_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri', size: 10,
}

const BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
}

const STAGE_LABEL: Record<KPICardKey, string> = {
  totalOrdered:    'All Ordered',
  pendingFromCo:   'Pending from Co.',
  pendingFromDist: 'Pending from Dist.',
  atGodown:        'At Godown',
  inBox:           'In Box',
  dispatched:      'Dispatched',
  notDisplayed:    'Not Displayed',
}

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill   = HEADER_FILL
    cell.font   = HEADER_FONT
    cell.border = BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
  })
  row.height = 22
}

function applyBodyRow(row: ExcelJS.Row, shade: boolean) {
  row.eachCell((cell) => {
    cell.font   = BODY_FONT
    cell.border = BORDER
    if (shade) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    }
  })
  row.height = 18
}

async function workbookToBlob(wb: ExcelJS.Workbook): Promise<Blob> {
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export: Stage drill-down (from KPI card panel) ───────────────────────────

/**
 * Exports the lines visible in the KPI stat card drill-down panel.
 * One row per PO line item.
 */
export async function exportStageLines(
  lines:    FlatLine[],
  cardKey:  KPICardKey,
  filename?: string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Forge – Buildcon House'
  wb.created  = new Date()

  const ws = wb.addWorksheet(STAGE_LABEL[cardKey])

  ws.columns = [
    { header: 'PO Number',        key: 'poNumber',        width: 16 },
    { header: 'Vendor',           key: 'vendor',          width: 14 },
    { header: 'Product Name',     key: 'productName',     width: 34 },
    { header: 'SKU',              key: 'sku',             width: 18 },
    { header: 'Brand',            key: 'brand',           width: 12 },
    { header: 'Qty Ordered',      key: 'qtyOrdered',      width: 12 },
    { header: 'Pend. from Co.',   key: 'qtyPendingCo',   width: 14 },
    { header: 'Pend. from Dist.', key: 'qtyPendingDist', width: 16 },
    { header: 'At Godown',        key: 'qtyAtGodown',    width: 12 },
    { header: 'In Box',           key: 'qtyInBox',       width: 10 },
    { header: 'Dispatched',       key: 'qtyDispatched',  width: 12 },
    { header: 'Not Displayed',    key: 'qtyNotDisplayed', width: 14 },
    { header: 'Expected Delivery', key: 'expectedDelivery', width: 18 },
  ]

  applyHeaderRow(ws.getRow(1))

  lines.forEach(({ order, line }, i) => {
    const row = ws.addRow({
      poNumber:        order.poNumber,
      vendor:          order.vendorName ?? '',
      productName:     line.productName,
      sku:             line.productSku,
      brand:           line.productBrand,
      qtyOrdered:      line.qtyOrdered,
      qtyPendingCo:   line.qtyPendingCo,
      qtyPendingDist: line.qtyPendingDist,
      qtyAtGodown:    line.qtyAtGodown,
      qtyInBox:       line.qtyInBox,
      qtyDispatched:  line.qtyDispatched,
      qtyNotDisplayed: line.qtyNotDisplayed,
      expectedDelivery: order.expectedDelivery
        ? new Date(order.expectedDelivery).toLocaleDateString('en-IN')
        : '—',
    })
    applyBodyRow(row, i % 2 === 1)
  })

  // Auto-filter on header
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: ws.columns.length },
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const blob = await workbookToBlob(wb)
  downloadBlob(blob, filename ?? `tracker-${cardKey}-${yyyymmdd()}.xlsx`)
}

// ─── Export: All lines (full tracker view) ────────────────────────────────────

/**
 * Exports every visible line in the tracker (Company View), with all stage qtys.
 */
export async function exportTrackerLines(
  lines:    FlatLine[],
  brandTab: string,
  filename?: string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Forge – Buildcon House'
  wb.created = new Date()

  const ws = wb.addWorksheet('Purchase Tracker')

  ws.columns = [
    { header: 'PO Number',        key: 'poNumber',        width: 16 },
    { header: 'Vendor',           key: 'vendor',          width: 14 },
    { header: 'Product Name',     key: 'productName',     width: 34 },
    { header: 'SKU',              key: 'sku',             width: 18 },
    { header: 'Brand',            key: 'brand',           width: 12 },
    { header: 'Qty Ordered',      key: 'qtyOrdered',      width: 12 },
    { header: 'Pend. from Co.',   key: 'qtyPendingCo',   width: 14 },
    { header: 'Pend. from Dist.', key: 'qtyPendingDist', width: 16 },
    { header: 'At Godown',        key: 'qtyAtGodown',    width: 12 },
    { header: 'In Box',           key: 'qtyInBox',       width: 10 },
    { header: 'Dispatched',       key: 'qtyDispatched',  width: 12 },
    { header: 'Not Displayed',    key: 'qtyNotDisplayed', width: 14 },
    { header: 'Landing Cost',     key: 'landingCost',    width: 14 },
    { header: 'Client Rate',      key: 'clientRate',     width: 14 },
    { header: 'Expected Delivery', key: 'expectedDelivery', width: 18 },
    { header: 'Status',           key: 'status',         width: 18 },
  ]

  applyHeaderRow(ws.getRow(1))

  lines.forEach(({ order, line }, i) => {
    const row = ws.addRow({
      poNumber:        order.poNumber,
      vendor:          order.vendorName ?? '',
      productName:     line.productName,
      sku:             line.productSku,
      brand:           line.productBrand,
      qtyOrdered:      line.qtyOrdered,
      qtyPendingCo:   line.qtyPendingCo,
      qtyPendingDist: line.qtyPendingDist,
      qtyAtGodown:    line.qtyAtGodown,
      qtyInBox:       line.qtyInBox,
      qtyDispatched:  line.qtyDispatched,
      qtyNotDisplayed: line.qtyNotDisplayed,
      landingCost:    line.landingCost ?? '',
      clientRate:     line.clientOfferRate ?? '',
      expectedDelivery: order.expectedDelivery
        ? new Date(order.expectedDelivery).toLocaleDateString('en-IN')
        : '—',
      status: order.status,
    })
    applyBodyRow(row, i % 2 === 1)
  })

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: ws.columns.length },
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const brand = brandTab === 'ALL' ? 'all-brands' : brandTab.toLowerCase()
  const blob  = await workbookToBlob(wb)
  downloadBlob(blob, filename ?? `tracker-${brand}-${yyyymmdd()}.xlsx`)
}

// ─── Export: Customer view (per-customer lines at a stage) ────────────────────

export interface CustomerLineRow {
  order: MockPurchaseOrder
  line:  MockPOLineItem
  customerName: string
  allocQty:     number
  stage:        string
}

/**
 * Exports lines for a single customer, typically shown in the Customer panel.
 */
export async function exportCustomerLines(
  rows:         CustomerLineRow[],
  customerName: string,
  stage:        string,
  filename?:    string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Forge – Buildcon House'
  wb.created = new Date()

  const ws = wb.addWorksheet(`${customerName} – ${stage}`)

  ws.columns = [
    { header: 'PO Number',    key: 'poNumber',    width: 16 },
    { header: 'Vendor',       key: 'vendor',      width: 14 },
    { header: 'Product Name', key: 'productName', width: 34 },
    { header: 'SKU',          key: 'sku',         width: 18 },
    { header: 'Brand',        key: 'brand',       width: 12 },
    { header: 'Alloc. Qty',   key: 'allocQty',    width: 12 },
    { header: 'Stage',        key: 'stage',       width: 18 },
    { header: 'Expected Del.', key: 'expectedDelivery', width: 18 },
  ]

  applyHeaderRow(ws.getRow(1))

  rows.forEach(({ order, line, allocQty, stage: rowStage }, i) => {
    const row = ws.addRow({
      poNumber:        order.poNumber,
      vendor:          order.vendorName ?? '',
      productName:     line.productName,
      sku:             line.productSku,
      brand:           line.productBrand,
      allocQty,
      stage:           rowStage,
      expectedDelivery: order.expectedDelivery
        ? new Date(order.expectedDelivery).toLocaleDateString('en-IN')
        : '—',
    })
    applyBodyRow(row, i % 2 === 1)
  })

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: ws.columns.length },
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const blob = await workbookToBlob(wb)
  downloadBlob(blob, filename ?? `${customerName.replace(/\s+/g, '-')}-${stage}-${yyyymmdd()}.xlsx`)
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function yyyymmdd(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}
