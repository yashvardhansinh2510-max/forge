'use client'

import { Badge } from '@/components/shared/badge'
import type { DealStage } from '@/lib/mock/crm-data'

// DealStage → dot color mapping
const STAGE_DOT: Record<DealStage, 'neutral' | 'positive' | 'negative' | 'caution' | 'accent'> = {
  enquiry:      'neutral',
  site_visit:   'accent',
  sample_sent:  'caution',
  quote_shared: 'accent',
  negotiation:  'accent',
  won:          'positive',
  lost:         'negative',
}

const STAGE_LABELS: Record<DealStage, string> = {
  enquiry:      'Enquiry',
  site_visit:   'Site Visit',
  sample_sent:  'Sample Sent',
  quote_shared: 'Quote Shared',
  negotiation:  'Negotiation',
  won:          'Won',
  lost:         'Lost',
}

// Legacy type kept for compat
export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned'

interface ContactStatusBadgeProps {
  status: ContactStatus
  size?: 'sm' | 'md'
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  const labels: Record<ContactStatus, string> = {
    lead: 'Lead', prospect: 'Prospect', customer: 'Customer', churned: 'Churned',
  }
  return <Badge label={labels[status] ?? status} />
}

interface DealStageBadgeProps {
  stage: DealStage
  size?: 'sm' | 'md'
}

export function DealStageBadge({ stage }: DealStageBadgeProps) {
  return <Badge label={STAGE_LABELS[stage] ?? stage} dot={STAGE_DOT[stage]} />
}
