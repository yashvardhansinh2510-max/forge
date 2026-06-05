import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission, requireUser, writeAuditLog } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { computeOrderOutstanding } from '@/lib/calculations/outstanding'

// ── Types ──────────────────────────────────────────────────────────────────────

export type AgingBuckets = {
  '0-30': number
  '31-60': number
  '61-90': number
  '90+': number
}

export type OrderSummary = {
  id: string
  number: string
  customerName: string
  customerPhone: string | null
  projectName: string | null
  mrpTotal: number
  offerTotal: number
  paidTotal: number
  outstandingTotal: number
  status: string
  createdAt: string
  isOverdue: boolean
  dueDate: string
  agingDays: number
}

export type PaymentSummary = OrderSummary

export type LedgerEntry = {
  id: string
  name: string
  phone: string | null
  quotationAmount: number
  paymentsReceived: number
  outstandingAmount: number
  dueAmount: number
  lastPaymentDate: string | null
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  aging: AgingBuckets
  orders: OrderSummary[]
}

export type TimelineEntry = {
  id: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
  receivedAt: string
  recordedBy: string
  customerName: string
  projectName: string | null
  orderNumber: string
}

export type PaymentsKPIs = {
  totalOutstanding: number
  collectedThisMonth: number
  activeOrders: number
  fullyPaidOrders: number
}

export type PaymentsListResponse = {
  customerLedger: LedgerEntry[]
  projectLedger: LedgerEntry[]
  orders: OrderSummary[]
  timeline: TimelineEntry[]
  kpis: PaymentsKPIs
  agingSummary: AgingBuckets
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

// ── GET /api/payments ──────────────────────────────────────────────────────────

export async function GET() {
  return withErrorHandling(async () => {
    await requirePermission('Payments', 'View')
    
    // Fetch all relevant orders with their payments
    const orders = await prisma.salesOrder.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        payments: {
          select: { id: true, amount: true, method: true, reference: true, notes: true, receivedAt: true, recordedBy: true },
          orderBy: { receivedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const PAYMENT_TERMS_DAYS = 30 // Configurable default terms

    let totalOutstanding = 0
    let collectedThisMonth = 0
    let fullyPaidOrders = 0

    const customerMap = new Map<string, LedgerEntry>()
    const projectMap = new Map<string, LedgerEntry>()
    const allOrders: OrderSummary[] = []
    const timeline: TimelineEntry[] = []
    
    const globalAging: AgingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }

    for (const order of orders) {
      const { paidTotal, outstandingTotal } = computeOrderOutstanding(order.offerTotal, order.payments)
      const lastPayment = order.payments[0] ?? null
      
      totalOutstanding += outstandingTotal
      if (outstandingTotal === 0) fullyPaidOrders++
      
      const orderPaymentsThisMonth = order.payments
        .filter((p) => p.receivedAt >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0)
      collectedThisMonth += orderPaymentsThisMonth

      // Populate Timeline
      for (const p of order.payments) {
        timeline.push({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          receivedAt: p.receivedAt.toISOString(),
          recordedBy: p.recordedBy,
          customerName: order.customerName,
          projectName: order.projectName,
          orderNumber: order.number,
        })
      }

      // Overdue and Aging logic
      const createdAt = new Date(order.createdAt)
      const dueDate = new Date(createdAt.getTime() + PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000)
      const isOverdue = now > dueDate && outstandingTotal > 0
      
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      let agingKey: keyof AgingBuckets = '0-30'
      if (daysSinceCreation > 90) agingKey = '90+'
      else if (daysSinceCreation > 60) agingKey = '61-90'
      else if (daysSinceCreation > 30) agingKey = '31-60'

      if (outstandingTotal > 0) {
        globalAging[agingKey] += outstandingTotal
      }

      const orderSummary: OrderSummary = {
        id: order.id,
        number: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        projectName: order.projectName,
        mrpTotal: order.mrpTotal,
        offerTotal: order.offerTotal,
        paidTotal,
        outstandingTotal,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        isOverdue,
        dueDate: dueDate.toISOString(),
        agingDays: daysSinceCreation,
      }
      allOrders.push(orderSummary)

      // ── Build Customer Ledger ──
      const customerKey = order.customerName || 'Unknown Customer'
      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          id: customerKey,
          name: customerKey,
          phone: order.customerPhone,
          quotationAmount: 0,
          paymentsReceived: 0,
          outstandingAmount: 0,
          dueAmount: 0,
          lastPaymentDate: null,
          status: 'UNPAID',
          aging: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          orders: [],
        })
      }
      
      const c = customerMap.get(customerKey)!
      c.quotationAmount += order.offerTotal
      c.paymentsReceived += paidTotal
      c.outstandingAmount += outstandingTotal
      if (isOverdue) c.dueAmount += outstandingTotal
      if (outstandingTotal > 0) c.aging[agingKey] += outstandingTotal
      
      if (lastPayment) {
        if (!c.lastPaymentDate || new Date(lastPayment.receivedAt) > new Date(c.lastPaymentDate)) {
          c.lastPaymentDate = lastPayment.receivedAt.toISOString()
        }
      }
      c.orders.push(orderSummary)

      // ── Build Project Ledger ──
      const projectKey = order.projectName || 'Unassigned Projects'
      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, {
          id: projectKey,
          name: projectKey,
          phone: null,
          quotationAmount: 0,
          paymentsReceived: 0,
          outstandingAmount: 0,
          dueAmount: 0,
          lastPaymentDate: null,
          status: 'UNPAID',
          aging: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          orders: [],
        })
      }
      
      const p = projectMap.get(projectKey)!
      p.quotationAmount += order.offerTotal
      p.paymentsReceived += paidTotal
      p.outstandingAmount += outstandingTotal
      if (isOverdue) p.dueAmount += outstandingTotal
      if (outstandingTotal > 0) p.aging[agingKey] += outstandingTotal
      
      if (lastPayment) {
        if (!p.lastPaymentDate || new Date(lastPayment.receivedAt) > new Date(p.lastPaymentDate)) {
          p.lastPaymentDate = lastPayment.receivedAt.toISOString()
        }
      }
      p.orders.push(orderSummary)
    }

    // Sort timeline
    timeline.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

    // Determine status for ledgers
    const updateLedgerStatus = (ledger: LedgerEntry) => {
      if (ledger.outstandingAmount === 0 && ledger.paymentsReceived > 0) ledger.status = 'PAID'
      else if (ledger.dueAmount > 0) ledger.status = 'OVERDUE'
      else if (ledger.paymentsReceived > 0) ledger.status = 'PARTIALLY_PAID'
      else ledger.status = 'UNPAID'
    }

    const customerLedger = Array.from(customerMap.values())
    customerLedger.forEach(updateLedgerStatus)
    customerLedger.sort((a, b) => b.outstandingAmount - a.outstandingAmount) // sort by amount owed

    const projectLedger = Array.from(projectMap.values())
    projectLedger.forEach(updateLedgerStatus)
    projectLedger.sort((a, b) => b.outstandingAmount - a.outstandingAmount)

    const kpis: PaymentsKPIs = {
      totalOutstanding,
      collectedThisMonth,
      activeOrders: orders.length,
      fullyPaidOrders,
    }

    return NextResponse.json({
      customerLedger,
      projectLedger,
      orders: allOrders,
      timeline,
      kpis,
      agingSummary: globalAging
    } satisfies PaymentsListResponse)
  })
}

