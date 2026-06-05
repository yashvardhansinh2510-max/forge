'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Route } from 'next'

type AuditLog = {
  id: string
  actorId: string | null
  actor: { id: string; name: string } | null
  category: string
  entityType: string | null
  entityId: string | null
  action: string
  status: string
  beforeSnapshot: any
  afterSnapshot: any
  createdAt: string
}

export default function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getEntityHref = (type: string, id: string) => {
    switch (type.toLowerCase()) {
      case 'quotation':
        return `/quotations/${id}`
      case 'purchaseorder':
        return `/procurement/${id}`
      case 'payment':
        return `/payments/${id}`
      case 'project':
        return `/projects/${id}`
      case 'user':
        return `/settings/users`
      default:
        return '#'
    }
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500">
        No audit logs found matching the current filters.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {logs.map(log => {
          const isExpanded = expandedId === log.id
          const hasDetails = log.beforeSnapshot || log.afterSnapshot
          
          return (
            <li key={log.id} className="flex flex-col hover:bg-gray-50 transition-colors">
              <div 
                className={`flex items-center gap-4 p-4 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                  {log.actor?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {log.actor?.name || 'System'}
                    </span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-md">
                      {log.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                      log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                    {log.entityType && (
                      <>
                        <span className="text-gray-400">on</span>
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200">
                          {log.entityType}
                        </span>
                      </>
                    )}
                    {log.entityId && (
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200 truncate max-w-[200px]">
                        #{log.entityId}
                      </span>
                    )}
                    {log.entityType && log.entityId && getEntityHref(log.entityType, log.entityId) !== '#' && (
                      <Link
                        href={getEntityHref(log.entityType, log.entityId) as Route}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-2"
                      >
                        View Entity →
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                  <span className="text-xs font-medium text-gray-500">
                    {format(new Date(log.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(log.createdAt), 'HH:mm:ss')}
                  </span>
                </div>
              </div>

              {isExpanded && hasDetails && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.beforeSnapshot && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Before Snapshot</h4>
                        <pre className="bg-white p-3 rounded-md border border-gray-200 text-xs text-gray-800 overflow-x-auto shadow-inner max-h-[300px] overflow-y-auto">
                          {JSON.stringify(log.beforeSnapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.afterSnapshot && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">After Snapshot</h4>
                        <pre className="bg-white p-3 rounded-md border border-gray-200 text-xs text-gray-800 overflow-x-auto shadow-inner max-h-[300px] overflow-y-auto">
                          {JSON.stringify(log.afterSnapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
