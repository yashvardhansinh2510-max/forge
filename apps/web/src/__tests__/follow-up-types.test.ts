import { describe, it, expect } from 'vitest'
import { getEffectiveStatus } from '@/lib/follow-up-types'

describe('getEffectiveStatus', () => {
  it('returns won immediately without checking date', () => {
    const past = new Date(Date.now() - 86400_000)
    expect(getEffectiveStatus({ status: 'won', nextFollowUpDate: past })).toBe('won')
  })

  it('returns lost immediately without checking date', () => {
    const past = new Date(Date.now() - 86400_000)
    expect(getEffectiveStatus({ status: 'lost', nextFollowUpDate: past })).toBe('lost')
  })

  it('returns overdue when nextFollowUpDate is in the past and status is open', () => {
    const past = new Date(Date.now() - 86400_000)
    expect(getEffectiveStatus({ status: 'pending', nextFollowUpDate: past })).toBe('overdue')
    expect(getEffectiveStatus({ status: 'contacted', nextFollowUpDate: past })).toBe('overdue')
    expect(getEffectiveStatus({ status: 'interested', nextFollowUpDate: past })).toBe('overdue')
    expect(getEffectiveStatus({ status: 'negotiating', nextFollowUpDate: past })).toBe('overdue')
  })

  it('returns current status when nextFollowUpDate is in the future', () => {
    const future = new Date(Date.now() + 86400_000)
    expect(getEffectiveStatus({ status: 'pending', nextFollowUpDate: future })).toBe('pending')
    expect(getEffectiveStatus({ status: 'negotiating', nextFollowUpDate: future })).toBe('negotiating')
  })

  it('returns overdue unchanged if status is already overdue and date is past', () => {
    const past = new Date(Date.now() - 86400_000)
    // status === 'overdue' but condition checks !== 'overdue', so it falls through to return f.status
    expect(getEffectiveStatus({ status: 'overdue', nextFollowUpDate: past })).toBe('overdue')
  })
})
