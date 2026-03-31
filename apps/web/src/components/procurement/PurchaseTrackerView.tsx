'use client'

import { usePurchasesStore }    from '@/lib/usePurchasesStore'
import { TrackerBrandTabBar }   from './TrackerBrandTabBar'
import { TrackerKPIStrip }      from './TrackerKPIStrip'
import { StatDrillDownPanel }   from './StatDrillDownPanel'
import { CompanyView }          from './CompanyView/CompanyView'
import { CustomerView }         from './CustomerView/CustomerView'
import { PartialMoveModal }     from './PartialMoveModal'

export function PurchaseTrackerView() {
  const viewMode = usePurchasesStore((s) => s.viewMode)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: '#F6F5F2',
    }}>
      {/* Brand tab bar */}
      <TrackerBrandTabBar />

      {/* KPI strip — chips are now clickable */}
      <TrackerKPIStrip />

      {/* Drill-down panel — slides in below KPI strip when a card is open */}
      <StatDrillDownPanel />

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'company'
          ? <CompanyView />
          : <CustomerView />
        }
      </div>

      {/* Move-stage modal — portal-style, always mounted */}
      <PartialMoveModal />
    </div>
  )
}
