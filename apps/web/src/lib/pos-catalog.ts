'use client'

import useSWR from 'swr'
import type { POSProduct } from '@/lib/mock/pos-data'

export interface ProductApiItem {
  id: string
  sku: string
  articleNumber: string
  name: string
  description: string | null
  brand: string
  category: string | null
  subcategory: string | null
  seriesName: string | null
  finishName: string | null
  mrp: number
  unit: string
  gstRate: number
  tier: string | null
  isActive: boolean
  variants: unknown
  concealedPartId: string | null
  imageUrl: string | null
  hsnCode: string | null
  filterTags: string[]
  sortOrder: number | null
}

const BRAND_DISPLAY: Record<string, string> = {
  GROHE:     'Grohe',
  HANSGROHE: 'Hansgrohe',
  AXOR:      'Axor',
  VITRA:     'Vitra',
  GEBERIT:   'Geberit',
  OTHER:     'Other',
}

const BRAND_COLOR: Record<string, string> = {
  Grohe:     '#009FE3',
  Hansgrohe: '#00529A',
  Axor:      '#1C1C1E',
  Vitra:     '#E5002B',
  Geberit:   '#6B7280',
  Other:     '#6B7280',
}

const CATEGORY_LABEL: Record<string, string> = {
  SHOWER:      'Showers',
  BASIN_MIXER: 'Basin Mixers',
  BATH_MIXER:  'Bath Mixers',
  THERMOSTAT:  'Thermostats',
  WC:          'WCs',
  BASIN:       'Basins',
  KITCHEN:     'Kitchen',
  ACCESSORY:   'Accessories',
}

const TIER_MAP: Record<string, 'luxury' | 'premium' | 'mid'> = {
  LUXURY:  'luxury',
  PREMIUM: 'premium',
  MID:     'mid',
}

export function mapToPOSProduct(p: ProductApiItem): POSProduct {
  const brandDisplay = BRAND_DISPLAY[p.brand] ?? p.brand
  const category     = CATEGORY_LABEL[p.category ?? ''] ?? (p.category ?? 'Other')
  const tier         = TIER_MAP[(p.tier ?? '').toUpperCase()] ?? 'mid'

  const rawVariants = Array.isArray(p.variants) ? p.variants : []
  const finishes = rawVariants.map((v) => {
    const vv = v as Record<string, unknown>
    return {
      name:     String(vv.name     ?? 'Standard'),
      code:     String(vv.code     ?? '000'),
      color:    String(vv.color    ?? '#C8D0D8'),
      priceAdj: Number(vv.priceAdj ?? 0),
    }
  })

  return {
    id:           p.id,
    sku:          p.sku,
    articleNumber: p.articleNumber,
    name:         p.name,
    description:  p.description ?? '',
    brand:        brandDisplay,
    brandColor:   BRAND_COLOR[brandDisplay] ?? '#6B7280',
    category,
    subCategory:  p.seriesName ?? category,
    seriesName:   p.seriesName ?? undefined,
    mrp:          p.mrp,
    gstRate:      p.gstRate,
    unit:         p.unit,
    tier,
    finishes,
    defaultFinish: finishes[0]?.name ?? '',
    gradient:     '',
    requiresPartIds: p.concealedPartId ? [p.concealedPartId] : [],
    isConcealed:  false,
    features:     [],
    imageUrl:     p.imageUrl ?? undefined,
  }
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json() as Promise<{ products: ProductApiItem[] }>
  })

export function useProducts(params?: {
  brand?: string | null
  series?: string | null
  search?: string
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.brand)  qs.set('brand',  params.brand)
  if (params?.series) qs.set('series', params.series)
  if (params?.search) qs.set('search', params.search)
  if (params?.limit)  qs.set('limit',  String(params.limit))

  const key = `/api/products${qs.toString() ? `?${qs}` : ''}`
  const { data, error, isLoading } = useSWR(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  return {
    products:  (data?.products ?? []).map(mapToPOSProduct),
    isLoading,
    error,
  }
}
