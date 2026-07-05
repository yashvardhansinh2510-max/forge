import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { z } from 'zod'
import { hasPermission, ASSIGNABLE_ROLES } from '@/lib/permissions'
import { getCurrentRole } from '@/lib/permissions-server'
import { withErrorHandling } from '@/lib/api-helpers'

const PatchSchema = z.object({
  role:     z.enum(ASSIGNABLE_ROLES as [string, ...string[]]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const role = await getCurrentRole()
    if (!hasPermission(role, 'can_manage_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { role: newRole, isActive } = parsed.data

    if (newRole) {
      // Persist role to DB so DB queries stay consistent with Clerk
      await prisma.user.update({
        where: { id },
        data:  { role: newRole as Parameters<typeof prisma.user.update>[0]['data']['role'] },
      })
      // Sync to Clerk publicMetadata so getCurrentRole() reads correct value from session claims
      if (user.clerkId) {
        const client = await clerkClient()
        await client.users.updateUser(user.clerkId, {
          publicMetadata: { role: newRole },
        })
      }
    }

    if (isActive !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.user as any).update({
        where: { id },
        data:  { isActive },
      })
    }

    const currentIsActive = (user as unknown as { isActive?: boolean }).isActive ?? true
    return NextResponse.json({ id, role: newRole ?? user.role, isActive: isActive ?? currentIsActive })
  })
}
