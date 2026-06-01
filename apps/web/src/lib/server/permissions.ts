import { prisma } from '@forge/db'
import { auth } from '@clerk/nextjs/server'

/**
 * Ensures the currently authenticated user has the specified permission.
 * Throws an error or returns false depending on how it's used.
 */
export async function requirePermission(module: string, action: string) {
  const { userId: clerkId } = await auth()
  
  if (!clerkId) {
    throw new Error('Unauthorized')
  }

  // Find user by clerkId
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
    throw new Error('User not found in system')
  }

  if (user.status !== 'ACTIVE') {
    throw new Error(`User account is ${user.status}`)
  }

  // Owner bypass (optional, if OWNER always has access, but we seeded OWNER with all permissions anyway)
  if (user.customRole?.name === 'OWNER') {
    return true
  }

  // Check permissions
  const hasPerm = user.customRole?.permissions.some(
    rp => rp.permission.module === module && rp.permission.action === action
  )

  if (!hasPerm) {
    throw new Error(`Forbidden: missing ${module}:${action} permission`)
  }

  return true
}

export async function getUserPermissions(clerkId: string) {
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
  
  if (!user || user.status !== 'ACTIVE') {
    return []
  }
  
  return user.customRole?.permissions.map(rp => ({
    module: rp.permission.module,
    action: rp.permission.action
  })) || []
}
