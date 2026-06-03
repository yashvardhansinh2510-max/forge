'use client'

import { useEffect, useRef, useState } from 'react'
import {
  STAGE_FRIENDLY_NAME,
  type BrandTab,
  type HeaderCounts,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

const TRANSFERABLE: PurchaseStage[] = ['PENDING_CO', 'PENDING_DIST', 'GODOWN', 'IN_BOX', 'DISPATCHED']

interface ProjectResult {
  id: string
  clientName: string
  projectName: string
  siteAddress?: string | null
}

interface UniversalTransferProps {
  line: PurchaseTrackerLine
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

const REASON_PRESETS = ['Urgent site requirement', 'Customer on hold', 'Stock redistribution']

export default function UniversalTransfer({ line, activeBrand, onMoved }: UniversalTransferProps) {
  const activeStages = TRANSFERABLE.filter((s) => line.stages[s] > 0)

  const [fromStage, setFromStage] = useState<PurchaseStage | null>(activeStages[0] ?? null)
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProjectResult[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFromStage(TRANSFERABLE.filter((s) => line.stages[s] > 0)[0] ?? null)
    setQty(1)
    setReason('')
    setQuery('')
    setSelectedProject(null)
    setErr('')
    setDone('')
  }, [line.id])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/search?q=${encodeURIComponent(query)}`)
        const data = await res.json() as ProjectResult[]
        setResults(data)
        setShowDropdown(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const available = fromStage ? line.stages[fromStage] : 0

  async function doTransfer() {
    if (!fromStage || !reason.trim()) return
    setSaving(true)
    setErr('')
    setDone('')

    const isNew = query.trim() && !selectedProject
    const body = isNew
      ? { mode: 'new', stage: fromStage, qty, newCustomerName: query.trim(), reason, brand: activeBrand }
      : selectedProject
      ? { mode: 'project', stage: fromStage, qty, targetProjectId: selectedProject.id, reason, brand: activeBrand }
      : null

    if (!body) { setErr('Select or type a customer name'); setSaving(false); return }

    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(line.id)}/transfer`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; message?: string; error?: string }
      if (!res.ok || !data.stageTotals) {
        setErr(data.message ?? data.error ?? 'Transfer failed')
        return
      }
      onMoved(data.stageTotals)
      setDone(`Transferred ${qty} unit${qty > 1 ? 's' : ''} to ${isNew ? query.trim() : selectedProject!.clientName}`)
      setQty(1)
      setReason('')
      setQuery('')
      setSelectedProject(null)
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (activeStages.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No transferable stock on this line.</p>
  }

  return (
    <div className="space-y-4">
      {done && (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-2 text-xs text-[#15803d]">✓ {done}</p>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Taking from</p>
        <div className="flex flex-wrap gap-1.5">
          {activeStages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setFromStage(s); setQty(1) }}
              className={[
                'rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
                fromStage === s
                  ? 'border-[#0f172a] bg-[#0f172a] text-white'
                  : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
              ].join(' ')}
            >
              {STAGE_FRIENDLY_NAME[s] ?? s} ({line.stages[s]})
            </button>
          ))}
        </div>
      </div>

      <div ref={searchRef} className="relative">
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Give to customer</p>
        {selectedProject ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-3 py-2">
            <span className="flex-1 text-sm font-semibold text-[#1d4ed8]">{selectedProject.clientName}</span>
            <button
              type="button"
              onClick={() => { setSelectedProject(null); setQuery('') }}
              className="text-xs text-[#2563eb] hover:text-[#1d4ed8]"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer or type a new name…"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#60a5fa]"
          />
        )}

        {showDropdown && results.length > 0 && !selectedProject && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-float)]">
            {results.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => { setSelectedProject(project); setQuery(''); setShowDropdown(false) }}
                className="w-full px-3 py-2.5 text-left hover:bg-[var(--n-50)]"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">{project.clientName}</p>
                {project.siteAddress && (
                  <p className="text-xs text-[var(--text-muted)]">{project.siteAddress}</p>
                )}
              </button>
            ))}
            {query.trim() && (
              <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Or press Transfer to create <strong>"{query.trim()}"</strong> as a new customer
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Quantity</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
          >-</button>
          <input
            type="number"
            value={qty}
            min={1}
            max={available}
            onChange={(e) => {
              const v = Number(e.target.value)
              setQty(Math.min(available, Math.max(1, Number.isFinite(v) ? v : 1)))
            }}
            className="w-14 rounded-xl border border-[var(--border)] py-1.5 text-center text-sm font-bold outline-none focus:border-[#60a5fa]"
          />
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(available, q + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] font-bold transition hover:border-[#60a5fa]"
          >+</button>
          <span className="text-xs text-[var(--text-muted)]">of {available}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Reason</p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Urgent site requirement"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[#60a5fa]"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {REASON_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-md bg-[var(--n-100)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--n-200)]"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="rounded-xl bg-[#fef2f2] p-2 text-xs text-[#dc2626]">{err}</p>}

      <button
        type="button"
        onClick={() => void doTransfer()}
        disabled={saving || !fromStage || (!selectedProject && !query.trim()) || !reason.trim()}
        className="w-full rounded-xl bg-[#0f172a] py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
      >
        {saving ? 'Transferring…' : `Give ${qty} unit${qty > 1 ? 's' : ''} to Customer ↱`}
      </button>
    </div>
  )
}
