'use client'

import { format } from 'date-fns'
import { Globe, Users2, BarChart3, Briefcase, MapPin, Tag } from 'lucide-react'
import { SlideOver, DetailField } from '../shared/slide-over'
import { formatINR } from '@/lib/mock/dashboard-data'
import type { Company } from '@/lib/mock/crm-data'

interface CompanySlideOverProps {
  company: Company | null
  onClose: () => void
}

export function CompanySlideOver({ company, onClose }: CompanySlideOverProps) {
  if (!company) return null

  return (
    <SlideOver
      open={!!company}
      onClose={onClose}
      title={company.name}
      subtitle={company.industry}
    >
      {/* Avatar */}
      <div className="mb-6 flex items-center gap-3">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'var(--n-150)',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {company.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {company.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{company.website ?? company.city}</div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { icon: Users2, label: 'Contacts', value: company.totalContacts },
          { icon: Briefcase, label: 'Deals', value: company.totalDeals },
          { icon: BarChart3, label: 'Revenue', value: formatINR(company.totalRevenue) },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface-ground)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <Icon size={14} color="var(--text-tertiary)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Address section */}
      {(company.address || company.gstin) && (
        <>
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin size={11} />
              Address
            </div>
            {company.address && (
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: '19px', marginBottom: 6 }}>
                {company.address}
              </div>
            )}
            {company.gstin && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span style={{ fontWeight: 600 }}>GSTIN:</span>{' '}
                <span style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{company.gstin}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tags */}
      {company.tags.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 16 }} />
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Tag size={11} />
              Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {company.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--surface-ground)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: 20 }} />

      <div className="flex items-center gap-2 mb-4">
        <Globe size={14} color="var(--text-tertiary)" />
        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{company.website ?? '—'}</span>
      </div>

      <DetailField label="Industry" value={company.industry} />
      <DetailField label="Size" value={company.size} />
      <DetailField
        label="Annual Revenue"
        value={formatINR(company.totalRevenue)}
      />
      <DetailField
        label="Since"
        value={format(company.createdAt, 'MMMM d, yyyy')}
      />
    </SlideOver>
  )
}