// ── POST /api/payments ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const actor = await requirePermission('Payments', 'Record')
    // Get full user details if needed for name, though actor might have it.
    // the requirePermission returns the user from DB (id, role, etc).
    const body = await request.json() as unknown
    const data = recordPaymentSchema.parse(body)

    const order = await prisma.salesOrder.findUnique({
      where: { id: data.orderId },
      include: { payments: { select: { amount: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Order not found' }, { status: 404 })
    }

    const { paidTotal: beforePaid, outstandingTotal: beforeOutstanding } = computeOrderOutstanding(order.offerTotal, order.payments)

    const payment = await prisma.customerPayment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        receivedAt: new Date(data.receivedAt),
        recordedBy: data.recordedBy ?? (actor as any).name ?? 'Staff',
      },
    })

    // Keep updatedAt fresh on the order
    await prisma.salesOrder.update({
      where: { id: data.orderId },
      data: { updatedAt: new Date() },
    })
    
    const afterPaid = beforePaid + data.amount
    const afterOutstanding = Math.max(0, order.offerTotal - afterPaid) // afterPaid already includes new payment

    await writeAuditLog({
      actorId: actor.id,
      action: 'PAYMENT_RECORDED',
      category: 'PAYMENTS',
      entityType: 'CustomerPayment',
      entityId: payment.id,
      target: `SalesOrder:${order.id}`,
      beforeSnapshot: { paid: beforePaid, outstanding: beforeOutstanding },
      afterSnapshot: { paid: afterPaid, outstanding: afterOutstanding, amount: data.amount, method: data.method },
      metadata: { orderNumber: order.number, orderId: order.id },
    })

    await logActivity({
      type: 'NOTE',
      userId: actor.id,
      description: `Recorded payment of ₹${data.amount} for ${order.number}`,
      value: data.amount,
    })

    return NextResponse.json({ payment }, { status: 201 })
  })
}
