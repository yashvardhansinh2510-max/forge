import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { clerkConfigured } from '@/lib/auth/config'

export async function GET() {
  if (clerkConfigured) {
    const { auth } = await import('@clerk/nextjs/server')
    const { sessionClaims } = await auth()
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

    if (role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = await (prisma.user as any).findMany({
    select: { id: true, name: true, email: true, role: true, clerkId: true, isActive: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}
