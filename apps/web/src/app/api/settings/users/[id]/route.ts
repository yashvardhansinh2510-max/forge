import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'

const PatchSchema = z.object({
  role: z.enum(['owner', 'manager', 'worker']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth()
  const callerRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user || !user.clerkId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const client = await clerkClient()
  await client.users.updateUser(user.clerkId, {
    publicMetadata: { role: parsed.data.role },
  })

  // DB update happens via webhook (user.updated event)
  // Return optimistic response
  return NextResponse.json({ id, role: parsed.data.role })
}
