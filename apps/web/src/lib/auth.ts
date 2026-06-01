// lib/auth.ts — Server-side auth helpers using Clerk + Prisma

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@forge/db'
import { ForbiddenError, AppError } from '@/lib/errors'
import type { UserRole } from '@forge/db'

export type AuthUser = {
  id: string
  clerkId: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  maxDiscountPct: number
}

// Seeded dev user — used as fallback when no Clerk session is active.
// Matches packages/db/prisma/seed.ts → id: 'dev-user-001', role: 'OWNER'.
const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  clerkId: 'dev_user',
  name: 'Admin',
  email: 'admin@buildconhouse.com',
  role: 'OWNER',
  isActive: true,
  maxDiscountPct: 100,
}

/**
 * Resolves the currently signed-in Clerk user to their DB record.
 * Auto-provisions the DB row on first login (before webhook fires).
 * Returns the dev OWNER fallback when no Clerk session is active.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { userId } = await auth()
  if (!userId) return DEV_USER

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, clerkId: true, name: true, email: true, role: true, isActive: true, maxDiscountPct: true },
  })

  // Auto-provision DB row if webhook hasn't fired yet
  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email

    user = await prisma.user.upsert({
      where: { clerkId: userId },
      create: { clerkId: userId, email, name, role: 'VIEWER', status: 'ACTIVE' },
      update: { lastLogin: new Date() },
      select: { id: true, clerkId: true, name: true, email: true, role: true, isActive: true, maxDiscountPct: true, status: true },
    })
  } else {
    // Session tracking for existing user
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })
  }

  // Handle both legacy isActive and new status
  if (!user.isActive || user.status === 'DISABLED') {
    throw new AppError('ACCOUNT_DISABLED', 'Your account has been disabled', 403)
  }

  return user as AuthUser
}

/** Throws 401 if not authenticated. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new AppError('UNAUTHORIZED', 'Authentication required', 401)
  return user
}

/** Throws 401/403 if not authenticated or lacking module:action permission. */
export async function requirePermission(module: string, action: string): Promise<AuthUser> {
  const user = await requireUser()
  if (user.role === 'OWNER') return user

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      customRole: {
        select: {
          name: true,
          permissions: {
            select: { permission: { select: { module: true, action: true } } }
          }
        }
      }
    }
  })

  const hasPerm = dbUser?.customRole?.name === 'OWNER' ||
    dbUser?.customRole?.permissions.some(
      rp => rp.permission.module === module && rp.permission.action === action
    )

  if (!hasPerm) throw new ForbiddenError(`Permission required: ${module}:${action}`)
  return user
}

export type WriteAuditLogParams = {
  actorId: string | null;
  action: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  target?: string;
  metadata?: Record<string, unknown>;
};

/** Write an audit log entry. Fire-and-forget — never throws. */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        actorId: params.actorId,
        action: params.action,
        category: params.category ?? 'LEGACY',
        entityType: params.entityType,
        entityId: params.entityId,
        status: params.status ?? 'SUCCESS',
        beforeSnapshot: (params.beforeSnapshot ?? undefined) as any,
        afterSnapshot: (params.afterSnapshot ?? undefined) as any,
        target: params.target,
        metadata: (params.metadata ?? undefined) as any,
      },
    })
  } catch (err) {
    // Audit log failures must never break the main flow
    console.error('[writeAuditLog] Error:', err);
  }
}
