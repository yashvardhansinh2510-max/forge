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
  sourceFile: string | null
  mrp: number
  unit: string
  gstRate: number
  tier: string
  isActive: boolean
  variants: unknown
  concealedPartId: string | null
  imageUrl: string | null
  finishImages: Record<string, string> | null
}

type ProductApiResponse = {
  products: ProductApiItem[]
  generatedAt: string
}

const fetcher = async (url: string): Promise<ProductApiResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to load POS catalog')
  return response.json() as Promise<ProductApiResponse>
}

const BRAND_NAME_MAP: Record<string, string> = {
  GROHE:     'Grohe',
  HANSGROHE: 'Hansgrohe',
  AXOR:      'Axor',
  VITRA:     'Vitra',
  GEBERIT:   'Geberit',
  OTHER:     'Other',
}

// ─── Finish code → canonical display name ─────────────────────────────────────
// All Chrome alias codes (007, 008, 180 …) normalise to plain "Chrome".
// This is the single source of truth for finish names in the UI.
export const FINISH_CODE_NAME: Record<string, string> = {
  '000': 'Chrome',
  '007': 'Chrome',
  '008': 'Chrome',
  '147': 'Chrome',
  '180': 'Chrome',
  '187': 'Chrome',
  '408': 'Chrome',
  '140': 'Brushed Bronze',
  '670': 'Matt Black',
  '677': 'Matt Black',
  '678': 'Matt Black',
  '700': 'Matt White',
  '708': 'Matt White',
  '340': 'Brushed Black Chrome',
  '347': 'Brushed Black Chrome',
  '990': 'Polished Gold Optic',
  '997': 'Polished Gold Optic',
  '300': 'Polished Red Gold',
  '310': 'Brushed Red Gold',
  '800': 'Steel Optic',
  '330': 'Polished Black Chrome',
  '820': 'Brushed Nickel',
  '250': 'Brushed Gold Optic',
  '950': 'Brushed Brass',
  '600': 'Black / Chrome',
  '450': 'White',
  '400': 'White / Chrome',
}

// ─── Finish code → swatch hex ─────────────────────────────────────────────────
export const FINISH_CODE_COLOR: Record<string, string> = {
  '000': '#B0B7BC', '007': '#B0B7BC', '008': '#B0B7BC',
  '147': '#B0B7BC', '180': '#B0B7BC', '187': '#B0B7BC', '408': '#B0B7BC',
  '140': '#8B6747',
  '670': '#1C1C1E', '677': '#1C1C1E', '678': '#1C1C1E',
  '700': '#F2F2F0', '708': '#F2F2F0',
  '340': '#2D2D2D', '347': '#2D2D2D',
  '990': '#C4973D', '997': '#C4973D',
  '300': '#B5705A',
  '310': '#9B6255',
  '800': '#7B8B98',
  '330': '#1A1A1A',
  '820': '#A0A8B0',
  '250': '#C4A84A',
  '950': '#A07840',
  '600': '#3D3D3D',
  '450': '#FAFAFA',
  '400': '#E8E8E8',
}

// Display sort order: Chrome first, then premium dark finishes, then light
const FINISH_SORT_ORDER: Record<string, number> = {
  '000': 0, '007': 0, '008': 0, '147': 0, '180': 0, '187': 0, '408': 0,
  '140': 1,
  '670': 2, '677': 2, '678': 2,
  '340': 3, '347': 3,
  '330': 4,
  '250': 5,
  '300': 6,
  '310': 7,
  '990': 8, '997': 8,
  '820': 9,
  '800': 10,
  '950': 11,
  '600': 12,
  '700': 13, '708': 13,
  '450': 14,
  '400': 15,
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  SHOWERS:     'Showers',
  WCS:         'WCs',
  THERMOSTATS: 'Thermostats',
  FAUCETS:     'Faucets',
  BASINS:      'Basins',
  BATHTUBS:    'Bathtubs',
  ACCESSORIES: 'Accessories',
  CONCEALED:   'Concealed Parts',
  KITCHEN:     'Kitchen',
}

// Maps Excel source file → display category label for the POS sidebar
const SOURCEFILE_LABEL_MAP: Record<string, string> = {
  'BM.xlsx':                'Basin Mixers',
  'WBM.xlsx':               'Concealed & Wall Mixers',
  'TBM.xlsx':               'Tall Basin Mixers',
  '3hole.xlsx':             '3-Hole Mixers',
  'Single_lever.xlsx':      'Single Lever',
  'Thermostat.xlsx':        'Thermostats',
  'SHOWERS_HANSGROHE.xlsx': 'Showers',
  'handshower.xlsx':        'Hand Showers',
  'Holder.xlsx':            'Holders',
  'Showerhose.xlsx':        'Shower Hoses',
  'rail.xlsx':              'Rails & Showerpipes',
  'HFAV.xlsx':              'Fittings & Valves',
  'Spout.xlsx':             'Bath Spouts',
  'Ceramic.xlsx':           'WCs & Ceramics',
  'kitchen.xlsx':           'Kitchen Mixers',
  // Aliases for files with spaces instead of underscores (older catalog extracts)
  'SHOWERS HANSGROHE.xlsx': 'Showers',
  'Single lever.xlsx':      'Single Lever',
}

