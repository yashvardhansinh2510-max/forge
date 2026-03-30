import * as React from 'react'
import { PurchasesNav } from '@/components/procurement/PurchasesNav'

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PurchasesNav />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
