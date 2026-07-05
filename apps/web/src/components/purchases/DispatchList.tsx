'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  STAGE_COLORS,
  type BrandTab,
  type HeaderCounts,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

type ReadyStage = 'INBOX' | 'DISPATCHED'

interface ReadyLine {
  line: PurchaseTrackerLine
  stage: ReadyStage
  qty: number
}

interface CustomerGroup {
  id: string
  name: string
  siteAddress: string | null
  items: ReadyLine[]
}

type DateFilter = 'all' | 'today'

function StagePill({ stage }: { stage: ReadyStage }) {
  const config = {
    INBOX:      { label: 'Inbox',      color: STAGE_COLORS.INBOX },
    DISPATCHED: { label: 'Dispatched', color: STAGE_COLORS.DISPATCHED },
  }[stage]

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${config.color}18`, color: config.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  )
}

interface DispatchRowProps {
  item: ReadyLine
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

function DispatchRow({ item, onMoved }: DispatchRowProps) {
  const [dispatching, setDispatching] = useState(false)

  const nextStage = item.stage === 'INBOX' ? 'DISPATCHED' : 'COMPLETED'
  const actionLabel = item.stage === 'INBOX' ? 'Mark Dispatched' : 'Mark Completed'

  async function handleAction() {
    setDispatching(true)
    try {
      const res = await fetch(
        `/api/purchase-orders/lines/${encodeURIComponent(item.line.id)}/move-stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStage: item.stage,
            toStage: nextStage,
            qty: item.qty,
          }),
        },
      )
      const data = await res.json() as { stageTotals?: HeaderCounts; error?: string; message?: string }
      if (!res.ok || !data.stageTotals) {
        toast.error(data.message ?? data.error ?? 'Failed')
        return
      }
      onMoved(data.stageTotals)
      toast.success(
        nextStage === 'COMPLETED'
          ? `${item.qty} unit${item.qty !== 1 ? 's' : ''} completed`
          : `${item.qty} unit${item.qty !== 1 ? 's' : ''} dispatched`,
      )
    } catch {
      toast.error('Network error')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="flex items-center gap-4 border-t border-[var(--border)] px-5 py-3.5 transition hover:bg-[var(--n-50)]">
      {item.line.product.imageUrl ? (
        <img
          src={item.line.product.imageUrl}
          alt={item.line.product.name}
          className="h-10 w-10 shrink-0 rounded-xl border border-[var(--border)] object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--n-100)] text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
          {item.line.product.brand.slice(0, 2)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {item.line.product.name}
        </p>
        <p
          className="text-xs text-[var(--text-muted)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {item.line.product.sku} · {item.line.product.brand}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <StagePill stage={item.stage} />
        <span
          className="text-sm font-semibold tabular-nums text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
        >
          {item.qty} unit{item.qty !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => void handleAction()}
          disabled={dispatching}
          className={[
            'rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-40',
            item.stage === 'DISPATCHED'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border border-[var(--border)] bg-[var(--n-50)] text-[var(--text-secondary)] hover:bg-white hover:text-[var(--text-primary)]',
          ].join(' ')}
        >
          {dispatching ? 'Saving…' : actionLabel}
        </button>
      </div>
    </div>
  )
}

interface DispatchListProps {
  lines: PurchaseTrackerLine[]
  activeBrand: BrandTab
  onMoved: (newCounts: HeaderCounts) => void
}

export default function DispatchList({ lines, activeBrand, onMoved }: DispatchListProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customerSearch, setCustomerSearch] = useState('')

  const today = new Date().toDateString()

  const readyLines: ReadyLine[] = lines.flatMap((line) => {
    const items: ReadyLine[] = []
    if (line.stages.INBOX > 0) {
      items.push({ line, stage: 'INBOX', qty: line.stages.INBOX })
    }
    if (line.stages.DISPATCHED > 0) {
      items.push({ line, stage: 'DISPATCHED', qty: line.stages.DISPATCHED })
    }
    return items
  }).filter((item) => {
    if (dateFilter === 'today' && item.line.createdAt) {
      return new Date(item.line.createdAt).toDateString() === today
    }
    return true
  })

  const groups = readyLines.reduce<Record<string, CustomerGroup>>((acc, item) => {
    const customer = item.line.customer
    const key = customer?.id ?? '__no_customer__'
    const name = customer?.name ?? 'No customer linked'

    if (!acc[key]) {
      acc[key] = {
        id: key,
        name,
        siteAddress: customer?.siteAddress ?? null,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {})

  const groupList = Object.values(groups)
    .filter((g) => {
      const q = customerSearch.trim().toLowerCase()
      if (!q) return true
      return g.name.toLowerCase().includes(q)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalReady = readyLines.length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
          {(['all', 'today'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={[
                'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                dateFilter === f
                  ? 'bg-[#111827] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {f === 'all' ? 'All time' : 'Today'}
            </button>
          ))}
        </div>

        <input
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Filter by customer…"
          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none transition focus:border-[#93c5fd]"
        />

        {totalReady > 0 && (
          <span className="ml-auto text-sm text-[var(--text-muted)]">
            <span
              className="font-semibold tabular-nums text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}
            >
              {totalReady}
            </span>{' '}
            line{totalReady !== 1 ? 's' : ''} ready to dispatch
          </span>
        )}
      </div>

      {groupList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Nothing ready to dispatch
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Items reach this list when they move to Inbox or Dispatched.
          </p>
        </div>
      ) : (
        groupList.map((group) => (
          <div
            key={group.id}
            className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{group.name}</p>
                {group.siteAddress && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{group.siteAddress}</p>
                )}
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--n-50)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {group.items.length} item{group.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {group.items.map((item, i) => (
              <DispatchRow
                key={`${item.line.id}-${item.stage}-${i}`}
                item={item}
                activeBrand={activeBrand}
                onMoved={onMoved}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
