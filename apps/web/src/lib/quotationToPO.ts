// lib/quotationToPO.ts
// Converts a finalized/locked QuotationRevision into a draft PurchaseOrder.

import { prisma } from '@forge/db'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { generatePONumber } from '@/lib/poNumberGenerator'

interface BuildPOOptions {
  /** Only include items from this brand (e.g. "GROHE"). Omit for all brands. */
  vendorFilter?: string
}

export async function buildPOFromRevision(
  revisionId: string,
  createdById: string,
  options: BuildPOOptions = {},
) {
  const revision = await prisma.quotationRevision.findUnique({
    where: { id: revisionId },
    include: {
      quotation: true,
      rooms: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  })

  if (!revision) throw new NotFoundError('QuotationRevision', revisionId)

  if (revision.status !== 'LOCKED' && revision.status !== 'FINALIZED') {
    throw new ValidationError(
      `Revision must be LOCKED or FINALIZED to create a PO — current status: ${revision.status}`,
    )
  }

  const allItems = revision.rooms
    .flatMap((room) => room.items)
    .filter((item) =>
      options.vendorFilter ? item.product.brand === options.vendorFilter : true,
    )

  if (allItems.length === 0) {
    throw new ValidationError(
      options.vendorFilter
        ? `No items found for brand "${options.vendorFilter}" in this revision`
        : 'Revision has no line items',
    )
  }

  const poNumber = await generatePONumber()

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      mode: 'PROJECT_LINKED',
      status: 'DRAFT',
      projectId: revision.quotation.projectId,
      revisionId: revision.id,
      createdById,
      vendorName: options.vendorFilter ?? null,
      lineItems: {
        create: allItems.map((item) => ({
          productId: item.productId,
          quotationItemId: item.id,
          qtyOrdered: item.quantity,
          clientOfferRate: item.offerRate,
          landingCost: null,
          status: 'PENDING' as const,
        })),
      },
    },
    include: { lineItems: { include: { product: true } } },
  })

  return po
}
