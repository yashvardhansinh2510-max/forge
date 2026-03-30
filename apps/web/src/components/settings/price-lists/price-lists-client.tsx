'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'
import { Badge } from '@/components/shared/badge'
import { priceLists } from '@/lib/mock/price-lists-data'

export function PriceListsClient() {
  return (
    <PageContainer
      title="Price Lists"
      subtitle="3 active price lists"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        {priceLists.map((pl) => (
          <div
            key={pl.id}
            style={{
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-base)',
              borderRadius: 'var(--r-md)',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            {/* Left: name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {pl.name}
                </span>
                {pl.isDefault && <Badge label="default" />}
                {pl.discountPercent > 0 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {pl.discountPercent}% below MRP
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                {pl.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {pl.productCount} products
                </span>
                <span style={{ fontSize: 11, color: 'var(--border)', userSelect: 'none' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Applies to:</span>
                {pl.appliesTo.map((tag) => (
                  <Badge key={tag} label={tag} />
                ))}
              </div>
            </div>

            {/* Right: Edit button */}
            <div style={{ flexShrink: 0 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.info('Edit coming soon')}
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
