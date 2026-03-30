// lib/boxDispatcher.ts
// Records physical dispatch of items from a client's inventory box to their site.

import { prisma } from '@forge/db'
import { NotFoundError, InventoryOverflowError } from '@/lib/errors'

export async function dispatchFromBox(boxItemId: string, qtyDispatched: number) {
  const boxItem = await prisma.boxItem.findUnique({
    where: { id: boxItemId },
    include: { quotationItem: true },
  })

  if (!boxItem) throw new NotFoundError('BoxItem', boxItemId)

  const available = boxItem.qtyTotal - boxItem.qtyDispatched
  if (qtyDispatched > available) throw new InventoryOverflowError(qtyDispatched, available)

  const newQtyDispatched = boxItem.qtyDispatched + qtyDispatched
  const newStatus =
    newQtyDispatched >= boxItem.qtyTotal
      ? ('FULLY_DISPATCHED' as const)
      : ('PARTIALLY_DISPATCHED' as const)

  const newStockDispatched = (boxItem.quotationItem?.stockDispatched ?? 0) + qtyDispatched
  const totalQty = boxItem.quotationItem?.quantity ?? boxItem.qtyTotal
  const newInventoryStatus =
    newStockDispatched >= totalQty ? ('FULLY_DISPATCHED' as const) : ('PARTIALLY_DISPATCHED' as const)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.boxItem.update({
      where: { id: boxItemId },
      data: { qtyDispatched: newQtyDispatched, status: newStatus },
    })

    await tx.product.update({
      where: { id: boxItem.productId },
      data: { stockAvailable: { decrement: qtyDispatched } },
    })

    if (boxItem.quotationItemId) {
      await tx.quotationItem.update({
        where: { id: boxItem.quotationItemId },
        data: {
          stockDispatched: { increment: qtyDispatched },
          inventoryStatus: newInventoryStatus,
        },
      })
    }

    return updated
  })
}
