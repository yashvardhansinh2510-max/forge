// Canonical formatting utilities for Forge.
// Import from here everywhere — never inline format logic.

export function formatINR(value: number, compact = false): string {
  if (compact) {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`
    if (value >= 100_000)   return `₹${(value / 100_000).toFixed(1)}L`
    if (value >= 1_000)     return `₹${(value / 1_000).toFixed(0)}K`
    return `₹${value.toLocaleString('en-IN')}`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\+91)\s?(\d{5})\s?(\d{5})/, '$1 $2 $3')
}
