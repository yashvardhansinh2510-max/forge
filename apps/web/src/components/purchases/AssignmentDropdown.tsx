'use client'

import { useEffect, useRef, useState } from 'react'
import { UserCheck, X } from 'lucide-react'
import type { Priority } from './PriorityBadge'

interface UserOption {
  id:   string
  name: string
  role: string
}

interface AssignmentDropdownProps {
  lineId:       string
  assignedTo:   { id: string; name: string } | null | undefined
  priority:     string | null | undefined
  onUpdated?:   (assignedTo: { id: string; name: string } | null, priority: string) => void
}

export function AssignmentDropdown({ lineId, assignedTo, priority, onUpdated }: AssignmentDropdownProps) {
  const [open, setOpen]       = useState(false)
  const [users, setUsers]     = useState<UserOption[]>([])
  const [usersFetched, setUsersFetched] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [localPriority, setLocalPriority] = useState<Priority>((priority ?? 'MEDIUM') as Priority)
  const ref = useRef<HTMLDivElement>(null)

  function openDropdown() {
    setOpen((o) => !o)
    if (!usersFetched) {
      setUsersFetched(true)
      fetch('/api/settings/users')
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) setUsers(data as UserOption[])
        })
        .catch(() => {})
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function assign(userId: string | null) {
    setSaving(true)
    await fetch(`/api/purchase-orders/lines/${lineId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: userId }),
    })
    setSaving(false)
    const user = users.find((u) => u.id === userId) ?? null
    onUpdated?.(user, localPriority)
    setOpen(false)
  }

  async function changePriority(p: Priority) {
    setLocalPriority(p)
    setSaving(true)
    await fetch(`/api/purchase-orders/lines/${lineId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: p }),
    })
    setSaving(false)
    onUpdated?.(assignedTo ?? null, p)
  }

  const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition hover:border-[var(--border-strong)] disabled:opacity-50"
        style={{
          borderColor: 'var(--border-default)',
          color:       assignedTo ? 'var(--text-primary)' : 'var(--text-muted)',
          fontFamily:  'var(--font-ui)',
        }}
      >
        <UserCheck size={11} />
        {assignedTo?.name ?? 'Assign'}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          style={{ borderColor: 'var(--border-default)' }}
        >
          {/* Priority selector */}
          <div className="border-b px-3 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Priority
            </p>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void changePriority(p)}
                  className="flex-1 rounded-lg py-1 text-[9px] font-semibold uppercase transition"
                  style={{
                    background: localPriority === p ? '#111827' : 'var(--surface-subtle)',
                    color:      localPriority === p ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {p.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {assignedTo && (
              <button
                type="button"
                onClick={() => void assign(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--surface-subtle)]"
                style={{ color: '#EF4444', fontFamily: 'var(--font-ui)' }}
              >
                <X size={10} />
                Unassign
              </button>
            )}
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => void assign(u.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--surface-subtle)]"
                style={{
                  fontFamily:  'var(--font-ui)',
                  color:        assignedTo?.id === u.id ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight:   assignedTo?.id === u.id ? 600 : 400,
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold uppercase"
                  style={{ background: '#EEF2FF', color: '#6366F1' }}
                >
                  {u.name.slice(0, 1)}
                </span>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
