// GET /api/dashboard/operational — operational intelligence KPIs for the dashboard.
// Kept separate from /api/dashboard/stats (financial KPIs) for clean separation.

import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

const DAY_MS = 86_400_000

const SLA_DAYS: Record<string, number> = {
  ORDER_IN_CO: 7,
  CO_BILLING:  5,
  INBOX:       7,
  DISPATCHED:  3,
}

export interface OperationalKPIs {
  pendingDispatches:  number   // lines with INBOX qty > 0
  delayedOrders:      number   // lines overdue by SLA
  billingPending:     number   // lines with CO_BILLING qty > 0
  urgentOrders:       number   // lines with priority = URGENT
  completedToday:     number   // lines with COMPLETED qty > 0 and stageMovement today
  totalPendingValue:  number   // sum of landingCost × pendingQty
}

export interface EmployeeWorkload {
  userId:    string
  userName:  string
  pending:   number
  completed: number
}

export interface SupplierDelay {
  vendorName:   string
  delayedLines: number
  totalLines:   number
}

export interface OperationalAlert {
  id:       string
  severity: 'warning' | 'alert' | 'critical'
  type:     string
  title:    string
  body:     string
  lineId?:  string
}

export interface OperationalDashboard {
  kpis:           OperationalKPIs
  employeeWork:   EmployeeWorkload[]
  supplierDelays: SupplierDelay[]
  alerts:         OperationalAlert[]
  generatedAt:    string
}

