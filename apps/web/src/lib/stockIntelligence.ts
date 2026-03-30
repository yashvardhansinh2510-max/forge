// lib/stockIntelligence.ts
// Real-time stock context for product cards — single aggregation query.

import { prisma } from '@forge/db'

export interface StockContext {
  physical: number    // stockAvailable — physically in warehouse
  committed: number   // stockCommitted — in LOCKED revisions not yet boxed
  onOrder: number     // stockOnOrder — on open POs
  available: number   // physical - committed (can be negative)
}

/**
 * Returns a StockContext map for each requested product ID.
 * Single Prisma query — no N+1.
 */
export async function getStockContext(
  productIds: string[],
): Promise<Record<string, StockContext>> {
  if (productIds.length === 0) return {}

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      stockAvailable: true,
      stockOnOrder: true,
      stockCommitted: true,
    },
  })

  return Object.fromEntries(
    products.map((p) => [
      p.id,
      {
        physical:  p.stockAvailable,
        committed: p.stockCommitted,
        onOrder:   p.stockOnOrder,
        available: p.stockAvailable - p.stockCommitted,
      } satisfies StockContext,
    ]),
  )
}

/**
 * Refreshes denormalized stockCommitted for a product.
 * Call after any revision is locked/unlocked.
 */
export async function refreshStockCommitted(productId: string): Promise<void> {
  const agg = await prisma.quotationItem.aggregate({
    where: {
      productId,
      inventoryStatus: { in: ['QUOTED', 'PARTIALLY_DISPATCHED'] },
      room: { revision: { status: { in: ['LOCKED', 'FINALIZED'] } } },
    },
    _sum: { quantity: true },
  })

  await prisma.product.update({
    where: { id: productId },
    data: { stockCommitted: agg._sum.quantity ?? 0 },
  })
}

/**
 * Refreshes denormalized stockOnOrder for a product.
 * Call after any POLineItem is created/received/cancelled.
 */
export async function refreshStockOnOrder(productId: string): Promise<void> {
  const [ordered, received] = await Promise.all([
    prisma.pOLineItem.aggregate({
      where: { productId, status: { in: ['PENDING', 'PARTIALLY_RECEIVED'] } },
      _sum: { qtyOrdered: true },
    }),
    prisma.pOLineItem.aggregate({
      where: { productId, status: { in: ['PENDING', 'PARTIALLY_RECEIVED'] } },
      _sum: { qtyReceived: true },
    }),
  ])

  const onOrder = (ordered._sum.qtyOrdered ?? 0) - (received._sum.qtyReceived ?? 0)

  await prisma.product.update({
    where: { id: productId },
    data: { stockOnOrder: Math.max(0, onOrder) },
  })
}
