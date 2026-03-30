'use client'

import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { TrackerSidebar }    from '../TrackerSidebar'
import { CodeTable }         from './CodeTable'
import { SkuDetailPanel }    from './SkuDetailPanel'
import type { ViewMode }     from '@/lib/usePurchasesStore'

export function CompanyView() {
  const searchQuery    = usePurchasesStore((s) => s.searchQuery)
  const setSearch      = usePurchasesStore((s) => s.setSearch)
  const clearSearch    = usePurchasesStore((s) => s.clearSearch)
  const setViewMode    = usePurchasesStore((s) => s.setViewMode)
  const viewMode       = usePurchasesStore((s) => s.viewMode)
  const selectedLineId = usePurchasesStore((s) => s.selectedLineId)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <TrackerSidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}>
          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: 7, padding: 2, marginRight: 4,
          }}>
            {(['company', 'customer'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '4px 12px',
                  border: 'none', borderRadius: 5,
                  fontSize: 11, fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  background: viewMode === mode ? '#ffffff' : 'transparent',
                  color: viewMode === mode ? '#111827' : '#6b7280',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {mode === 'company' ? 'Company View' : 'Customer View'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <span style={{
              position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: '#9ca3af', pointerEvents: 'none',
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search SKU or product name…"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                border: '1px solid #e5e7eb', borderRadius: 7,
                fontSize: 12, fontFamily: 'var(--font-ui)', color: '#111827',
                background: '#f9fafb', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#9ca3af', lineHeight: 1, padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Export button */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px',
            border: '1px solid #e5e7eb',
            background: '#fff', borderRadius: 7,
            fontSize: 11, fontFamily: 'var(--font-ui)',
            color: '#6b7280', cursor: 'pointer',
          }}>
            <span>↓</span> Export
          </button>

          {/* Mark Received */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px',
            border: 'none',
            background: '#111827', borderRadius: 7,
            fontSize: 11, fontFamily: 'var(--font-ui)',
            color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>
            + Mark Received
          </button>
        </div>

        {/* Table area + right panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <CodeTable />
          {selectedLineId && <SkuDetailPanel />}
        </div>
      </div>
    </div>
  )
}
