import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { hasPermission } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'
import { withErrorHandling } from '@/lib/api-helpers'

export async function GET() {
  return withErrorHandling(async () => {
    const role = await getCurrentRole()
    if (!hasPermission(role, 'can_manage_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await (prisma.user as any).findMany({
      select: { id: true, name: true, email: true, role: true, clerkId: true, isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  })
}
