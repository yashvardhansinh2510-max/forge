import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import {
  getFallbackCustomersForProduct,
  shouldUseFallback,
} from '@/lib/purchases-fallback'
import type { CustomerOption } from '@/lib/purchases-tracker'

function sortCustomers(customers: CustomerOption[]): CustomerOption[] {
  return [...customers].sort((left, right) => left.name.localeCompare(right.name))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandling(async () => {
    const { id } = await params

    try {
      const poCustomers = await prisma.pOLineItem.findMany({
        where: {
          productId: id,
          po: {
            projectId: {
              not: null,
            },
          },
        },
        select: {
          po: {
            select: {
              project: {
                select: {
                  id: true,
                  clientName: true,
                },
              },
            },
          },
        },
      })

      const customers = new Map<string, CustomerOption>()

      for (const entry of poCustomers) {
        const project = entry.po.project
        if (project) {
          customers.set(project.id, {
            id: project.id,
            name: project.clientName,
          })
        }
      }

      return NextResponse.json(sortCustomers(Array.from(customers.values())))
    } catch (error) {
      if (shouldUseFallback(error)) {
        return NextResponse.json(getFallbackCustomersForProduct(id))
      }

      throw error
    }
  })
}
