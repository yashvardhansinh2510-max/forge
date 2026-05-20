import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'

// GET /api/products/series
// Returns unique series names grouped by brand for brands that have products with seriesName set.
export async function GET() {
  const rows = await prisma.product.groupBy({
    by: ['brand', 'seriesName'],
    where: { isActive: true, seriesName: { not: null } },
    orderBy: [{ brand: 'asc' }, { seriesName: 'asc' }],
  })

  const map = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.seriesName) continue
    const list = map.get(row.brand) ?? []
    list.push(row.seriesName)
    map.set(row.brand, list)
  }

  const result = Array.from(map.entries()).map(([brand, series]) => ({ brand, series }))
  return NextResponse.json(result)
}
