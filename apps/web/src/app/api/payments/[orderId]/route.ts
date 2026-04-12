import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

export type PaymentRecord = {
  id: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
  receivedAt: string
  recordedBy: string
  createdAt: string
}

export type OrderLineItem = {
  id: string
  sku: string
  name: string
  brand: string
  qty: number
  mrp: number
  offerRate: number
}

export type PaymentDetailResponse = {
  id: string
  number: string
  customerId: string
  customerName: string
  customerPhone: string | null
  status: string
  projectName: string | null
  deliveryAddress: string | null
  notes: string | null
  mrpTotal: number
  offerTotal: number
  paidTotal: number
  outstandingTotal: number
  createdAt: string
  payments: PaymentRecord[]
  lineItems: OrderLineItem[]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return withErrorHandling(async () => {
    const { orderId } = await params

    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { receivedAt: 'asc' } },
        lineItems: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Order not found' }, { status: 404 })
    }

    const paidTotal = order.payments.reduce((sum, p) => sum + p.amount, 0)
    const outstandingTotal = Math.max(0, order.offerTotal - paidTotal)

    const response: PaymentDetailResponse = {
      id: order.id,
      number: order.number,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      projectName: order.projectName,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      mrpTotal: order.mrpTotal,
      offerTotal: order.offerTotal,
      paidTotal,
      outstandingTotal,
      createdAt: order.createdAt.toISOString(),
      payments: order.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        receivedAt: p.receivedAt.toISOString(),
        recordedBy: p.recordedBy,
        createdAt: p.createdAt.toISOString(),
      })),
      lineItems: order.lineItems.map((l) => ({
        id: l.id,
        sku: l.sku,
        name: l.name,
        brand: l.brand,
        qty: l.qty,
        mrp: l.mrp,
        offerRate: l.offerRate,
      })),
    }

    return NextResponse.json(response)
  })
}
