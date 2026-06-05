// Core POS domain types

export interface Finish {
  name: string
  code: string
  sku: string
  color: string
  priceAdj: number
}

export interface POSProduct {
  id: string
  sku: string
  name: string
  description: string
  brand: string
  brandColor: string
  category: string
  subCategory: string
  subcategoryLabel: string
  mrp: number
  gstRate: number
  unit: string
  tier: 'luxury' | 'premium' | 'mid'
  finishes: Finish[]
  defaultFinish: string
  requiresPartIds: string[]
  isConcealed: boolean
  features: string[]
  imageUrl?: string
  articleNumber?: string
  seriesName?: string
}
