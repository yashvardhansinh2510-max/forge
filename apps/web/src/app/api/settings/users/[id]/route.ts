import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@forge/db'
import type { UserRole } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission, writeAuditLog } from '@/lib/auth'
import { AppError } from '@/lib/errors'

const PatchSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'WORKER', 'SALES', 'PROCUREMENT', 'ACCOUNTS', 'WAREHOUSE', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const actor = await requirePermission('Settings', 'View')
    const { id } = await params
    const body = await req.json() as unknown
    const data = PatchSchema.parse(body)

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true, status: true },
    })
    if (!existing) throw new AppError('NOT_FOUND', 'User not found', 404)

    const updateData: { role?: UserRole; isActive?: boolean; status?: 'ACTIVE' | 'DISABLED' } = {}
    if (data.role !== undefined) updateData.role = data.role as UserRole
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
      updateData.status = data.isActive ? 'ACTIVE' : 'DISABLED'
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, clerkId: true, status: true },
    })

    const action = data.role !== undefined
      ? 'USER_ROLE_CHANGED'
      : data.isActive
        ? 'USER_ENABLED'
        : 'USER_DISABLED'

    await writeAuditLog({
      actorId: actor.id,
      action,
      category: 'USERS',
      entityType: 'User',
      entityId: id,
      beforeSnapshot: { role: existing.role, isActive: existing.isActive, status: existing.status },
      afterSnapshot: { role: updated.role, isActive: updated.isActive, status: updated.status },
    })

    return NextResponse.json(updated)
  })
}
