'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckSquare, X, Users, Flag } from 'lucide-react'
import type { Priority } from './PriorityBadge'

interface BulkActionBarProps {
  selectedIds: string[]
  onClear:     () => void
  onRefresh:   () => void
}

type BulkAction = 'priority' | 'assign' | null

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

interface UserOption {
  id:   string
  name: string
}

export function BulkActionBar({ selectedIds, onClear, onRefresh }: BulkActionBarProps) {
  const [activeAction, setActiveAction] = useState<BulkAction>(null)
  const [loading, setLoading]           = useState(false)
  const [users, setUsers]               = useState<UserOption[]>([])
  const [usersFetched, setUsersFetched] = useState(false)

  useEffect(() => {
    if (activeAction === 'assign' && !usersFetched) {
      setUsersFetched(true)
      fetch('/api/settings/users')
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data)) setUsers(data as UserOption[])
        })
        .catch(() => {})
    }
  }, [activeAction, usersFetched])

  if (selectedIds.length === 0) return null

  async function applyPriority(priority: Priority) {
    setLoading(true)
    await fetch('/api/purchase-orders/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'priority', lineIds: selectedIds, priority }),
    })
    setLoading(false)
    setActiveAction(null)
    onClear()
    onRefresh()
  }

  async function applyAssign(assignedToId: string | null) {
    setLoading(true)
    await fetch('/api/purchase-orders/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', lineIds: selectedIds, assignedToId }),
    })
    setLoading(false)
    setActiveAction(null)
    onClear()
    onRefresh()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        <div
          className="relative flex items-center gap-3 rounded-2xl border bg-[#111827] px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {/* Count */}
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-blue-400" />
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
              {selectedIds.length} selected
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ActionBtn
              icon={<Flag size={12} />}
              label="Priority"
              active={activeAction === 'priority'}
              onClick={() => setActiveAction(activeAction === 'priority' ? null : 'priority')}
            />
            <ActionBtn
              icon={<Users size={12} />}
              label="Assign"
              active={activeAction === 'assign'}
              onClick={() => setActiveAction(activeAction === 'assign' ? null : 'assign')}
            />
          </div>

          {/* Priority sub-panel */}
          <AnimatePresence>
            {activeAction === 'priority' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-xl border border-white/10 bg-[#1F2937] p-1.5"
              >
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    onClick={() => void applyPriority(p)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assign sub-panel */}
          <AnimatePresence>
            {activeAction === 'assign' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                className="absolute bottom-full left-0 mb-2 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#1F2937]"
              >
                <div className="max-h-48 overflow-y-auto py-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void applyAssign(null)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-400 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    <X size={10} />
                    Unassign
                  </button>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      disabled={loading}
                      onClick={() => void applyAssign(u.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-[9px] font-semibold text-indigo-300"
                      >
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                      {u.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-4 w-px bg-white/20" />

          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 transition hover:text-white"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ActionBtn({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition"
      style={{
        background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
