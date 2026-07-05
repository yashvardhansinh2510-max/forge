import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

// ── Response types ─────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  activeFollowUps: number
  overdueFollowUps: number
  openQuotationsCount: number
  openQuotationsPipelineValue: number
  poLinesInTransit: number
  outstandingPayments: number
  collectedThisMonth: number
}

export interface DashboardActivityItem {
  id: string
  type: string
  description: string
  userName: string
  contactId: string | null
  value: number | null
  createdAt: string
}

export interface DashboardCustomer {
  rank: number
  customerName: string
  revenue: number
  orderCount: number
  outstanding: number
}

export interface DashboardRevenuePoint {
  month: string   // "Apr", "May" — 3-char label
  year: number
  revenue: number
}

export interface DashboardPurchaseStage {
  stage: string
  qty: number
}

export interface DashboardData {
  kpis: DashboardKPIs
  recentActivity: DashboardActivityItem[]
  topCustomers: DashboardCustomer[]
  revenueByMonth: DashboardRevenuePoint[]   // always 12 slots, zero-filled
  purchaseStages: DashboardPurchaseStage[]
  generatedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildLast12Months(): Array<{ year: number; month: number; label: string }> {
  const slots: Array<{ year: number; month: number; label: string }> = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    slots.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: SHORT_MONTHS[d.getMonth()] ?? 'Jan' })
  }
  return slots
}

// ── GET /api/dashboard ─────────────────────────────────────────────────────────

