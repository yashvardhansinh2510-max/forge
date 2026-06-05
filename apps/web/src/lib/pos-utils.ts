// Pure POS calculation utilities

import type { POSProduct, Finish } from './pos-types'

export function skuWithFinish(
  product: Pick<POSProduct, 'sku'>,
  finish: Pick<Finish, 'code'>,
): string {
  if (!finish.code) return product.sku
  return product.sku.endsWith(`-${finish.code}`) ? product.sku : `${product.sku}-${finish.code}`
}

export function unitMRP(
  product: Pick<POSProduct, 'mrp'>,
  finish: Pick<Finish, 'priceAdj'>,
): number {
  return product.mrp + finish.priceAdj
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

// ─── Shared product API→POSProduct mapper ─────────────────────────────────────

const BRAND_NAME_MAP: Record<string, string> = {
  GROHE:     'Grohe',
  HANSGROHE: 'Hansgrohe',
  AXOR:      'Axor',
  VITRA:     'Vitra',
  GEBERIT:   'Geberit',
  OTHER:     'Other',
}

const BRAND_COLORS: Record<string, string> = {
  Grohe:     '#009FE3',
  Hansgrohe: '#00529A',
  Axor:      '#1C1C1E',
  Vitra:     '#E5002B',
  Geberit:   '#6B7280',
  Other:     '#4B5563',
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

const DEFAULT_FINISH: Finish = {
  name: 'Chrome', code: '000', sku: '', color: '#B0B7BC', priceAdj: 0,
}

function parseFinishes(variants: unknown, productSku = ''): Finish[] {
  if (!variants || typeof variants !== 'object') return [{ ...DEFAULT_FINISH, sku: productSku }]
  const maybeFinishes = (variants as { finishes?: unknown }).finishes
  if (!Array.isArray(maybeFinishes) || maybeFinishes.length === 0) return [{ ...DEFAULT_FINISH, sku: productSku }]

  const finishes = maybeFinishes
    .map((finish): Finish | null => {
      if (!finish || typeof finish !== 'object') return null
      const f = finish as { name?: unknown; code?: unknown; sku?: unknown; color?: unknown; priceAdj?: unknown }
      if (typeof f.name !== 'string' || typeof f.code !== 'string') return null
      return {
        name:     f.name,
        code:     f.code,
        sku:      typeof f.sku === 'string' ? f.sku : productSku,
        color:    typeof f.color === 'string' ? f.color : DEFAULT_FINISH.color,
        priceAdj: typeof f.priceAdj === 'number' ? f.priceAdj : 0,
      }
    })
    .filter((f): f is Finish => f !== null)

  return finishes.length > 0 ? finishes : [{ ...DEFAULT_FINISH, sku: productSku }]
}

function mapTier(raw: string): POSProduct['tier'] {
  if (raw === 'luxury' || raw === 'premium' || raw === 'mid') return raw
  return 'premium'
}

export type ProductApiItem = {
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

export function mapToPOSProduct(product: ProductApiItem): POSProduct {
  const brandName   = BRAND_NAME_MAP[product.brand] ?? product.brand
  const finishes    = parseFinishes(product.variants, product.sku)
  const category    = CATEGORY_LABEL_MAP[product.category] ?? 'Accessories'
  const isConcealed = product.category === 'CONCEALED'

  return {
    id:               product.id,
    sku:              product.sku,
    articleNumber:    product.articleNumber,
    name:             product.name,
    description:      product.description ?? `${brandName} ${category} product`,
    brand:            brandName,
    brandColor:       BRAND_COLORS[brandName] ?? BRAND_COLORS['Other']!,
    category,
    subCategory:      product.seriesName ?? CATEGORY_LABEL_MAP[product.subcategory] ?? category,
    subcategoryLabel: category,
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
  }
}

export { DEFAULT_FINISH, BRAND_COLORS, BRAND_NAME_MAP }

// Legacy SVG placeholder — kept for procurement-store compatibility
export function productImageDataUri(
  product: Pick<POSProduct, 'category' | 'subCategory' | 'brand' | 'name'>,
  finish?: Pick<Finish, 'color'> | null,
): string {
  const label  = encodeURIComponent(product.name)
  const tone   = encodeURIComponent(finish?.color ?? (product.brand === 'Vitra' ? '#f7f5f0' : '#c9d1d9'))
  const accent = encodeURIComponent(
    product.brand === 'Vitra' ? '#d71920' : product.brand === 'Grohe' ? '#0077b6' : '#334155',
  )
  const family = `${product.category} ${product.subCategory}`.toLowerCase()
  const wc     = family.includes('wc') || family.includes('bidet')
  const basin  = family.includes('basin') || family.includes('vanity')
  const bath   = family.includes('bath')
  const shower = family.includes('shower')
  const shape  = wc
    ? `<rect x="18" y="12" width="36" height="11" rx="4" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><path d="M25 20h30c4 0 7 3 7 7v6c0 12-10 22-22 22H26c-7 0-12-5-12-12V31c0-6 5-11 11-11Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><path d="M21 54h29l-4 8H25l-4-8Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/>`
    : basin
      ? `<ellipse cx="40" cy="35" rx="28" ry="17" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><ellipse cx="40" cy="32" rx="19" ry="9" fill="%23ffffff" opacity=".65"/><path d="M20 43h40l-6 13H26l-6-13Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/>`
      : bath
        ? `<path d="M14 39c0-7 6-13 13-13h39v15c0 9-7 16-16 16H28c-8 0-14-6-14-14v-4Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/>`
        : shower
          ? `<path d="M23 18h23c7 0 13 6 13 13v2H23V18Z" fill="${tone}" stroke="%236b7280" stroke-width="2"/><path d="M45 18V9h14" stroke="%236b7280" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M27 41v7M36 41v9M45 41v7M54 41v9" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity=".58"/>`
          : `<rect x="18" y="24" width="44" height="28" rx="7" fill="${tone}" stroke="%236b7280" stroke-width="2"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 80 80" role="img" aria-label="${label}"><rect x="4" y="4" width="72" height="72" rx="14" fill="%23f8fafc"/>${shape}</svg>`
  return `data:image/svg+xml;utf8,${svg}`
}
