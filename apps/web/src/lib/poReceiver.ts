// lib/poReceiver.ts
// Marks PO line items as received and stages them into the client's InventoryBox.

import { prisma } from '@forge/db'
import { NotFoundError, InventoryOverflowError } from '@/lib/errors'
import { generateBoxCode } from '@/lib/poNumberGenerator'

export interface ReceiveResult {
  updatedLine: Awaited<ReturnType<typeof prisma.pOLineItem.update>>
  boxItem: Awaited<ReturnType<typeof prisma.boxItem.create>> | null
}

export async function receivePOLine(
  poLineId: string,
  qtyReceived: number,
  projectId?: string,
): Promise<ReceiveResult> {
  const line = await prisma.pOLineItem.findUnique({
    where: { id: poLineId },
    include: {
      po: { include: { lineItems: true } },
      product: true,
    },
  })

  if (!line) throw new NotFoundError('POLineItem', poLineId)

  const available = line.qtyOrdered - line.qtyReceived
  if (qtyReceived > available) throw new InventoryOverflowError(qtyReceived, available)

  const newQtyReceived = line.qtyReceived + qtyReceived
  const lineStatus =
    newQtyReceived >= line.qtyOrdered ? ('FULLY_RECEIVED' as const) : ('PARTIALLY_RECEIVED' as const)

  // Compute future PO status across all lines
  const allFull = line.po.lineItems.every((l) =>
    l.id === poLineId ? newQtyReceived >= line.qtyOrdered : l.qtyReceived >= l.qtyOrdered,
  )
  const anyReceived = line.po.lineItems.some((l) =>
    l.id === poLineId ? true : l.qtyReceived > 0,
  )
  const poStatus = allFull
    ? ('FULLY_RECEIVED' as const)
    : anyReceived
    ? ('PARTIALLY_RECEIVED' as const)
    : ('SUBMITTED' as const)

  const [updatedLine, boxItem] = await prisma.$transaction(async (tx) => {
    const updLine = await tx.pOLineItem.update({
      where: { id: poLineId },
      data: { qtyReceived: newQtyReceived, status: lineStatus },
    })

    await tx.purchaseOrder.update({
      where: { id: line.poId },
      data: { status: poStatus },
    })

    await tx.product.update({
      where: { id: line.productId },
      data: {
        stockAvailable: { increment: qtyReceived },
        stockOnOrder: { decrement: qtyReceived },
      },
    })

    let updBoxItem: Awaited<ReturnType<typeof tx.boxItem.create>> | null = null

    if (line.po.mode === 'PROJECT_LINKED' && projectId) {
      const project = await tx.project.findUnique({ where: { id: projectId } })
      const boxCode = await generateBoxCode(project?.clientName ?? projectId)
      const stableBoxCode = `BOX-${projectId.slice(0, 8).toUpperCase()}`

      const box = await tx.inventoryBox.upsert({
        where: { boxCode: stableBoxCode },
        create: { boxCode: stableBoxCode, projectId, poId: line.poId },
        update: {},
      })

      const existingBoxItem = await tx.boxItem.findFirst({
        where: { boxId: box.id, productId: line.productId },
      })

      if (existingBoxItem) {
        updBoxItem = await tx.boxItem.update({
          where: { id: existingBoxItem.id },
          data: { qtyTotal: { increment: qtyReceived } },
        })
      } else {
        updBoxItem = await tx.boxItem.create({
          data: {
            boxId: box.id,
            productId: line.productId,
            quotationItemId: line.quotationItemId ?? undefined,
            qtyTotal: qtyReceived,
            qtyDispatched: 0,
            status: 'STAGED',
          },
        })
      }

      if (line.quotationItemId) {
        await tx.quotationItem.update({
          where: { id: line.quotationItemId },
          data: {
            stockInBox: { increment: qtyReceived },
            inventoryStatus: 'IN_BOX',
          },
        })
      }
    }

    return [updLine, updBoxItem] as const
  })

  return { updatedLine, boxItem }
}
