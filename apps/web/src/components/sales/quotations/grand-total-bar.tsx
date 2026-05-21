'use client'

import { formatINR } from '@/lib/format'
import type { BuilderRoom } from './room-section'

export function GrandTotalBar({ rooms }: { rooms: BuilderRoom[] }) {
  const grandMRP   = rooms.reduce((s, r) => s + r.items.reduce((rs, i) => rs + i.mrp * i.qty, 0), 0)
  const grandOffer = rooms.reduce((s, r) => s + r.items.reduce((rs, i) => rs + i.offerRate * i.qty, 0), 0)

  return (
    <div style={{
      position: 'sticky', bottom: 0,
      borderTop: '1px solid var(--border-default)',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 32,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MRP Total</span>
        <span style={{ fontSize: 15, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatINR(grandMRP)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offer Total</span>
        <span style={{ fontSize: 18, fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--accent)' }}>
          {formatINR(grandOffer)}
        </span>
      </div>
    </div>
  )
}
