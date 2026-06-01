'use client'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmColor = '#111827',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white', borderRadius: 14, padding: 24,
          width: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.16)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              height: 32, padding: '0 14px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border-default)', background: 'white',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 32, padding: '0 14px', borderRadius: 7, fontSize: 13,
              background: confirmColor, color: 'white',
              border: 'none', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