const BRAND_COLORS: Record<string, string> = {
  Grohe:     '#009FE3',
  Hansgrohe: '#00529A',
  Axor:      '#1C1C1E',
  Vitra:     '#E5002B',
  Geberit:   '#6B7280',
  Other:     '#4B5563',
}

const DEFAULT_FINISH: Finish = {
  name:     'Chrome',
  code:     '000',
  sku:      '',
  color:    '#B0B7BC',
  priceAdj: 0,
}

function mapTier(raw: string): POSProduct['tier'] {
  if (raw === 'luxury' || raw === 'premium' || raw === 'mid') return raw
  return 'premium'
}

function parseFinishes(variants: unknown, productSku: string): Finish[] {
  if (!variants || typeof variants !== 'object') return [{ ...DEFAULT_FINISH, sku: productSku }]
  const maybeFinishes = (variants as { finishes?: unknown }).finishes
  if (!Array.isArray(maybeFinishes) || maybeFinishes.length === 0) return [{ ...DEFAULT_FINISH, sku: productSku }]

  const seen = new Set<string>()
  const finishes = maybeFinishes
    .map((finish): Finish | null => {
      if (!finish || typeof finish !== 'object') return null
      const f = finish as { name?: unknown; code?: unknown; sku?: unknown; color?: unknown; priceAdj?: unknown }
      if (typeof f.code !== 'string' || !f.code) return null

      // Deduplicate by code (e.g. multiple Chrome aliases in old data)
      if (seen.has(f.code)) return null
      seen.add(f.code)

      const code = f.code
      // Always use canonical display name — overrides raw DB value for aliases
      const name = FINISH_CODE_NAME[code] ?? (typeof f.name === 'string' ? f.name : 'Chrome')
      // Always use canonical swatch color — keeps hex consistent across aliases
      const color = FINISH_CODE_COLOR[code] ?? (typeof f.color === 'string' ? f.color : DEFAULT_FINISH.color)

      return {
        name,
        code,
        sku:      typeof f.sku === 'string' && f.sku ? f.sku : productSku,
        color,
        priceAdj: typeof f.priceAdj === 'number' ? f.priceAdj : 0,
      }
    })
    .filter((finish): finish is Finish => finish !== null)
    // Sort: Chrome first, then by display priority
    .sort((a, b) => {
      const ao = FINISH_SORT_ORDER[a.code] ?? 99
      const bo = FINISH_SORT_ORDER[b.code] ?? 99
      return ao - bo
    })

  return finishes.length > 0 ? finishes : [{ ...DEFAULT_FINISH, sku: productSku }]
}

function mapToPOSProduct(product: ProductApiItem): POSProduct {
  const brandName       = BRAND_NAME_MAP[product.brand] ?? product.brand
  const finishes        = parseFinishes(product.variants, product.sku)
  const category        = CATEGORY_LABEL_MAP[product.category] ?? 'Accessories'
  const subcategoryLabel = SOURCEFILE_LABEL_MAP[product.sourceFile ?? ''] ?? category
  const isConcealed     = product.category === 'CONCEALED'

  return {
    id:               product.id,
    sku:              product.sku,
    articleNumber:    product.articleNumber,
    name:             product.name,
    description:      product.description ?? `${brandName} ${category} product`,
    brand:            brandName,
    brandColor:       BRAND_COLORS[brandName] ?? BRAND_COLORS.Other!,
    category,
    subCategory:      product.seriesName ?? CATEGORY_LABEL_MAP[product.subcategory] ?? category,
    subcategoryLabel,
    seriesName:       product.seriesName ?? undefined,
    mrp:              product.mrp,
    gstRate:          product.gstRate,
    unit:             product.unit,
    tier:             mapTier(product.tier),
    finishes,
    defaultFinish:    finishes[0]?.name ?? DEFAULT_FINISH.name,
    requiresPartIds:  product.concealedPartId ? [product.concealedPartId] : [],
    isConcealed,
    features:         [],
    imageUrl:         product.imageUrl ?? undefined,
    // Populated by the API: finish code → /products/{finish.sku}.png (only files that exist on disk).
    // resolveLineItemImage in quotation-preview uses this first, then falls back to imageUrl.
    finishImages:     product.finishImages ?? undefined,
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
        id:    name.toLowerCase().replace(/\s+/g, '-'),
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
    error:       error as Error | undefined,
    mutate,
    generatedAt: data?.generatedAt,
    getBundledParts,
    getDefaultFinish,
  }
}
