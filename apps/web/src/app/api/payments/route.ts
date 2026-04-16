import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { withErrorHandling, getDevUserId } from '@/lib/api-helpers'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentSummary = {
  id: string
  number: string
  customerId: string
  customerName: string
  customerPhone: string | null
  status: string
  projectName: string | null
  mrpTotal: number
  offerTotal: number
  paidTotal: number
  outstandingTotal: number
  lastPaymentAt: string | null
  createdAt: string
}

export type PaymentsKPIs = {
  totalOutstanding: number
  collectedThisMonth: number
  activeOrders: number
  fullyPaidOrders: number
}

export type PaymentsListResponse = {
  orders: PaymentSummary[]
  kpis: PaymentsKPIs
}

// ── Validation ─────────────────────────────────────────────────────────────────

const recordPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  receivedAt: z.string(),
  recordedBy: z.string().optional(),
})

// ── Mock orders (used when DB is empty) ───────────────────────────────────────

const MOCK_ORDERS: PaymentSummary[] = [
  {
    id: 'so-mock-01', number: 'SO-2025-0234',
    customerId: 'c01', customerName: 'Lodha Developers Ltd',
    customerPhone: '+91 98765 44321', status: 'CONFIRMED',
    projectName: 'Lodha Palava Phase 7',
    mrpTotal: 2400000, offerTotal: 2180000, paidTotal: 1090000, outstandingTotal: 1090000,
    lastPaymentAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-02', number: 'SO-2025-0228',
    customerId: 'c02', customerName: 'Prestige Group (Mumbai)',
    customerPhone: '+91 87654 99001', status: 'PROCESSING',
    projectName: 'Prestige Windsor Penthouses',
    mrpTotal: 1950000, offerTotal: 1724000, paidTotal: 862000, outstandingTotal: 862000,
    lastPaymentAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-03', number: 'SO-2025-0221',
    customerId: 'c03', customerName: 'Sanjay Patil Interior Works',
    customerPhone: '+91 99204 56789', status: 'DELIVERED',
    projectName: 'Runwal Greens 2BHK',
    mrpTotal: 200000, offerTotal: 176000, paidTotal: 176000, outstandingTotal: 0,
    lastPaymentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-04', number: 'SO-2025-0215',
    customerId: 'c04', customerName: 'Rajesh Constructions Pvt Ltd',
    customerPhone: '+91 98200 11234', status: 'DISPATCHED',
    projectName: 'Rajesh Heights 12 Units',
    mrpTotal: 340000, offerTotal: 298000, paidTotal: 149000, outstandingTotal: 149000,
    lastPaymentAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'so-mock-05', number: 'SO-2025-0208',
    customerId: 'c05', customerName: 'Oberoi Realty',
    customerPhone: '+91 70000 12345', status: 'CONFIRMED',
    projectName: 'Oberoi Sky City Tower A',
    mrpTotal: 820000, offerTotal: 740000, paidTotal: 370000, outstandingTotal: 370000,
    lastPaymentAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
]

// ── GET /api/payments ──────────────────────────────────────────────────────────

export async function GET() {
  return withErrorHandling(async () => {
    const orders = await prisma.salesOrder.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        payments: {
          select: { amount: true, receivedAt: true },
          orderBy: { receivedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Serve mock data when DB is empty
    if (orders.length === 0) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const totalOutstanding = MOCK_ORDERS.reduce((s, o) => s + o.outstandingTotal, 0)
      const collectedThisMonth = MOCK_ORDERS
        .filter((o) => o.lastPaymentAt && new Date(o.lastPaymentAt) >= startOfMonth)
        .reduce((s, o) => s + o.paidTotal, 0)
      const fullyPaid = MOCK_ORDERS.filter((o) => o.outstandingTotal === 0).length
      return NextResponse.json({
        orders: MOCK_ORDERS,
        kpis: {
          totalOutstanding,
          collectedThisMonth,
          activeOrders: MOCK_ORDERS.length - fullyPaid,
          fullyPaidOrders: fullyPaid,
        },
      } satisfies PaymentsListResponse)
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalOutstanding = 0
    let collectedThisMonth = 0
    let fullyPaidOrders = 0

    const summaries: PaymentSummary[] = orders.map((order) => {
      const paidTotal = order.payments.reduce((sum, p) => sum + p.amount, 0)
      const outstandingTotal = Math.max(0, order.offerTotal - paidTotal)
      const lastPayment = order.payments[0] ?? null

      totalOutstanding += outstandingTotal
      fullyPaidOrders += outstandingTotal === 0 ? 1 : 0
      collectedThisMonth += order.payments
        .filter((p) => p.receivedAt >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0)

      return {
        id: order.id,
        number: order.number,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        projectName: order.projectName,
        mrpTotal: order.mrpTotal,
        offerTotal: order.offerTotal,
        paidTotal,
        outstandingTotal,
        lastPaymentAt: lastPayment?.receivedAt.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
      }
    })

    const kpis: PaymentsKPIs = {
      totalOutstanding,
      collectedThisMonth,
      activeOrders: orders.length,
      fullyPaidOrders,
    }

    return NextResponse.json({ orders: summaries, kpis } satisfies PaymentsListResponse)
  })
}

// ── POST /api/payments ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json() as unknown
    const data = recordPaymentSchema.parse(body)

    const order = await prisma.salesOrder.findUnique({
      where: { id: data.orderId },
      include: { payments: { select: { amount: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Order not found' }, { status: 404 })
    }

    const payment = await prisma.customerPayment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        receivedAt: new Date(data.receivedAt),
        recordedBy: data.recordedBy ?? 'Staff',
      },
    })

    // Keep updatedAt fresh on the order
    await prisma.salesOrder.update({
      where: { id: data.orderId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ payment }, { status: 201 })
  })
}
