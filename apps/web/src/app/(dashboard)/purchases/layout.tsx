import * as React from 'react'

export const metadata = { title: 'Purchases — Forge' }

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg)]">
      {children}
    </div>
  )
}
