// GET /api/products/stock-context?ids=id1,id2,id3

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api-helpers'
import { getStockContext } from '@/lib/stockIntelligence'
import { ValidationError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const raw = req.nextUrl.searchParams.get('ids')
    if (!raw) throw new ValidationError('ids query param is required (comma-separated product IDs)')

    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) throw new ValidationError('ids must contain at least one product ID')
    if (ids.length > 100) throw new ValidationError('ids must not exceed 100 entries per request')

    const context = await getStockContext(ids)
    return NextResponse.json(context)
  })
}
