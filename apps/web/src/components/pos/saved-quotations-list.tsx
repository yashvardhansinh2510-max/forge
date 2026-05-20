'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { Plus, FileText, ChevronRight, User, Trash2 } from 'lucide-react'
import { usePOSStore, type ActiveProject, type Room } from '@/lib/pos-store'

interface SavedEntry {
  id: string
  savedAt: string
  project: ActiveProject
  rooms: Room[]
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function computeOfferTotal(rooms: Room[], globalDiscount: number): number {
  let total = 0
  for (const room of rooms) {
    for (const item of room.items) {
      const unitMRP = item.product.mrp + item.finish.priceAdj
      const effectiveDiscount = Math.max(
        globalDiscount,
        room.roomDiscount ?? 0,
        item.itemDiscount ?? 0,
      )
      total += unitMRP * item.quantity * (1 - effectiveDiscount / 100)
    }
  }
  return total
}

function countItems(rooms: Room[]): number {
  return rooms.reduce((sum, r) => sum + r.items.filter((i) => !i.isAutoAdded).length, 0)
}

export function SavedQuotationsList() {
  const router = useRouter()
  const loadSnapshot = usePOSStore((s) => s.loadSnapshot)
  const [entries, setEntries] = React.useState<SavedEntry[] | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // Read from localStorage after mount (client only)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('forge-pos-saved-list')
      setEntries(raw ? (JSON.parse(raw) as SavedEntry[]) : [])
    } catch {
      setEntries([])
    }
  }, [])

  function handleOpen(entry: SavedEntry) {
    loadSnapshot(entry.project, entry.rooms)
    router.push('/pos')
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      const updated = (entries ?? []).filter((e) => e.id !== id)
      localStorage.setItem('forge-pos-saved-list', JSON.stringify(updated))
      setEntries(updated)
    } finally {
      setDeletingId(null)
    }
  }

  // Loading skeleton
  if (entries === null) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 72, borderRadius: 10, marginBottom: 10,
              background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
              backgroundSize: '200% 100%',
              animation: `shimmer ${0.9 + i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Quotations
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
            {entries.length === 0 ? 'No saved quotations yet' : `${entries.length} saved quotation${entries.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/pos')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#1d4ed8', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
        >
          <Plus size={14} />
          New Quotation
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '72px 24px', background: 'white', borderRadius: 12,
            boxShadow: 'var(--shadow-sm)', textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, marginBottom: 16,
              background: 'linear-gradient(135deg, #e0e7ff, #ddd6fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FileText size={24} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            No quotations saved yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, maxWidth: 320 }}>
            Build a quotation in the builder and click Save — it will appear here.
          </div>
          <button
            onClick={() => router.push('/pos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#1d4ed8', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e40af' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8' }}
          >
            <Plus size={14} />
            Open Builder
          </button>
        </div>
      )}

      {/* Quotation list */}
      {entries.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {entries.map((entry, i) => {
            const total = computeOfferTotal(entry.rooms, entry.project.globalDiscount)
            const itemCount = countItems(entry.rooms)
            const roomCount = entry.rooms.filter((r) => r.items.length > 0).length
            const isLast = i === entries.length - 1

            return (
              <div
                key={entry.id}
                onClick={() => handleOpen(entry)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  cursor: 'pointer', transition: 'background 60ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, #e0e7ff, #ddd6fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FileText size={18} style={{ color: '#4f46e5' }} />
                </div>

                {/* Client info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {entry.project.clientName ? (
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {entry.project.clientName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Unnamed client
                      </span>
                    )}
                    {entry.project.clientPhone && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        · {entry.project.clientPhone}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                    {roomCount > 0 && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{roomCount} {roomCount === 1 ? 'room' : 'rooms'}</span>
                      </>
                    )}
                    {entry.project.referenceBy && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <User size={10} />
                          {entry.project.referenceBy}
                        </span>
                      </>
                    )}
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span suppressHydrationWarning>
                      {formatDistanceToNow(new Date(entry.savedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Total */}
                {itemCount > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatINR(total)}
                    </div>
                    {entry.project.globalDiscount > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {entry.project.globalDiscount}% off
                      </div>
                    )}
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(entry.id, e)}
                  disabled={deletingId === entry.id}
                  title="Remove"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 7, border: 'none',
                    background: 'transparent', cursor: 'pointer', flexShrink: 0,
                    color: 'var(--text-muted)', opacity: deletingId === entry.id ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2'
                    e.currentTarget.style.color = '#dc2626'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  <Trash2 size={13} />
                </button>

                {/* Arrow */}
                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
