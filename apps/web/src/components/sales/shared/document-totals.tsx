import { calcDocumentTotals, type LineItem } from '@/lib/mock/sales-data'
import { formatINR } from '@/lib/mock/dashboard-data'

interface DocumentTotalsProps {
  lineItems: LineItem[]
  compact?: boolean
}

export function DocumentTotals({ lineItems, compact = false }: DocumentTotalsProps) {
  const t = calcDocumentTotals(lineItems)

  // Group GST by rate
  const gstGroups = new Map<number, number>()
  for (const item of lineItems) {
    const { taxableAmt, gstAmt } = calcLineItemLocal(item)
    gstGroups.set(item.gstRate, (gstGroups.get(item.gstRate) ?? 0) + gstAmt)
  }

  function calcLineItemLocal(item: LineItem) {
    const subtotal = item.qty * item.unitPrice
    const discountAmt = subtotal * (item.discount / 100)
    const taxableAmt = subtotal - discountAmt
    const gstAmt = taxableAmt * (item.gstRate / 100)
    return { taxableAmt, gstAmt }
  }

  const row = (label: string, value: string, muted = true, large = false) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: compact ? '3px 0' : '4px 0',
      }}
    >
      <span
        style={{
          fontSize: large ? 14 : 13,
          color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
          fontWeight: large ? 700 : 400,
          letterSpacing: large ? '-0.01em' : 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: large ? 16 : 13,
          fontFamily: 'var(--font-ui)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: large ? 700 : 600,
          color: large ? 'var(--text-primary)' : muted ? 'var(--text-secondary)' : 'var(--text-primary)',
          letterSpacing: large ? '-0.02em' : 0,
        }}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div style={{ minWidth: 260 }}>
      {row('Subtotal', formatINR(t.subtotal))}
      {t.totalDiscount > 0 && row('Total Discount', `−${formatINR(t.totalDiscount)}`)}
      {row('Taxable Amount', formatINR(t.taxableAmt), false)}

      {/* GST by rate — CGST + SGST split */}
      {Array.from(gstGroups.entries()).map(([rate, gstAmt]) => (
        <div key={rate}>
          {row(`CGST @ ${rate / 2}%`, formatINR(gstAmt / 2))}
          {row(`SGST @ ${rate / 2}%`, formatINR(gstAmt / 2))}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border-default)', margin: '6px 0' }} />
      {row('Grand Total', formatINR(t.grandTotal), false, true)}
    </div>
  )
}
