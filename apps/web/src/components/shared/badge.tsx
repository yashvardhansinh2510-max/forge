// The ONLY badge component in Forge.
// Every status, type, and state label uses this — grey chip + optional semantic dot.

export type BadgeDot = 'neutral' | 'positive' | 'negative' | 'caution' | 'accent'

export interface BadgeProps {
  label: string
  dot?: BadgeDot
}

const DOT_COLORS: Record<BadgeDot, string> = {
  neutral:  '#AEAEA9',
  positive: '#16A34A',
  negative: '#DC2626',
  caution:  '#D97706',
  accent:   '#2563EB',
}

export function Badge({ label, dot }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        height: 20,
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: 'var(--text-tertiary)',
        background: 'var(--n-100)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xs)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            flexShrink: 0,
            background: DOT_COLORS[dot],
          }}
        />
      )}
      {label}
    </span>
  )
}
