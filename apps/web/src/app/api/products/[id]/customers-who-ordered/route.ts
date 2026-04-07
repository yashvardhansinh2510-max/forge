// GET /api/products/[id]/customers-who-ordered
// Returns unique companies/projects that have QuotationItems for this product.
// Used by PartialMoveModal to populate the customer assignment dropdown.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const items = await prisma.quotationItem.findMany({
      where: { productId: id },
      select: {
        room: {
          select: {
            revision: {
              select: {
                quotation: {
                  select: {
                    project: {
                      select: {
                        id: true,
                        clientName: true,
                        company: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const seen = new Set<string>()
    const customers: Array<{ id: string; name: string }> = []

    for (const item of items) {
      const project = item.room.revision.quotation.project
      const company = project.company
      const key = company ? company.id : project.id
      if (!seen.has(key)) {
        seen.add(key)
        customers.push({ id: key, name: company ? company.name : project.clientName })
      }
    }

    return NextResponse.json(customers)
  } catch (err) {
    console.error('[customers-who-ordered]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch customers' },
      { status: 500 },
    )
  }
}
