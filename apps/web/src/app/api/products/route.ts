import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import type { Prisma, ProductBrand } from '@forge/db'

const VALID_BRANDS = new Set(['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'GEBERIT', 'KAJARIA', 'OTHER'])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brandParam  = searchParams.get('brand')?.toUpperCase()
    const seriesParam = searchParams.get('series')
    const searchParam = searchParams.get('search')?.trim()
    const limitParam  = Number(searchParams.get('limit') ?? 0)

    const brand = brandParam && VALID_BRANDS.has(brandParam) ? brandParam as ProductBrand : undefined

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(brand      && { brand }),
      ...(seriesParam && { seriesName: seriesParam }),
      ...(searchParam && {
        OR: [
          { sku:        { equals:   searchParam, mode: 'insensitive' } },
          { sku:        { contains: searchParam, mode: 'insensitive' } },
          { name:       { contains: searchParam, mode: 'insensitive' } },
          { seriesName: { contains: searchParam, mode: 'insensitive' } },
        ],
      }),
    }

    // Try with new columns first (post-migration). Fall back to base columns if the
    // migration hasn't been applied yet (column-not-found error from Postgres).
    let products: Array<{
      id: string; sku: string; articleNumber: string | null; name: string
      description: string | null; brand: string; category: string
      subcategory: string | null; seriesName: string | null; mrp: number
      unit: string; gstRate: number; tier: string; isActive: boolean
      variants: unknown; concealedPartId: string | null; finishName: string | null
      imageUrl: string | null; hsnCode?: string | null
      filterTags?: string[]; sortOrder?: number | null
    }>

    try {
      products = await prisma.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { brand: 'asc' }, { name: 'asc' }],
        take: limitParam > 0 ? limitParam : undefined,
        select: {
          id: true, sku: true, articleNumber: true, name: true, description: true,
          brand: true, category: true, subcategory: true, seriesName: true,
          mrp: true, unit: true, gstRate: true, tier: true, isActive: true,
          variants: true, concealedPartId: true, finishName: true, imageUrl: true,
          hsnCode: true, filterTags: true, sortOrder: true,
        },
      })
    } catch {
      // Migration not yet applied — fall back to base columns
      products = await prisma.product.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }],
        take: limitParam > 0 ? limitParam : undefined,
        select: {
          id: true, sku: true, articleNumber: true, name: true, description: true,
          brand: true, category: true, subcategory: true, seriesName: true,
          mrp: true, unit: true, gstRate: true, tier: true, isActive: true,
          variants: true, concealedPartId: true, finishName: true, imageUrl: true,
        },
      })
    }

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        articleNumber: p.articleNumber ?? p.sku,
        hsnCode:    p.hsnCode    ?? null,
        filterTags: p.filterTags ?? [],
        sortOrder:  p.sortOrder  ?? null,
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/products]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
