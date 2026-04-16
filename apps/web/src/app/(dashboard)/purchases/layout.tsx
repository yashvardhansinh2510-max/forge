import * as React from 'react'
import PurchasesNav from '@/components/purchases/PurchasesNav'

export const metadata = { title: 'Purchases — Forge' }

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <PurchasesNav />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
