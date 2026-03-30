'use client'

import { CustomerListPanel }  from './CustomerListPanel'
import { CustomerDetailPanel } from './CustomerDetailPanel'

export function CustomerView() {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <CustomerListPanel />
      <CustomerDetailPanel />
    </div>
  )
}
