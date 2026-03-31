// GET /api/purchase-orders/lines/[lineId]
// Returns a single line item with current stage quantities from DB

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lineId: string }> },
) {
  try {
    const { lineId } = await params
    const line = await prisma.pOLineItem.findUnique({
      where: { id: lineId },
      include: { product: { select: { sku: true, name: true, brand: true } } },
    })

    if (!line) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json(line)
  } catch (err) {
    console.error('[line-get]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch line item' },
      { status: 500 },
    )
  }
}
