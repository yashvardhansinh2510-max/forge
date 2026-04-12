'use client'

import { useRole } from '@/lib/use-role'
import PaymentsClient from '@/components/payments/PaymentsClient'
import { Lock } from 'lucide-react'

export default function PaymentsPage() {
  const { canViewPayments } = useRole()

  if (!canViewPayments) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(239,68,68,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={24} style={{ color: '#EF4444' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Access Restricted
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Payments is only available to Owners and Managers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-5 pb-10" style={{ minHeight: '100%' }}>
        <PaymentsClient />
      </div>
    </div>
  )
}
