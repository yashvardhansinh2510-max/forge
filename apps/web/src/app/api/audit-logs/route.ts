// GET /api/audit-logs — list audit log entries (owner/admin only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const role = await getCurrentRole().catch(() => 'READ_ONLY' as const)
    if (!hasPermission(role, 'can_view_audit_logs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10) || 50))
    const skip  = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<Array<{
        id:         string
        userId:     string
        userName:   string
        action:     string
        entityType: string
        entityId:   string | null
        payload:    unknown
        ip:         string | null
        createdAt:  Date
      }>>`
        SELECT id, "userId", "userName", action, "entityType", "entityId", payload, ip, "createdAt"
        FROM "AuditLog"
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `.catch(() => [] as Array<{ id: string; userId: string; userName: string; action: string; entityType: string; entityId: string | null; payload: unknown; ip: string | null; createdAt: Date }>),
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM "AuditLog"`
        .then(([r]) => Number(r?.count ?? 0))
        .catch(() => 0),
    ])

    return NextResponse.json({
      logs: logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt).toISOString() })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })
}
