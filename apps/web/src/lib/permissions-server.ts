import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { type AppRole, type Permission, hasPermission, normalizeRole } from './permissions'

export type RouteHandler = (req: Request, ctx: any) => Promise<NextResponse>

/** Get the current user's role from session claims in an API route. */
export async function getCurrentRole(): Promise<AppRole> {
  const { sessionClaims } = await auth()
  const rawRole = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  return normalizeRole(rawRole)
}

export function withRole(allowedRoles: AppRole[], handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const role = await getCurrentRole()
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req, ctx)
  }
}

export function withPermission(perm: Permission, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const role = await getCurrentRole()
    if (!hasPermission(role, perm)) {
      return NextResponse.json({ error: 'Forbidden', required: perm }, { status: 403 })
    }
    return handler(req, ctx)
  }
}
