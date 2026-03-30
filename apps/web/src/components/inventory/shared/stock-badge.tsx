import type { StockStatus, ProductTier } from '@/lib/mock/inventory-data'
import { Badge } from '@/components/shared/badge'

export function StockBadge({ status }: { status: StockStatus }) {
  if (status === 'in_stock') return <Badge label="In Stock" dot="positive" />
  if (status === 'low_stock') return <Badge label="Low Stock" dot="caution" />
  return <Badge label="Out of Stock" dot="negative" />
}

export function TierBadge({ tier }: { tier: ProductTier }) {
  if (tier === 'luxury') return <Badge label="Luxury" />
  if (tier === 'premium') return <Badge label="Premium" />
  return null
}
