import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export async function GET() {
  return withErrorHandling(async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        category: true,
        mrp: true,
        unit: true,
        gstRate: true,
      },
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(products)
  })
}
