'use client'

import * as React from 'react'
import { Search, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { CRMNav } from '../shared/crm-nav'
import { CompanyTable } from './company-table'
import { CompanySlideOver } from './company-slide-over'
import { companies, type Company } from '@/lib/mock/crm-data'

export function CompaniesClient() {
  const [selected, setSelected] = React.useState<Company | null>(null)
  const [search, setSearch] = React.useState('')

  const actions = (
    <Button size="sm" onClick={() => toast.success('Add company coming soon')}>
      <Building2 size={14} className="mr-1.5" />
      Add Company
    </Button>
  )

  return (
    <PageContainer
      title="CRM"
      subtitle={`${companies.length} companies`}
      actions={actions}
    >
      <CRMNav />

      <div className="mb-4 flex items-center gap-3">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'white',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            padding: '0 12px',
            height: 34,
            flex: 1,
            maxWidth: 320,
          }}
        >
          <Search size={13} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'transparent',
              width: '100%',
            }}
          />
        </div>
      </div>

      <CompanyTable onRowClick={setSelected} searchQuery={search} />

      <CompanySlideOver company={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  )
}