export async function GET() {
  return withErrorHandling(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      followUpCounts,
      openQuotationData,
      stageAgg,
      salesData,
      activityResult,
      rawRevenue,
    ] = await Promise.all([
      // 1 — Follow-up KPIs (active + overdue)
      (async () => {
        const [active, overdue] = await Promise.all([
          prisma.followUp.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
          prisma.followUp.count({ where: { status: { notIn: ['WON', 'LOST'] }, nextFollowUpDate: { lt: now } } }),
        ])
        return { active, overdue }
      })(),

      // 2 — Open quotations + pipeline value
      prisma.quotation.findMany({
        where: { currentStatus: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
        select: {
          id: true,
          revisions: {
            select: {
              rooms: {
                select: {
                  items: { select: { totalOffer: true } },
                },
              },
            },
          },
        },
      }),

      // 3 — PO line stage aggregates (used for KPI and chart)
      prisma.pOLineItem.aggregate({
        _sum: {
          qtyOrdered:    true,
          qtyPendingCo:  true,
          qtyAtGodown:   true,
          qtyInBox:      true,
          qtyDispatched: true,
        },
      }),

      // 4 — Sales orders with payments (outstanding + collected + top customers)
      prisma.salesOrder.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: {
          customerName: true,
          offerTotal: true,
          payments: {
            select: { amount: true, receivedAt: true },
          },
        },
      }),

      // 5 — Recent activities + user name lookup (2-step, userId is not a relation)
      (async () => {
        const activities = await prisma.activity.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
        const userIds = [...new Set(activities.map((a) => a.userId).filter((id): id is string => id !== null))]
        const users =
          userIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true },
              })
            : []
        const userMap = new Map(users.map((u) => [u.id, u.name]))
        return { activities, userMap }
      })(),

      // 6 — Monthly revenue from CustomerPayment (last 12 months)
      prisma.$queryRaw<Array<{ year: number; month: number; revenue: number }>>`
        SELECT
          EXTRACT(YEAR  FROM "receivedAt")::int   AS year,
          EXTRACT(MONTH FROM "receivedAt")::int   AS month,
          SUM(amount)::float                      AS revenue
        FROM "CustomerPayment"
        WHERE "receivedAt" >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2
        ORDER BY 1, 2
      `,
    ])

    // ── Derive KPIs ─────────────────────────────────────────────────────────────

    const openQuotationsPipelineValue = openQuotationData.reduce((sum, q) => {
      return (
        sum +
        q.revisions.reduce((rSum, rev) => {
          return (
            rSum +
            rev.rooms.reduce((rmSum, room) => {
              return rmSum + room.items.reduce((iSum, item) => iSum + item.totalOffer, 0)
            }, 0)
          )
        }, 0)
      )
    }, 0)

    const s = stageAgg._sum
    const poLinesInTransit = (s.qtyPendingCo ?? 0) + (s.qtyAtGodown ?? 0)

    let outstandingPayments = 0
    let collectedThisMonth = 0
    salesData.forEach((order) => {
      const paid = order.payments.reduce((sum, p) => sum + p.amount, 0)
      outstandingPayments += Math.max(0, order.offerTotal - paid)
      collectedThisMonth += order.payments
        .filter((p) => p.receivedAt >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0)
    })

    // ── Top Customers (top 5 by revenue) ────────────────────────────────────────

    const customerMap = new Map<string, { revenue: number; orderCount: number; outstanding: number }>()
    salesData.forEach((order) => {
      const paid = order.payments.reduce((sum, p) => sum + p.amount, 0)
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
    const topCustomers: DashboardCustomer[] = Array.from(customerMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, stats], i) => ({
        rank: i + 1,
        customerName: name,
        revenue: stats.revenue,
        orderCount: stats.orderCount,
        outstanding: stats.outstanding,
      }))

    // ── Revenue By Month (12 slots, zero-filled) ───────────────────────────────

    const revenueMap = new Map<string, number>()
    rawRevenue.forEach((row) => {
      const yr = Number(row.year)
      const mo = Number(row.month)
      const rev = Number(row.revenue)
      revenueMap.set(`${yr}-${mo}`, rev)
    })
    const revenueByMonth: DashboardRevenuePoint[] = buildLast12Months().map((slot) => ({
      month: slot.label,
      year: slot.year,
      revenue: revenueMap.get(`${slot.year}-${slot.month}`) ?? 0,
    }))

    // ── Purchase Stages ────────────────────────────────────────────────────────

    const purchaseStages: DashboardPurchaseStage[] = [
      { stage: 'Ordered',    qty: s.qtyPendingCo  ?? 0 },
      { stage: 'At Godown',  qty: s.qtyAtGodown   ?? 0 },
      { stage: 'In Box',     qty: s.qtyInBox      ?? 0 },
      { stage: 'Dispatched', qty: s.qtyDispatched ?? 0 },
    ]

    // ── Recent Activity ────────────────────────────────────────────────────────

    const { activities, userMap } = activityResult
    const recentActivity: DashboardActivityItem[] = activities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      userName: (a.userId ? userMap.get(a.userId) : undefined) ?? 'Staff',
      contactId: a.contactId,
      value: a.value,
      createdAt: a.createdAt.toISOString(),
    }))

    // ── Mock fallback when DB is empty ─────────────────────────────────────────

    const dbIsEmpty =
      followUpCounts.active === 0 &&
      openQuotationData.length === 0 &&
      salesData.length === 0 &&
      activityResult.activities.length === 0

    if (dbIsEmpty) {
      const mockResponse: DashboardData = {
        kpis: {
          activeFollowUps: 0,
          overdueFollowUps: 0,
          openQuotationsCount: 0,
          openQuotationsPipelineValue: 0,
          poLinesInTransit: 0,
          outstandingPayments: 0,
          collectedThisMonth: 0,
        },
        recentActivity: [],
        topCustomers: [],
        revenueByMonth: [],
        purchaseStages: [],
        generatedAt: new Date().toISOString(),
      }
      return NextResponse.json(mockResponse)
    }

    // ── Assemble response ──────────────────────────────────────────────────────

    const response: DashboardData = {
      kpis: {
        activeFollowUps: followUpCounts.active,
        overdueFollowUps: followUpCounts.overdue,
        openQuotationsCount: openQuotationData.length,
        openQuotationsPipelineValue,
        poLinesInTransit,
        outstandingPayments,
        collectedThisMonth,
      },
      recentActivity,
      topCustomers,
      revenueByMonth,
      purchaseStages,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  })
}
