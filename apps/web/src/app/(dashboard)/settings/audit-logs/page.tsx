'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { PageContainer } from '@/components/layout/page-container'

type AuditEntry = {
  id: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string | null
  payload: unknown
  ip: string | null
  createdAt: string
}

type AuditResponse = {
  logs: AuditEntry[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const ACTION_COLORS: Record<string, string> = {
  move_stage:    '#6366F1',
  assign:        '#F59E0B',
  bulk_action:   '#8B5CF6',
  role_change:   '#EF4444',
  user_disabled: '#EF4444',
  user_enabled:  '#10B981',
  transfer:      '#06B6D4',
  note_add:      '#10B981',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? '#9CA3AF'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
      style={{ background: `${color}18`, color, fontFamily: 'var(--font-ui)' }}
    >
      {action.replace(/_/g, ' ')}
    </span>
  )
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/audit-logs?page=${page}&limit=50`)
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return }
        const json = await r.json() as AuditResponse
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page])

  if (forbidden) {
    return (
      <PageContainer title="Audit Logs" subtitle="You don't have permission to view audit logs.">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Requires Owner or Admin role.
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Audit Logs"
      subtitle="All user actions across the platform, in chronological order."
    >
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-subtle)' }}>
              {['When', 'User', 'Action', 'Entity', 'ID', 'IP'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 animate-pulse rounded bg-[var(--n-100)]" style={{ width: j === 0 ? 80 : j === 1 ? 100 : 60 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No audit log entries yet.
                </td>
              </tr>
            ) : (
              data?.logs.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: i < (data.logs.length - 1) ? '1px solid var(--border-default)' : undefined }}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                    {entry.userName}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                    {entry.entityType}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.entityId ? entry.entityId.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.ip ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ fontFamily: 'var(--font-ui)' }}>
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} entries
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-subtle)] disabled:opacity-40"
              style={{ borderColor: 'var(--border-default)', fontFamily: 'var(--font-ui)' }}
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-subtle)] disabled:opacity-40"
              style={{ borderColor: 'var(--border-default)', fontFamily: 'var(--font-ui)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