export async function GET() {
  return withErrorHandling(async () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    type RawLine = {
      id:            string
      priority:      string
      assignedToId:  string | null
      assignedName:  string | null
      qtyOrdered:    number
      qtyPendingCo:  number
      qtyAtGodown:   number
      qtyInBox:      number
      qtyDispatched: number
      landingCost:   number | null
      createdAt:     Date
      stageEnteredAt: Date | null
      vendorName:    string | null
    }

    // Fetch all active lines in one go to avoid N+1
    const allLines = await prisma.$queryRaw<RawLine[]>`
      SELECT
        l.id,
        l.priority,
        l."assignedToId",
        u.name AS "assignedName",
        l."qtyOrdered",
        l."qtyPendingCo",
        l."qtyAtGodown",
        l."qtyInBox",
        l."qtyDispatched",
        l."landingCost",
        l."createdAt",
        l."stageEnteredAt",
        po."vendorName"
      FROM "POLineItem" l
      LEFT JOIN "User" u ON u.id = l."assignedToId"
      JOIN "PurchaseOrder" po ON po.id = l."poId"
      WHERE (l."qtyPendingCo" + l."qtyAtGodown" + l."qtyInBox") > 0
    `.catch(() => [] as RawLine[])

    // ── KPIs ─────────────────────────────────────────────────────────────────

    let pendingDispatches  = 0
    let billingPending     = 0
    let urgentOrders       = 0
    let delayedOrders      = 0
    let totalPendingValue  = 0

    const delayedSet = new Set<string>()

    for (const line of allLines) {
      const since = line.stageEnteredAt ?? line.createdAt
      const ageDays = Math.floor((now.getTime() - new Date(since).getTime()) / DAY_MS)

      if (Number(line.qtyAtGodown) > 0)   pendingDispatches++
      if (Number(line.qtyPendingCo) > 0)  billingPending++
      if (line.priority === 'URGENT')      urgentOrders++

      // Delayed: overdue in any active stage
      const activeStages: Array<[string, number]> = [
        ['CO_BILLING', Number(line.qtyPendingCo)],
        ['INBOX',      Number(line.qtyAtGodown)],
        ['DISPATCHED', Number(line.qtyInBox)],
      ]
      for (const [stage, qty] of activeStages) {
        if (qty > 0 && ageDays >= (SLA_DAYS[stage] ?? 999)) {
          delayedSet.add(line.id)
        }
      }

      // Pending value (landingCost × total pending qty)
      const pendingQty = Number(line.qtyPendingCo) + Number(line.qtyAtGodown) + Number(line.qtyInBox)
      if (line.landingCost && pendingQty > 0) {
        totalPendingValue += Number(line.landingCost) * pendingQty
      }
    }
    delayedOrders = delayedSet.size

    // Completed today: stage movements with toStage=COMPLETED today
    const completedToday = await prisma.stageMovement.count({
      where: {
        toStage: 'COMPLETED',
        movedAt: { gte: todayStart },
      },
    }).catch(() => 0)

    // ── Employee Workload ─────────────────────────────────────────────────────

    const empMap = new Map<string, EmployeeWorkload>()
    for (const line of allLines) {
      if (!line.assignedToId || !line.assignedName) continue
      const existing = empMap.get(line.assignedToId)
      const pendingQty = Number(line.qtyPendingCo) + Number(line.qtyAtGodown) + Number(line.qtyInBox)
      if (existing) {
        existing.pending   += pendingQty > 0 ? 1 : 0
        existing.completed += Number(line.qtyDispatched) > 0 ? 1 : 0
      } else {
        empMap.set(line.assignedToId, {
          userId:    line.assignedToId,
          userName:  line.assignedName,
          pending:   pendingQty > 0 ? 1 : 0,
          completed: Number(line.qtyDispatched) > 0 ? 1 : 0,
        })
      }
    }
    const employeeWork = Array.from(empMap.values())
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10)

    // ── Supplier Delays ───────────────────────────────────────────────────────

    const vendorMap = new Map<string, { delayed: number; total: number }>()
    for (const line of allLines) {
      const vendor = line.vendorName ?? 'Unknown'
      const entry = vendorMap.get(vendor) ?? { delayed: 0, total: 0 }
      entry.total++
      if (delayedSet.has(line.id)) entry.delayed++
      vendorMap.set(vendor, entry)
    }
    const supplierDelays: SupplierDelay[] = Array.from(vendorMap.entries())
      .filter(([, v]) => v.delayed > 0)
      .map(([vendorName, v]) => ({ vendorName, delayedLines: v.delayed, totalLines: v.total }))
      .sort((a, b) => b.delayedLines - a.delayedLines)
      .slice(0, 10)

    // ── Alerts ────────────────────────────────────────────────────────────────

    const alerts: OperationalAlert[] = []

    if (delayedOrders > 0) {
      alerts.push({
        id: 'delayed-orders',
        severity: delayedOrders > 10 ? 'critical' : 'alert',
        type: 'delayed_orders',
        title: `${delayedOrders} order${delayedOrders !== 1 ? 's' : ''} overdue`,
        body: `${delayedOrders} line item${delayedOrders !== 1 ? 's have' : ' has'} exceeded SLA thresholds.`,
      })
    }
    if (billingPending > 5) {
      alerts.push({
        id: 'billing-backlog',
        severity: billingPending > 15 ? 'critical' : 'warning',
        type: 'billing_pending',
        title: `${billingPending} items pending billing`,
        body: 'High billing backlog detected. Review Co. Billing stage.',
      })
    }
    if (pendingDispatches > 10) {
      alerts.push({
        id: 'dispatch-backlog',
        severity: 'warning',
        type: 'dispatch_pending',
        title: `${pendingDispatches} dispatches pending`,
        body: 'Items sitting at Inbox/godown awaiting dispatch.',
      })
    }
    if (urgentOrders > 0) {
      alerts.push({
        id: 'urgent-orders',
        severity: 'alert',
        type: 'urgent_orders',
        title: `${urgentOrders} urgent order${urgentOrders !== 1 ? 's' : ''}`,
        body: 'Urgent priority items need immediate attention.',
      })
    }

    return NextResponse.json({
      kpis: {
        pendingDispatches,
        delayedOrders,
        billingPending,
        urgentOrders,
        completedToday,
        totalPendingValue: Math.round(totalPendingValue),
      },
      employeeWork,
      supplierDelays,
      alerts,
      generatedAt: now.toISOString(),
    } satisfies OperationalDashboard)
  })
}
