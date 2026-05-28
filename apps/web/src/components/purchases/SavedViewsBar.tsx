'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Plus, X } from 'lucide-react'
import type { PurchaseFilters } from './FilterBar'

const STORAGE_KEY = 'forge-purchase-saved-views'

export interface SavedView {
  id:      string
  name:    string
  filters: PurchaseFilters
}

const PRESET_VIEWS: SavedView[] = [
  {
    id: 'preset-pending-dispatch',
    name: 'Pending Dispatch',
    filters: { search: '', supplier: '', customer: '', stage: 'INBOX' },
  },
  {
    id: 'preset-urgent',
    name: 'Urgent Orders',
    filters: { search: '', supplier: '', customer: '', stage: '' },
  },
  {
    id: 'preset-billing',
    name: 'Billing Queue',
    filters: { search: '', supplier: '', customer: '', stage: 'CO_BILLING' },
  },
]

interface SavedViewsBarProps {
  currentFilters: PurchaseFilters
  onApply:        (filters: PurchaseFilters) => void
}

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedView[]) : []
  } catch {
    return []
  }
}

function saveViews(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {}
}

export function SavedViewsBar({ currentFilters, onApply }: SavedViewsBarProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [naming, setNaming]         = useState(false)
  const [newName, setNewName]       = useState('')

  useEffect(() => {
    setSavedViews(loadViews())
  }, [])

  const allViews = [...PRESET_VIEWS, ...savedViews]

  function applyView(view: SavedView) {
    onApply(view.filters)
  }

  function saveCurrentView() {
    if (!newName.trim()) return
    const view: SavedView = {
      id:      `custom-${Date.now()}`,
      name:    newName.trim(),
      filters: currentFilters,
    }
    const updated = [...savedViews, view]
    setSavedViews(updated)
    saveViews(updated)
    setNaming(false)
    setNewName('')
  }

  function deleteView(id: string) {
    const updated = savedViews.filter((v) => v.id !== id)
    setSavedViews(updated)
    saveViews(updated)
    if (activeId === id) setActiveId(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        <Bookmark size={10} />
        Views
      </div>

      {allViews.map((view) => {
        const isPreset  = view.id.startsWith('preset-')
        const isActive  = activeId === view.id
        return (
          <div key={view.id} className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => { applyView(view); setActiveId(isActive ? null : view.id); }}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
              style={{
                borderColor: isActive ? '#111827' : 'var(--border-default)',
                background:  isActive ? '#111827' : 'var(--surface)',
                color:       isActive ? 'white'   : 'var(--text-secondary)',
              }}
            >
              {view.name}
            </button>
            {!isPreset && (
              <button
                type="button"
                onClick={() => deleteView(view.id)}
                className="rounded-full p-0.5 transition hover:bg-red-50"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={9} />
              </button>
            )}
          </div>
        )
      })}

      {naming ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCurrentView()
              if (e.key === 'Escape') { setNaming(false); setNewName('') }
            }}
            placeholder="View name…"
            className="rounded-full border px-3 py-1 text-xs focus:outline-none focus:ring-1"
            style={{
              borderColor: 'var(--border-default)',
              width: 120,
              fontFamily: 'var(--font-ui)',
            }}
          />
          <button
            type="button"
            onClick={saveCurrentView}
            className="rounded-full bg-[#111827] px-3 py-1 text-xs font-medium text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setNaming(false); setNewName('') }}
            className="rounded-full px-2 py-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs transition hover:border-solid"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
        >
          <Plus size={10} />
          Save current
        </button>
      )}
    </div>
  )
}
