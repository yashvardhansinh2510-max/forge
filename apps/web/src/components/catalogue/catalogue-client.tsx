'use client'

import * as React from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'

export function CatalogueClient() {
  const actions = (
    <Button size="sm" onClick={() => toast.success('Catalogue builder coming soon')}>
      <Plus size={14} className="mr-1.5" />
      New Catalogue
    </Button>
  )

  return (
    <PageContainer
      title="Catalogue"
      subtitle="Generate and share product catalogues with clients"
      actions={actions}
    >
      {/* Empty state */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 360,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--n-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BookOpen size={28} color="var(--text-tertiary)" />
        </div>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
            }}
          >
            No catalogues yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Create your first product catalogue to share with clients
          </p>
          <Button size="sm" onClick={() => toast.success('Catalogue builder coming soon')}>
            <Plus size={14} className="mr-1.5" />
            New Catalogue
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
