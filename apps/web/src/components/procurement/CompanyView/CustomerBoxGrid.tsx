'use client'

import type { MockPOLineItem } from '@/lib/mock/procurement-data'
import { CustomerBoxCard } from './CustomerBoxCard'

interface Props {
  poId:   string
  line:   MockPOLineItem
}

export function CustomerBoxGrid({ poId, line }: Props) {
  if (line.customerAllocations.length === 0) {
    return (
      <div style={{
        padding: '16px 20px',
        background: '#fafafa',
        borderBottom: '1px solid #e5e7eb',
        fontSize: 12, color: '#9ca3af', fontFamily: 'var(--font-ui)',
      }}>
        No customer allocations yet. Use the right panel to assign customers.
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px 20px 16px 52px',
      background: '#fafafa',
      borderBottom: '1px solid #e5e7eb',
      borderLeft: '3px solid #e5e7eb',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: '#9ca3af', fontFamily: 'var(--font-ui)',
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        Customer Allocations
      </div>
      <div style={{
        display: 'flex', gap: 10,
        flexWrap: 'wrap',
      }}>
        {line.customerAllocations.map((alloc) => (
          <CustomerBoxCard
            key={alloc.customerId}
            poId={poId}
            lineId={line.id}
            alloc={alloc}
          />
        ))}
      </div>
    </div>
  )
}
