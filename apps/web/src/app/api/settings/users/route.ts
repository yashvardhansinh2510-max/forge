import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

export async function GET() {
  return withErrorHandling(async () => {
    await requirePermission('Settings', 'View')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        clerkId: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  })
}
