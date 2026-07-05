'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

interface Note {
  id:        string
  content:   string
  userName:  string
  createdAt: string
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface NotesPanelProps {
  lineId: string
}

export function NotesPanel({ lineId }: NotesPanelProps) {
  const [notes, setNotes]       = useState<Note[]>([])
  const [loading, setLoading]   = useState(true)
  const [content, setContent]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/purchase-orders/lines/${lineId}/notes`)
      .then((r) => r.json())
      .then((d: { notes?: Note[] }) => setNotes(d.notes ?? []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }, [lineId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/purchase-orders/lines/${lineId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        const data = await res.json() as { note?: Note }
        if (data.note) setNotes((prev) => [data.note!, ...prev])
        setContent('')
        textareaRef.current?.focus()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Input */}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Add a note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(e as unknown as React.FormEvent)
          }}
          className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1"
          style={{
            borderColor:     'var(--border-default)',
            background:      'var(--surface)',
            color:           'var(--text-primary)',
            fontFamily:      'var(--font-ui)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl transition disabled:opacity-40"
          style={{ background: '#111827', color: 'white' }}
        >
          <Send size={14} />
        </button>
      </form>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--n-100)]" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          No notes yet. Add the first one.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border p-3"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-subtle)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                {note.content}
              </p>
              <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {note.userName} · {fmtTime(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
