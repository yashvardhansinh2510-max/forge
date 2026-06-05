'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  BRAND_TABS,
  BRAND_ACCENTS,
  createEmptyBrandCounts,
  createEmptyHeaderCounts,
  getLinePrimaryStatus,
  lineIsReady,
  type BrandTab,
  type HeaderCounts,
  type PurchaseLinesResponse,
  type PurchaseStage,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'
import ContextPanel from '@/components/purchases/ContextPanel'
import WorkspaceTrackStock from '@/components/purchases/WorkspaceTrackStock'
import WorkspaceCustomers from '@/components/purchases/WorkspaceCustomers'
import WorkspaceDispatch from '@/components/purchases/WorkspaceDispatch'
import MoveMaterialModal from '@/components/purchases/MoveMaterialModal'

export type Workspace = 'today' | 'stock' | 'customers'

const WORKSPACE_ITEMS: { id: Workspace; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '▷' },
  { id: 'stock', label: 'Stock', icon: '◈' },
  { id: 'customers', label: 'Customers', icon: '◎' },
]

const WORKSPACE_LABEL: Record<Workspace, string> = {
  today: 'Today',
  stock: 'Stock',
  customers: 'Customers',
}

const fetcher = async (url: string): Promise<PurchaseLinesResponse> => {
  const res = await fetch(url)
  const data = await res.json() as PurchaseLinesResponse | { message?: string }
  if (!res.ok) {
    throw new Error('message' in data && data.message ? data.message : 'Failed to load purchases')
  }
  return data as PurchaseLinesResponse
}

