import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { clerkConfigured } from '@/lib/auth/config'

const PatchSchema = z.object({
  role: z.enum(['owner', 'manager', 'worker']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (clerkConfigured) {
    const { auth } = await import('@clerk/nextjs/server')
    const { sessionClaims } = await auth()
    const callerRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role

    if (callerRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!clerkConfigured) {
    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role.toUpperCase() as 'OWNER' | 'MANAGER' | 'WORKER' },
      select: { id: true, role: true },
    })

    return NextResponse.json({ id: updated.id, role: updated.role.toLowerCase() })
  }

  if (!user.clerkId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  await client.users.updateUser(user.clerkId, {
    publicMetadata: { role: parsed.data.role },
  })

  // DB update happens via webhook (user.updated event)
  // Return optimistic response
  return NextResponse.json({ id, role: parsed.data.role })
}
