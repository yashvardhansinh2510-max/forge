'use client'

import * as React from 'react'
import useSWR from 'swr'
import type { Finish, POSProduct } from '@/lib/mock/pos-data'

type ProductApiItem = {
  id: string
  sku: string
  articleNumber: string
  name: string
  description: string | null
  brand: string
  category: string
  subcategory: string
  seriesName: string | null
  mrp: number
  unit: string
  gstRate: number
  tier: string
  isActive: boolean
  variants: unknown
  concealedPartId: string | null
  imageUrl: string | null
}

type ProductApiResponse = {
  products: ProductApiItem[]
  generatedAt: string
}

const fetcher = async (url: string): Promise<ProductApiResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to load POS catalog')
  }
  return response.json() as Promise<ProductApiResponse>
}

const BRAND_NAME_MAP: Record<string, string> = {
  GROHE: 'Grohe',
  HANSGROHE: 'Hansgrohe',
  AXOR: 'Axor',
  VITRA: 'Vitra',
  GEBERIT: 'Geberit',
  OTHER: 'Other',
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  SHOWERS: 'Showers',
  WCS: 'WCs',
  THERMOSTATS: 'Thermostats',
  FAUCETS: 'Faucets',
  BASINS: 'Basins',
  BATHTUBS: 'Bathtubs',
  ACCESSORIES: 'Accessories',
  CONCEALED: 'Concealed Parts',
  KITCHEN: 'Kitchen',
}

const BRAND_COLORS: Record<string, string> = {
  Grohe: '#009FE3',
  Hansgrohe: '#00529A',
  Axor: '#1C1C1E',
  Vitra: '#E5002B',
  Geberit: '#6B7280',
  Other: '#4B5563',
}

const DEFAULT_FINISH: Finish = {
  name: 'Standard',
  code: 'STD',
  color: '#C8D0D8',
  priceAdj: 0,
}

function mapTier(raw: string): POSProduct['tier'] {
  if (raw === 'luxury' || raw === 'premium' || raw === 'mid') return raw
  return 'premium'
}

function parseFinishes(variants: unknown): Finish[] {
  if (!variants || typeof variants !== 'object') return [DEFAULT_FINISH]
  const maybeFinishes = (variants as { finishes?: unknown }).finishes
  if (!Array.isArray(maybeFinishes) || maybeFinishes.length === 0) return [DEFAULT_FINISH]

  const finishes = maybeFinishes
    .map((finish): Finish | null => {
      if (!finish || typeof finish !== 'object') return null
      const f = finish as { name?: unknown; code?: unknown; color?: unknown; priceAdj?: unknown }
      if (typeof f.name !== 'string' || typeof f.code !== 'string') return null
      return {
        name: f.name,
        code: f.code,
        color: typeof f.color === 'string' ? f.color : DEFAULT_FINISH.color,
        priceAdj: typeof f.priceAdj === 'number' ? f.priceAdj : 0,
      }
    })
    .filter((finish): finish is Finish => finish !== null)

  return finishes.length > 0 ? finishes : [DEFAULT_FINISH]
}

function mapToPOSProduct(product: ProductApiItem): POSProduct {
  const brandName = BRAND_NAME_MAP[product.brand] ?? product.brand
  const finishes = parseFinishes(product.variants)
  const category = CATEGORY_LABEL_MAP[product.category] ?? 'Accessories'
  const isConcealed = product.category === 'CONCEALED'

  return {
    id: product.id,
    sku: product.sku,
    articleNumber: product.articleNumber,
    name: product.name,
    description: product.description ?? `${brandName} ${category} product`,
    brand: brandName,
    brandColor: BRAND_COLORS[brandName] ?? BRAND_COLORS.Other!,
    category,
    subCategory: product.seriesName ?? CATEGORY_LABEL_MAP[product.subcategory] ?? category,
    seriesName: product.seriesName ?? undefined,
    mrp: product.mrp,
    gstRate: product.gstRate,
    unit: product.unit,
    tier: mapTier(product.tier),
    finishes,
    defaultFinish: finishes[0]?.name ?? DEFAULT_FINISH.name,
    requiresPartIds: product.concealedPartId ? [product.concealedPartId] : [],
    isConcealed,
    features: [],
    imageUrl: product.imageUrl ?? undefined,
  }
}

export interface POSBrandItem {
  id: string
  name: string
  color: string
  count: number
}

export interface POSCatalogResult {
  products: POSProduct[]
  brands: POSBrandItem[]
  isLoading: boolean
  error?: Error
  mutate: () => void
  generatedAt?: string
  getBundledParts: (productId: string) => POSProduct[]
  getDefaultFinish: (product: POSProduct) => Finish
}

export function usePOSCatalog(): POSCatalogResult {
  const { data, error, isLoading, mutate } = useSWR<ProductApiResponse>('/api/products', fetcher, {
    revalidateOnFocus: true,
  })

  const products = React.useMemo(() => {
    if (!data?.products) return []
    return data.products.map(mapToPOSProduct)
  }, [data?.products])

  const byId = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const brands = React.useMemo<POSBrandItem[]>(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      if (product.isConcealed) continue
      counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        color: BRAND_COLORS[name] ?? BRAND_COLORS.Other!,
        count,
      }))
  }, [products])

  const getBundledParts = React.useCallback(
    (productId: string) => {
      const product = byId.get(productId)
      if (!product) return []
      return product.requiresPartIds
        .map((partId) => byId.get(partId))
        .filter((part): part is POSProduct => part !== undefined)
    },
    [byId],
  )

  const getDefaultFinish = React.useCallback((product: POSProduct) => {
    return product.finishes[0] ?? DEFAULT_FINISH
  }, [])

  return {
    products,
    brands,
    isLoading,
    error: error as Error | undefined,
    mutate,
    generatedAt: data?.generatedAt,
    getBundledParts,
    getDefaultFinish,
  }
}
