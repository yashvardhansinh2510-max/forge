import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { requirePermission } from '@/lib/server/permissions'

export async function GET() {
  try {
    await requirePermission('Settings', 'View')
    
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('[ROLES_GET]', error)
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('Permissions', 'Manage')
    
    const { name, description } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }
    
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description,
        isSystem: false
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'role_created',
        target: role.id,
        metadata: { roleName: role.name }
      }
    })
    
    return NextResponse.json(role)
  } catch (error: any) {
    console.error('[ROLES_POST]', error)
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}