export default function PurchasesWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>('today')
  const [activeBrand, setActiveBrand] = useState<BrandTab>('ALL')
  const [search, setSearch] = useState('')
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [contextPanelTab, setContextPanelTab] = useState<'move' | 'transfer' | 'history'>('move')
  const [headerCounts, setHeaderCounts] = useState<HeaderCounts>(createEmptyHeaderCounts())
  const optimisticLines = useRef<Map<string, PurchaseTrackerLine['stages']>>(new Map())

  // Move Material modal state
  const [moveMaterialOpen, setMoveMaterialOpen] = useState(false)
  const [moveInitialProductId, setMoveInitialProductId] = useState<string | undefined>()
  const [moveInitialLineId, setMoveInitialLineId] = useState<string | undefined>()

  const { data, error, mutate, isLoading } = useSWR(
    `/api/purchase-orders/lines?brand=${encodeURIComponent(activeBrand)}`,
    fetcher,
    { revalidateOnFocus: true },
  )

  useEffect(() => {
    if (data?.headerCounts) {
      setHeaderCounts(data.headerCounts)
      optimisticLines.current.clear()
    }
  }, [data])

  const rawLines = data?.lines ?? []
  const lines: PurchaseTrackerLine[] = rawLines.map((line) => {
    const override = optimisticLines.current.get(line.id)
    return override ? { ...line, stages: override } : line
  })
  const brandCounts = data?.brandCounts ?? createEmptyBrandCounts()

  const searchTerm = search.trim().toLowerCase()
  const filteredLines = searchTerm
    ? lines.filter(
        (l) =>
          l.product.name.toLowerCase().includes(searchTerm) ||
          l.product.sku.toLowerCase().includes(searchTerm) ||
          (l.customer?.name.toLowerCase().includes(searchTerm) ?? false),
      )
    : lines

  const handleMoved = (
    newCounts: HeaderCounts,
    movedLineId?: string,
    fromStage?: PurchaseStage,
    toStage?: PurchaseStage,
    qty?: number,
  ) => {
    setHeaderCounts(newCounts)
    if (movedLineId && fromStage && toStage && qty !== undefined) {
      const existing = lines.find((l) => l.id === movedLineId)
      if (existing) {
        const newStages = { ...existing.stages }
        newStages[fromStage] = Math.max(0, newStages[fromStage] - qty)
        newStages[toStage] = (newStages[toStage] ?? 0) + qty
        optimisticLines.current.set(movedLineId, newStages)
      }
    }
    void mutate()
  }

  const selectedLine = selectedLineId ? lines.find((l) => l.id === selectedLineId) ?? null : null

  // Badges
  const dispatchReadyCount = lines.filter(lineIsReady).length
  const urgentCount = lines.filter((l) => {
    const s = getLinePrimaryStatus(l)
    return s === 'awaiting_company' || s === 'awaiting_distributor'
  }).length

  function handleSelectLine(lineId: string, tab: 'move' | 'transfer' | 'history' = 'move') {
    setSelectedLineId(lineId)
    setContextPanelTab(tab)
  }

  function openMoveMaterial(productId?: string, sourceLineId?: string) {
    setMoveInitialProductId(productId)
    setMoveInitialLineId(sourceLineId)
    setMoveMaterialOpen(true)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Purchases
          </span>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {WORKSPACE_LABEL[workspace]}
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, customer…"
            className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--n-50)] pl-8 pr-9 text-sm outline-none transition focus:border-[#93c5fd] focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openMoveMaterial()}
            className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-[#dbeafe]"
          >
            Move Material →
          </button>
          <Link
            href="/purchases/new"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            + New PO
          </Link>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">
        {/* ── Sidebar ──────────────────────────────── */}
        <aside className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-white">

          {/* Workspaces */}
          <div className="p-3">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              View
            </p>
            {WORKSPACE_ITEMS.map((item) => {
              const active = workspace === item.id
              const badge =
                item.id === 'today' && dispatchReadyCount > 0 ? dispatchReadyCount : 0
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWorkspace(item.id)}
                  className={[
                    'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition',
                    active
                      ? 'bg-[#f0f4ff] text-[#1d4ed8]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--n-50)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs">{item.icon}</span>
                    {item.label}
                  </span>
                  {badge > 0 && (
                    <span className="rounded-full bg-[#10B981] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                  {item.id === 'today' && urgentCount > 0 && badge === 0 && (
                    <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {urgentCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mx-3 border-t border-[var(--border)]" />

          {/* Brand filter */}
          <div className="p-3">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Brand
            </p>
            {BRAND_TABS.map((tab) => {
              const active = activeBrand === tab
              const accent = tab === 'ALL' ? '#2563EB' : BRAND_ACCENTS[tab]
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveBrand(tab)}
                  className={[
                    'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-sm font-medium transition',
                    active
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--n-50)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                  style={active ? { background: `${accent}12`, color: accent } : undefined}
                >
                  <span>{tab === 'HANSGROHE' ? 'H | Axor' : tab}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: active ? `${accent}20` : 'var(--n-100)',
                      color: active ? accent : 'var(--text-muted)',
                    }}
                  >
                    {brandCounts[tab] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="m-3 rounded-xl bg-[#fef2f2] p-2 text-xs text-[#b91c1c]">
              {error.message}
            </div>
          )}

          {isLoading && !data && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-xl bg-[linear-gradient(90deg,#f4f4f3,#ffffff,#f4f4f3)] animate-shimmer" />
              ))}
            </div>
          )}
        </aside>

        {/* ── Main workspace ─────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {workspace === 'today' && (
            <WorkspaceDispatch
              lines={filteredLines}
              onMoved={handleMoved}
              onSelectLine={handleSelectLine}
              onMoveMaterial={openMoveMaterial}
            />
          )}
          {workspace === 'stock' && (
            <WorkspaceTrackStock
              lines={filteredLines}
              allLines={lines}
              activeBrand={activeBrand}
              isLoading={isLoading && !data}
              onMoved={handleMoved}
              onSelectLine={handleSelectLine}
              onMoveMaterial={openMoveMaterial}
            />
          )}
          {workspace === 'customers' && (
            <WorkspaceCustomers
              lines={filteredLines}
              activeBrand={activeBrand}
              onMoved={handleMoved}
              onSelectLine={handleSelectLine}
              onMoveMaterial={openMoveMaterial}
            />
          )}
        </main>

        {/* ── Context panel ──────────────────────────── */}
        {selectedLine && (
          <ContextPanel
            line={selectedLine}
            activeBrand={activeBrand}
            allLines={lines}
            defaultTab={contextPanelTab}
            onClose={() => setSelectedLineId(null)}
            onMoved={handleMoved}
          />
        )}
      </div>

      {/* ── Move Material modal ─────────────────────── */}
      {moveMaterialOpen && (
        <MoveMaterialModal
          lines={lines}
          activeBrand={activeBrand}
          onMoved={(counts) => {
            handleMoved(counts)
          }}
          onClose={() => {
            setMoveMaterialOpen(false)
            setMoveInitialProductId(undefined)
            setMoveInitialLineId(undefined)
          }}
          initialProductId={moveInitialProductId}
          initialSourceLineId={moveInitialLineId}
        />
      )}
    </div>
  )
}
