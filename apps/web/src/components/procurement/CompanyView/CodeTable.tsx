'use client'

import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore }   from '@/lib/usePurchasesStore'
import { getFilteredLines }    from '@/lib/tracker-utils'
import { CodeTableRow }        from './CodeTableRow'

const TH: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: 10, fontWeight: 700,
  fontFamily: 'var(--font-ui)',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  textAlign: 'left' as const,
  background: '#f9fafb',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap' as const,
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
}

const TH_R: React.CSSProperties = { ...TH, textAlign: 'right' as const }

export function CodeTable() {
  const orders          = useProcurementStore((s) => s.orders)
  const activeBrand     = usePurchasesStore((s) => s.activeBrand)
  const activeCompanies = usePurchasesStore((s) => s.activeCompanies)
  const searchQuery     = usePurchasesStore((s) => s.searchQuery)

  const flatLines = getFilteredLines(orders, activeBrand, activeCompanies, searchQuery)

  if (flatLines.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontSize: 13, fontFamily: 'var(--font-ui)',
      }}>
        No SKUs match the current filters.
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 36 }} />
          <col style={{ width: 240 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 50 }} />
          <col style={{ width: 72 }} />
          <col style={{ width: 78 }} />
          <col style={{ width: 76 }} />
          <col style={{ width: 64 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...TH, paddingLeft: 12 }} />
            <th style={TH}>Product / Code</th>
            <th style={TH}>Company</th>
            <th style={TH_R}>Qty</th>
            <th style={{ ...TH_R, color: '#F5A623' }}>Pend. Co.</th>
            <th style={{ ...TH_R, color: '#E8762C' }}>Pend. Dist.</th>
            <th style={{ ...TH_R, color: '#4A90D9' }}>Godown</th>
            <th style={{ ...TH_R, color: '#7B68EE' }}>In Box</th>
            <th style={{ ...TH_R, color: '#27AE60' }}>Dispatched</th>
            <th style={TH}>Customers</th>
          </tr>
        </thead>
        <tbody>
          {flatLines.map(({ order, line }) => (
            <CodeTableRow key={line.id} order={order} line={line} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
