import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@forge/db'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        customRole: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User is not active' }, { status: 403 })
    }

    const permissions = user.customRole?.permissions.map(rp => ({
      module: rp.permission.module,
      action: rp.permission.action
    })) || []

    return NextResponse.json({
      role: user.customRole?.name || user.role,
      permissions
    })
  } catch (error) {
    console.error('[PERMISSIONS_GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
