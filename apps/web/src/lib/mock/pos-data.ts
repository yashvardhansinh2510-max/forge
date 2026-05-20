// Product data is now served from /api/products (real DB)

export interface Finish {
  name: string
  code: string
  color: string   // hex swatch color
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

export function skuWithFinish(product: Pick<POSProduct, 'sku'>, finish: Pick<Finish, 'code'>): string {
  if (!finish.code) return product.sku
  return product.sku.endsWith(`-${finish.code}`) ? product.sku : `${product.sku}-${finish.code}`
}

export function unitMRP(product: Pick<POSProduct, 'mrp'>, finish: Pick<Finish, 'priceAdj'>): number {
  return product.mrp + finish.priceAdj
}

export function productImageDataUri(
  product: Pick<POSProduct, 'category' | 'subCategory' | 'brand' | 'name'>,
  finish?: Pick<Finish, 'color'> | null,
): string {
  const label = encodeURIComponent(product.name)
  const tone = encodeURIComponent(finish?.color || (product.brand === 'Vitra' ? '#f7f5f0' : '#c9d1d9'))
  const accent = encodeURIComponent(product.brand === 'Vitra' ? '#d71920' : product.brand === 'Grohe' ? '#0077b6' : '#334155')
  const family = `${product.category} ${product.subCategory}`.toLowerCase()
  const wc = family.includes('wc') || family.includes('bidet')
  const basin = family.includes('basin') || family.includes('vanity')
  const bath = family.includes('bath')
  const shower = family.includes('shower')
  const shape = wc
    ? `<rect x="18" y="12" width="36" height="11" rx="4" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><path d="M25 20h30c4 0 7 3 7 7v6c0 12-10 22-22 22H26c-7 0-12-5-12-12V31c0-6 5-11 11-11Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><path d="M21 54h29l-4 8H25l-4-8Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/>`
    : basin
      ? `<ellipse cx="40" cy="35" rx="28" ry="17" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><ellipse cx="40" cy="32" rx="19" ry="9" fill="%23ffffff" opacity=".65"/><path d="M20 43h40l-6 13H26l-6-13Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/>`
      : bath
        ? `<path d="M14 39c0-7 6-13 13-13h39v15c0 9-7 16-16 16H28c-8 0-14-6-14-14v-4Z" fill="${tone}" stroke="%23b8b8b8" stroke-width="2"/><path d="M21 35h40" stroke="%23ffffff" stroke-width="3" stroke-linecap="round" opacity=".65"/>`
        : shower
          ? `<path d="M23 18h23c7 0 13 6 13 13v2H23V18Z" fill="${tone}" stroke="%236b7280" stroke-width="2"/><path d="M45 18V9h14" stroke="%236b7280" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M27 41v7M36 41v9M45 41v7M54 41v9" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity=".58"/>`
          : `<rect x="18" y="24" width="44" height="28" rx="7" fill="${tone}" stroke="%236b7280" stroke-width="2"/><path d="M24 34h32M24 43h24" stroke="%23ffffff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 80 80" role="img" aria-label="${label}"><rect x="4" y="4" width="72" height="72" rx="14" fill="%23f8fafc"/><circle cx="62" cy="17" r="6" fill="${accent}" opacity=".14"/>${shape}<path d="M12 66h56" stroke="%230f172a" stroke-width="3" stroke-linecap="round" opacity=".08"/></svg>`
  return `data:image/svg+xml;utf8,${svg}`
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
