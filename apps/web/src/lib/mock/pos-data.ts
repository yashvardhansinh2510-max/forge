// Product data is now served from /api/products (real DB)

export interface Finish {
  name: string
  code: string
  color: string
  priceAdj: number
}

export interface POSProduct {
  id: string
  sku: string
  articleNumber?: string
  name: string
  description: string
  brand: string
  brandColor: string
  category: string
  subCategory: string   // maps to seriesName from DB
  seriesName?: string
  mrp: number
  gstRate: number
  unit: string
  tier: 'luxury' | 'premium' | 'mid'
  finishes: Finish[]
  defaultFinish: string
  gradient: string
  requiresPartIds: string[]
  isConcealed: boolean
  features: string[]
  imageUrl?: string
}

// Bundled parts are no longer derived from mock data; returns empty by default
export function getBundledParts(_productId: string): POSProduct[] {
  return []
}

export function getDefaultFinish(product: POSProduct): Finish | undefined {
  return product.finishes.find((f) => f.name === product.defaultFinish)
}

export function calcOfferRate(mrp: number, discountPct: number): number {
  return mrp * (1 - discountPct / 100)
}

export function calcLineTotalMRP(mrp: number, qty: number): number {
  return mrp * qty
}

export function calcLineTotalOffer(mrp: number, qty: number, discountPct: number): number {
  return calcOfferRate(mrp, discountPct) * qty
}
