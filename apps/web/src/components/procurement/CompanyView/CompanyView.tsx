'use client'

import { useState } from 'react'
import { useProcurementStore } from '@/lib/procurement-store'
import { usePurchasesStore } from '@/lib/usePurchasesStore'
import { getFilteredLines } from '@/lib/tracker-utils'
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
  const activeBrand    = usePurchasesStore((s) => s.activeBrand)
  const activeCompanies = usePurchasesStore((s) => s.activeCompanies)
  const orders         = useProcurementStore((s) => s.orders)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const { exportTrackerLines } = await import('@/lib/excelExporter')
      const lines = getFilteredLines(orders, activeBrand, activeCompanies, searchQuery)
      await exportTrackerLines(lines, activeBrand)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <TrackerSidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E8E6E1',
          flexShrink: 0,
        }}>
          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: '#F0EFEB',
            borderRadius: 8, padding: 2, marginRight: 4,
          }}>
            {(['company', 'customer'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 14px',
                  border: 'none', borderRadius: 6,
                  fontSize: 11, fontWeight: 600,
                  fontFamily: "'Manrope', sans-serif",
                  cursor: 'pointer',
                  background: viewMode === mode ? '#FFFFFF' : 'transparent',
                  color: viewMode === mode ? '#1C1F1D' : '#5C635E',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                  letterSpacing: '0.02em',
                }}
              >
                {mode === 'company' ? 'Company View' : 'Customer View'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <svg style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              width: 14, height: 14, color: '#8F9691', pointerEvents: 'none',
            }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Search SKU or product name…"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: '1px solid #E8E6E1', borderRadius: 8,
                fontSize: 12, fontFamily: "'Manrope', sans-serif", color: '#1C1F1D',
                background: '#F6F5F2', outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#B87333' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E8E6E1' }}
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
          <button
            onClick={handleExport}
            disabled={exporting}
            data-testid="tracker-export-excel"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              border: '1px solid #E8E6E1',
              background: '#FFFFFF', borderRadius: 8,
              fontSize: 11, fontFamily: "'Manrope', sans-serif",
              color: '#2A6A4E', cursor: 'pointer', fontWeight: 700,
              transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export'}
          </button>

          {/* Mark Received */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            border: 'none',
            background: '#1C1F1D', borderRadius: 8,
            fontSize: 11, fontFamily: "'Manrope', sans-serif",
            color: '#fff', cursor: 'pointer', fontWeight: 600,
            letterSpacing: '0.02em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2C302D' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1C1F1D' }}
          >
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
