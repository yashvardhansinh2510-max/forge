import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import type { Prisma, ProductBrand } from '@forge/db'

const VALID_BRANDS = new Set(['GROHE', 'HANSGROHE', 'AXOR', 'VITRA', 'GEBERIT', 'OTHER'])

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
      articleNumber: p.articleNumber ?? p.sku,
    })),
    generatedAt: new Date().toISOString(),
  })
}
