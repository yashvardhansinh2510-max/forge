import ExcelJS from 'exceljs'
import type { PurchaseTrackerLine } from '@/lib/purchases-tracker'

function headerStyle(ws: ExcelJS.Worksheet, row: number, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c)
    cell.font      = { bold: true, size: 10 }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border    = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
  }
}

async function download(wb: ExcelJS.Workbook, filename: string) {
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── By Company (tracker view) ────────────────────────────────────────────────

export async function exportCompanyView(lines: PurchaseTrackerLine[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Forge — Buildcon House'
  const ws = wb.addWorksheet('By Company')

  ws.columns = [
    { header: 'PO #',         key: 'po',         width: 18 },
    { header: 'Vendor',       key: 'vendor',      width: 22 },
    { header: 'Product',      key: 'product',     width: 32 },
    { header: 'SKU',          key: 'sku',         width: 18 },
    { header: 'Brand',        key: 'brand',       width: 14 },
    { header: 'Customer',     key: 'customer',    width: 22 },
    { header: 'Ordered',      key: 'ordered',     width: 10 },
    { header: 'Order In Co.', key: 'orderInCo',   width: 13 },
    { header: 'Co. Billing',  key: 'coBilling',   width: 13 },
    { header: 'Inbox',        key: 'inbox',       width: 10 },
    { header: 'Dispatched',   key: 'dispatched',  width: 13 },
    { header: 'Completed',    key: 'completed',   width: 13 },
  ]

  headerStyle(ws, 1, ws.columns.length)

  for (const l of lines) {
    ws.addRow({
      po:         l.poNumber ?? '',
      vendor:     l.vendorName ?? '',
      product:    l.product.name,
      sku:        l.product.sku,
      brand:      l.product.brand,
      customer:   l.customer?.name ?? '',
      ordered:    l.qtyOrdered,
      orderInCo:  l.stages.ORDER_IN_CO,
      coBilling:  l.stages.CO_BILLING,
      inbox:      l.stages.INBOX,
      dispatched: l.stages.DISPATCHED,
      completed:  l.stages.COMPLETED,
    })
  }

  numericColumns(ws, ['ordered', 'orderInCo', 'coBilling', 'inbox', 'dispatched', 'completed'])
  await download(wb, `purchases-company-${dateStamp()}.xlsx`)
}

// ── By Customer ──────────────────────────────────────────────────────────────

export async function exportCustomerView(lines: PurchaseTrackerLine[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Forge — Buildcon House'
  const ws = wb.addWorksheet('By Customer')

  ws.columns = [
    { header: 'Customer',     key: 'customer',    width: 24 },
    { header: 'Site',         key: 'site',        width: 28 },
    { header: 'Product',      key: 'product',     width: 32 },
    { header: 'SKU',          key: 'sku',         width: 18 },
    { header: 'Brand',        key: 'brand',       width: 14 },
    { header: 'PO #',         key: 'po',          width: 18 },
    { header: 'Ordered',      key: 'ordered',     width: 10 },
    { header: 'Completed',    key: 'completed',   width: 13 },
    { header: 'In Pipeline',  key: 'pipeline',    width: 13 },
    { header: 'Co. Billing',  key: 'coBilling',   width: 13 },
    { header: 'Order In Co.', key: 'orderInCo',   width: 13 },
  ]

  headerStyle(ws, 1, ws.columns.length)

  for (const l of lines) {
    if (!l.customer) continue
    ws.addRow({
      customer:  l.customer.name,
      site:      l.customer.siteAddress ?? '',
      product:   l.product.name,
      sku:       l.product.sku,
      brand:     l.product.brand,
      po:        l.poNumber ?? '',
      ordered:   l.qtyOrdered,
      completed: l.stages.COMPLETED,
      pipeline:  l.stages.INBOX + l.stages.DISPATCHED,
      coBilling: l.stages.CO_BILLING,
      orderInCo: l.stages.ORDER_IN_CO,
    })
  }

  numericColumns(ws, ['ordered', 'completed', 'pipeline', 'coBilling', 'orderInCo'])
  await download(wb, `purchases-customer-${dateStamp()}.xlsx`)
}

// ── Dispatch list ────────────────────────────────────────────────────────────

export async function exportDispatchList(lines: PurchaseTrackerLine[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Forge — Buildcon House'
  const ws = wb.addWorksheet('Dispatch List')

  ws.columns = [
    { header: 'Customer',   key: 'customer',   width: 24 },
    { header: 'Site',       key: 'site',       width: 28 },
    { header: 'Product',    key: 'product',    width: 32 },
    { header: 'SKU',        key: 'sku',        width: 18 },
    { header: 'Brand',      key: 'brand',      width: 14 },
    { header: 'Inbox',      key: 'inbox',      width: 10 },
    { header: 'Dispatched', key: 'dispatched', width: 13 },
  ]

  headerStyle(ws, 1, ws.columns.length)

  const ready = lines.filter((l) => l.stages.INBOX > 0 || l.stages.DISPATCHED > 0)
  for (const l of ready) {
    ws.addRow({
      customer:   l.customer?.name ?? '',
      site:       l.customer?.siteAddress ?? '',
      product:    l.product.name,
      sku:        l.product.sku,
      brand:      l.product.brand,
      inbox:      l.stages.INBOX,
      dispatched: l.stages.DISPATCHED,
    })
  }

  numericColumns(ws, ['inbox', 'dispatched'])
  await download(wb, `dispatch-list-${dateStamp()}.xlsx`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function numericColumns(ws: ExcelJS.Worksheet, keys: string[]) {
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    for (const key of keys) {
      const col = ws.getColumn(key).number
      if (!col) continue
      const c    = row.getCell(col)
      c.alignment = { horizontal: 'center' }
      c.numFmt    = '#,##0'
    }
  })
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}
