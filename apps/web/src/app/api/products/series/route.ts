import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET() {
  try {
    const [seriesRows, brandRows] = await Promise.all([
      prisma.product.groupBy({
        by: ['brand', 'seriesName'],
        where: { isActive: true, seriesName: { not: null } },
        _count: { id: true },
        orderBy: [{ brand: 'asc' }, { seriesName: 'asc' }],
      }),
      prisma.product.groupBy({
        by: ['brand'],
        where: { isActive: true },
        _count: { id: true },
      }),
    ])

    const brandCountMap = new Map(brandRows.map((r) => [r.brand, r._count.id]))

    const seriesMap = new Map<string, { name: string; count: number }[]>()
    for (const row of seriesRows) {
      if (!row.seriesName) continue
      const list = seriesMap.get(row.brand) ?? []
      list.push({ name: row.seriesName, count: row._count.id })
      seriesMap.set(row.brand, list)
    }

    const result = Array.from(brandCountMap.entries()).map(([brand, count]) => ({
      brand,
      count,
      series: seriesMap.get(brand) ?? [],
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/products/series]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
