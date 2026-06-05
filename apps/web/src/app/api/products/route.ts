import { NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'
import { prisma } from '@forge/db'
import type { Prisma, ProductBrand } from '@forge/db'

const PUBLIC_DIR = join(process.cwd(), 'public')

const VALID_BRANDS = new Set(['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'GEBERIT', 'OTHER'])

/** Check if a /products/{sku}.png file exists and return its URL path, or null. */
function resolveProductImageUrl(sku: string | null | undefined): string | null {
  if (!sku) return null
  const path = `/products/${sku}.png`
  return existsSync(join(PUBLIC_DIR, path)) ? path : null
}

/** Build finishImages map: finish code → image URL path, only for files that exist on disk. */
function resolveFinishImages(variants: unknown): Record<string, string> | null {
  if (!variants || typeof variants !== 'object') return null
  const finishes = (variants as { finishes?: unknown }).finishes
  if (!Array.isArray(finishes) || finishes.length === 0) return null

  const map: Record<string, string> = {}
  for (const f of finishes) {
    if (!f || typeof f !== 'object') continue
    const finish = f as { code?: unknown; sku?: unknown }
    if (typeof finish.code !== 'string' || !finish.code) continue
    if (typeof finish.sku !== 'string' || !finish.sku) continue
    const url = resolveProductImageUrl(finish.sku)
    if (url) map[finish.code] = url
  }
  return Object.keys(map).length > 0 ? map : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandParam  = searchParams.get('brand')?.toUpperCase() ?? null
  const seriesParam = searchParams.get('series') ?? null
  const search      = searchParams.get('search')?.trim() ?? null
  const limitParam  = parseInt(searchParams.get('limit') ?? '0', 10)

  const where: Prisma.ProductWhereInput = { isActive: true }

  if (brandParam && VALID_BRANDS.has(brandParam)) {
    where.brand = brandParam as ProductBrand
  }
  if (seriesParam) {
    where.seriesName = { contains: seriesParam, mode: 'insensitive' }
  }
  if (search) {
    where.OR = [
      { sku:        { equals:   search, mode: 'insensitive' } },
      { sku:        { contains: search, mode: 'insensitive' } },
      { name:       { contains: search, mode: 'insensitive' } },
      { seriesName: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
      take: limitParam > 0 ? limitParam : undefined,
      select: {
        id:             true,
        sku:            true,
        articleNumber:  true,
        name:           true,
        description:    true,
        brand:          true,
        category:       true,
        subcategory:    true,
        seriesName:     true,
        sourceFile:     true,
        mrp:            true,
        unit:           true,
        gstRate:        true,
        tier:           true,
        isActive:       true,
        variants:       true,
        concealedPartId: true,
        imageUrl:       true,
      },
    })

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        articleNumber:  p.articleNumber ?? p.sku,
        // Resolve per-finish image URLs from disk (only files that exist).
        // Client uses finishImages[finish.code] first, then falls back to imageUrl.
        finishImages:   resolveFinishImages(p.variants),
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[/api/products] DB error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch products', detail: String(err) },
      { status: 500 },
    )
  }
}
