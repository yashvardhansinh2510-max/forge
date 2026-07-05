// GET /api/dashboard/stats — live KPIs, 6-month revenue, quotation pipeline, recent activity

import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StatsKPIs {
  totalRevenue: number
  totalRevenuePrev: number     // last month — used by KPITile for trend
  totalRevenueChange: number   // pre-computed % MoM
  activeQuotations: number
  quotationValue: number
  openPurchaseOrders: number
  pendingFollowUps: number
}

export interface StatsRevenuePoint {
  month: string    // "Jan", "Feb", etc.
  revenue: number
}

export interface StatsPipelineStage {
  stage: string
  count: number
  value: number
}

export interface StatsActivityItem {
  id: string
  type: 'quotation_created' | 'payment_received' | 'po_created'
  description: string
  amount?: number
  createdAt: string
}

export interface StatsTopCustomer {
  rank: number
  customerName: string
  revenue: number
  orderCount: number
  outstanding: number
}

export interface DashboardStats {
  kpis: StatsKPIs
  revenueChart: StatsRevenuePoint[]
  pipelineStages: StatsPipelineStage[]
  recentActivity: StatsActivityItem[]
  topCustomers: StatsTopCustomer[]
  generatedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET() {
  return withErrorHandling(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      revThis,
      revLast,
      activeQuoData,
      openPoCount,
      pendingFuCount,
      rawRevenue6m,
      pipelineRaw,
      salesData,
      recentPayments,
      recentQuotations,
      recentPOs,
    ] = await Promise.all([
      // 1 — Revenue this month
      prisma.customerPayment.aggregate({
        _sum: { amount: true },
        where: { receivedAt: { gte: startOfMonth } },
      }),

      // 2 — Revenue last month (for MoM % change)
      prisma.customerPayment.aggregate({
        _sum: { amount: true },
        where: { receivedAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // 3 — Active quotations (DRAFT + PENDING_APPROVAL) + pipeline value
      prisma.quotation.findMany({
        where: { currentStatus: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
        select: {
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            select: {
              rooms: { select: { items: { select: { totalOffer: true } } } },
            },
          },
        },
      }),

      // 4 — Open POs (not FULLY_RECEIVED, not CANCELLED)
      // Note: POStatus has no DISPATCHED — closest "open" set is everything except completed/cancelled
      prisma.purchaseOrder.count({
        where: { status: { notIn: ['FULLY_RECEIVED', 'CANCELLED'] } },
      }),

      // 5 — Follow-ups due in next 7 days
      prisma.followUp.count({
        where: {
          nextFollowUpDate: { lte: sevenDaysFromNow },
          status: { notIn: ['WON', 'LOST'] },
        },
      }),

      // 6 — Monthly revenue (last 6 months)
      prisma.$queryRaw<Array<{ year: number; month: number; revenue: number }>>`
        SELECT
          EXTRACT(YEAR  FROM "receivedAt")::int  AS year,
          EXTRACT(MONTH FROM "receivedAt")::int  AS month,
          SUM(amount)::float                     AS revenue
        FROM "CustomerPayment"
        WHERE "receivedAt" >= NOW() - INTERVAL '6 months'
        GROUP BY 1, 2
        ORDER BY 1, 2
      `,

      // 7 — Quotation pipeline (count + value per status) via lateral join
      prisma.$queryRaw<Array<{ stage: string; count: number; value: number }>>`
        SELECT
          q."currentStatus"                           AS stage,
          COUNT(DISTINCT q.id)::int                  AS count,
          COALESCE(SUM(qi."totalOffer"), 0)::float   AS value
        FROM "Quotation" q
        LEFT JOIN LATERAL (
          SELECT id FROM "QuotationRevision"
          WHERE "quotationId" = q.id
          ORDER BY "revisionNumber" DESC
          LIMIT 1
        ) latest ON TRUE
        LEFT JOIN "QuotationRoom" room ON room."revisionId" = latest.id
        LEFT JOIN "QuotationItem" qi   ON qi."roomId"       = room.id
        GROUP BY q."currentStatus"
        ORDER BY q."currentStatus"
      `,

      // 8 — Sales orders for top-customer computation
      prisma.salesOrder.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: {
          customerName: true,
          offerTotal: true,
          payments: { select: { amount: true } },
        },
      }),

      // 9 — Recent payments
      prisma.customerPayment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          order: { select: { customerName: true } },
        },
      }),

      // 10 — Recent quotations
      prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, number: true, customerName: true, createdAt: true },
      }),

      // 11 — Recent POs
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, poNumber: true, customerName: true, createdAt: true },
      }),
    ])

    // ── KPIs ───────────────────────────────────────────────────────────────────

    const totalRevenue = revThis._sum.amount ?? 0
    const totalRevenuePrev = revLast._sum.amount ?? 0
    const totalRevenueChange =
      totalRevenuePrev > 0
        ? Math.round(((totalRevenue - totalRevenuePrev) / totalRevenuePrev) * 1000) / 10
        : 0

    const activeQuotations = activeQuoData.length
    const quotationValue = activeQuoData.reduce(
      (sum, q) =>
        sum +
        q.revisions.reduce(
          (rs, rev) =>
            rs +
            rev.rooms.reduce(
              (rms, room) => rms + room.items.reduce((is, item) => is + item.totalOffer, 0),
              0,
            ),
          0,
        ),
      0,
    )

    // ── Revenue Chart (last 6 months, zero-filled) ─────────────────────────────

    const revenueMap = new Map<string, number>()
    rawRevenue6m.forEach((row) => {
      revenueMap.set(`${Number(row.year)}-${Number(row.month)}`, Number(row.revenue))
    })
    const revenueChart: StatsRevenuePoint[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return {
        month: SHORT_MONTHS[d.getMonth()] ?? 'Jan',
        revenue: revenueMap.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 0,
      }
    })

    // ── Pipeline Stages ────────────────────────────────────────────────────────

    const pipelineStages: StatsPipelineStage[] = pipelineRaw.map((row) => ({
      stage: row.stage,
      count: Number(row.count),
      value: Number(row.value),
    }))

    // ── Top Customers ──────────────────────────────────────────────────────────

    const customerMap = new Map<string, { revenue: number; orderCount: number; outstanding: number }>()
    salesData.forEach((order) => {
      const paid = order.payments.reduce((s, p) => s + p.amount, 0)
      const outstanding = Math.max(0, order.offerTotal - paid)
      const existing = customerMap.get(order.customerName)
      if (existing) {
        existing.revenue += order.offerTotal
        existing.orderCount += 1
        existing.outstanding += outstanding
      } else {
        customerMap.set(order.customerName, { revenue: order.offerTotal, orderCount: 1, outstanding })
      }
    })
    const topCustomers: StatsTopCustomer[] = Array.from(customerMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, stats], i) => ({
        rank: i + 1,
        customerName: name,
        revenue: stats.revenue,
        orderCount: stats.orderCount,
        outstanding: stats.outstanding,
      }))

    // ── Recent Activity (payments + quotations + POs, newest first) ────────────

    const recentActivity: StatsActivityItem[] = [
      ...recentPayments.map((p) => ({
        id: `pay-${p.id}`,
        type: 'payment_received' as const,
        description: `Payment received from ${p.order.customerName}`,
        amount: p.amount,
        createdAt: p.createdAt.toISOString(),
      })),
      ...recentQuotations.map((q) => ({
        id: `quot-${q.id}`,
        type: 'quotation_created' as const,
        description: `Quotation ${q.number} created for ${q.customerName ?? 'Customer'}`,
        createdAt: q.createdAt.toISOString(),
      })),
      ...recentPOs.map((po) => ({
        id: `po-${po.id}`,
        type: 'po_created' as const,
        description: `PO ${po.poNumber} raised${po.customerName ? ` · ${po.customerName}` : ''}`,
        createdAt: po.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    return NextResponse.json({
      kpis: {
        totalRevenue,
        totalRevenuePrev,
        totalRevenueChange,
        activeQuotations,
        quotationValue,
        openPurchaseOrders: openPoCount,
        pendingFollowUps: pendingFuCount,
      },
      revenueChart,
      pipelineStages,
      recentActivity,
      topCustomers,
      generatedAt: now.toISOString(),
    } satisfies DashboardStats)
  })
}
