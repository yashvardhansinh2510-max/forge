'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@forge/ui'
import AuditFilters from './AuditFilters'
import AuditTimeline from './AuditTimeline'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function AuditCenterClient() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    category: '',
    entityType: '',
    entityId: '',
    action: '',
    status: '',
    from: '',
    to: '',
  })

  // Build query string
  const queryParams = new URLSearchParams()
  queryParams.set('page', page.toString())
  queryParams.set('limit', '20')
  if (filters.category) queryParams.set('category', filters.category)
  if (filters.entityType) queryParams.set('entityType', filters.entityType)
  if (filters.entityId) queryParams.set('entityId', filters.entityId)
  if (filters.action) queryParams.set('action', filters.action)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.from) queryParams.set('from', filters.from)
  if (filters.to) queryParams.set('to', filters.to)

  const { data, error, isLoading } = useSWR(`/api/audit?${queryParams.toString()}`, fetcher, {
    keepPreviousData: true,
  })

  const handleExport = (format: 'csv' | 'excel') => {
    const exportParams = new URLSearchParams(queryParams)
    exportParams.delete('page')
    exportParams.delete('limit')
    exportParams.set('format', format)
    
    window.location.href = `/api/audit/export?${exportParams.toString()}`
  }

  // When filters change, reset page to 1
  React.useEffect(() => {
    setPage(1)
  }, [filters])

  return (
    <div className="flex flex-col gap-6">
      <AuditFilters 
        filters={filters} 
        setFilters={setFilters} 
        onExport={handleExport}
      />
      
      {error ? (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          Failed to load audit logs. {error.message}
        </div>
      ) : isLoading && !data ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AuditTimeline logs={data?.data || []} />
          
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
