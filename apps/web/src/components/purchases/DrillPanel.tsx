'use client'

import { BrandMark } from '@/components/purchases/BrandTabs'
import MovePopover from '@/components/purchases/MovePopover'
import {
  STAGE_COLORS,
  STAGE_LABEL,
  getStageQuantity,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

async function exportDrillToXlsx(
  stage: PurchaseStage,
  lines: PurchaseTrackerLine[],
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(STAGE_LABEL[stage])

  ws.columns = [
    { header: 'SKU', key: 'sku', width: 28 },
    { header: 'Brand', key: 'brand', width: 14 },
    { header: 'Vendor', key: 'vendor', width: 22 },
    { header: 'Qty at Stage', key: 'qty', width: 14 },
    { header: 'Customer', key: 'customer', width: 30 },
  ]

  for (const line of lines) {
    ws.addRow({
      sku: line.product.sku,
      brand: line.product.brand,
      vendor: line.vendorName ?? '—',
      qty: getStageQuantity(line, stage),
      customer: line.customer?.name ?? '—',
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `purchases-${stage.toLowerCase()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

interface DrillPanelProps {
  stage: PurchaseStage | null
  lines: PurchaseTrackerLine[]
  total: number
  activeBrand: BrandTab
  onClose: () => void
  onMoved: (newCounts: HeaderCounts) => void
}

export default function DrillPanel({
  stage,
  lines,
  total,
  activeBrand,
  onClose,
  onMoved,
}: DrillPanelProps) {
  if (!stage) return null

  const accent = STAGE_COLORS[stage]

  return (
    <section
      className="overflow-hidden rounded-[32px] border bg-white shadow-[0_20px_38px_rgba(15,23,42,0.06)]"
      style={{ borderColor: `${accent}35` }}
    >
      <div
        className="border-b px-5 py-4"
        style={{
          borderColor: `${accent}25`,
          background: `linear-gradient(135deg, ${accent}10 0%, white 60%)`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>
              Stage drill-down
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {STAGE_LABEL[stage]} ({total} units)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-secondary)]">
              <BrandMark tab={activeBrand} size="sm" />
              <span>Filtered by current brand tab</span>
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => exportDrillToXlsx(stage, lines)}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[#86efac] hover:text-[#16a34a]"
              >
                ↓ Export .xlsx
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              × Close
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
        {lines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--n-50)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            Nothing is sitting in this stage for the selected brand right now.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={`${line.id}-${stage}`}
              className="flex flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--n-50)] p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                {line.product.imageUrl ? (
                  <img
                    src={line.product.imageUrl}
                    alt={line.product.name}
                    className="h-14 w-14 rounded-2xl border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-white text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {line.product.brand.slice(0, 2)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-[var(--text-primary)]">
                    {line.product.sku}
                  </p>
                  <p className="truncate text-sm text-[var(--text-secondary)]">
                    {line.product.brand} · {line.customer?.name ?? 'No customer linked'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-[var(--text-secondary)]">
                  qty: <strong>{getStageQuantity(line, stage)}</strong>
                </span>
                <MovePopover
                  lineItemId={line.id}
                  productId={line.product.id}
                  currentStage={stage}
                  availableQty={getStageQuantity(line, stage)}
                  onMoved={onMoved}
                  brandScope={activeBrand}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
