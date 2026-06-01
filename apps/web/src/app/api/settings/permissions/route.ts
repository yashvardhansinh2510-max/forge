import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { requirePermission } from '@/lib/server/permissions'

export async function GET() {
  try {
    await requirePermission('Settings', 'View')
    
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { group: 'asc' },
        { module: 'asc' },
        { action: 'asc' }
      ]
    })

    const rolePermissions = await prisma.rolePermission.findMany()
    
    return NextResponse.json({ permissions, rolePermissions })
  } catch (error: any) {
    console.error('[PERMISSIONS_GET]', error)
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function PUT(req: Request) {
  try {
    await requirePermission('Permissions', 'Manage')
    
    const { roleId, permissionIds } = await req.json()
    
    if (!roleId || !Array.isArray(permissionIds)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    
    if (role.name === 'OWNER') {
      return NextResponse.json({ error: 'Cannot modify OWNER role permissions' }, { status: 400 })
    }
    
    // Delete existing
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    })
    
    // Insert new
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((pid: string) => ({
          roleId,
          permissionId: pid
        }))
      })
    }
    
    await prisma.auditLog.create({
      data: {
        action: 'permission_changed',
        target: role.id,
        metadata: { roleName: role.name, permissionCount: permissionIds.length }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[PERMISSIONS_PUT]', error)
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}
