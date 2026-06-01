import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// Standard permissions grouped by module/domain
const PERMISSIONS = [
  // Settings & Users (Group: Settings)
  { module: 'Settings', action: 'View', group: 'Settings' },
  { module: 'Users', action: 'Invite', group: 'Settings' },
  { module: 'Users', action: 'Disable', group: 'Settings' },
  { module: 'Users', action: 'ChangeRole', group: 'Settings' },
  { module: 'Permissions', action: 'Manage', group: 'Settings' },
  
  // Dashboard
  { module: 'Dashboard', action: 'View', group: 'General' },

  // POS
  { module: 'POS', action: 'View', group: 'Sales' },
  { module: 'POS', action: 'Create', group: 'Sales' },

  // Quotations & Follow-Ups
  { module: 'Quotations', action: 'View', group: 'Sales' },
  { module: 'Quotations', action: 'Create', group: 'Sales' },
  { module: 'Quotations', action: 'Edit', group: 'Sales' },
  { module: 'Quotations', action: 'Delete', group: 'Sales' },
  { module: 'Quotations', action: 'Approve', group: 'Sales' },
  { module: 'FollowUps', action: 'View', group: 'Sales' },
  { module: 'FollowUps', action: 'Edit', group: 'Sales' },

  // Purchases & Inventory
  { module: 'Purchases', action: 'View', group: 'Procurement' },
  { module: 'Purchases', action: 'Create', group: 'Procurement' },
  { module: 'Purchases', action: 'Edit', group: 'Procurement' },
  { module: 'Inventory', action: 'MoveStage', group: 'Warehouse' },
  { module: 'Inventory', action: 'Transfer', group: 'Warehouse' },
  { module: 'Inventory', action: 'Dispatch', group: 'Warehouse' },

  // Finance & Payments
  { module: 'Payments', action: 'View', group: 'Finance' },
  { module: 'Payments', action: 'Record', group: 'Finance' },
  { module: 'Payments', action: 'Approve', group: 'Finance' },
  { module: 'Billing', action: 'Manage', group: 'Finance' },

  // Global Actions
  { module: 'Data', action: 'Export', group: 'General' },
]

const ROLE_PERMISSIONS = {
  OWNER: 'ALL', // Special case
  MANAGER: [
    'Settings:View', 'Dashboard:View', 
    'POS:View', 'POS:Create', 
    'Quotations:View', 'Quotations:Create', 'Quotations:Edit', 'Quotations:Approve', 'FollowUps:View', 'FollowUps:Edit',
    'Purchases:View', 'Purchases:Create', 'Purchases:Edit', 
    'Inventory:MoveStage', 'Inventory:Transfer', 'Inventory:Dispatch',
    'Payments:View', 'Payments:Record', 'Payments:Approve', 'Billing:Manage',
    'Data:Export'
  ],
  SALES: [
    'Dashboard:View', 'POS:View', 'POS:Create', 
    'Quotations:View', 'Quotations:Create', 'Quotations:Edit',
    'FollowUps:View', 'FollowUps:Edit'
  ],
  PROCUREMENT: [
    'Dashboard:View', 'Purchases:View', 'Purchases:Create', 'Purchases:Edit',
    'Inventory:MoveStage'
  ],
  ACCOUNTS: [
    'Dashboard:View', 'Payments:View', 'Payments:Record', 'Payments:Approve', 'Billing:Manage'
  ],
  WAREHOUSE: [
    'Inventory:MoveStage', 'Inventory:Transfer', 'Inventory:Dispatch'
  ],
  VIEWER: [
    'Dashboard:View'
  ]
}

async function main() {
  console.log('Seeding permissions engine...')

  // 1. Create Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: perm.module,
          action: perm.action,
        },
      },
      update: { group: perm.group },
      create: {
        module: perm.module,
        action: perm.action,
        group: perm.group,
        description: `Allows ${perm.action} on ${perm.module}`,
      },
    })
  }

  const allPermissions = await prisma.permission.findMany()

  // 2. Create Roles and Map Permissions
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true },
      create: { name: roleName, isSystem: true, description: `System default ${roleName} role` },
    })

    // Map permissions
    const permsToAssign = ROLE_PERMISSIONS[roleName as keyof typeof ROLE_PERMISSIONS]
    if (permsToAssign === 'ALL') {
      for (const p of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: p.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: p.id,
          },
        })
      }
    } else {
      for (const pStr of (permsToAssign as string[])) {
        const [module, action] = pStr.split(':')
        const p = allPermissions.find((x) => x.module === module && x.action === action)
        if (p) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: p.id,
            },
          })
        }
      }
    }
  }

  // 3. Map legacy WORKER to VIEWER enum and assign Role relation for all users
  const viewerRole = await prisma.role.findUnique({ where: { name: 'VIEWER' } })
  
  if (viewerRole) {
    await prisma.user.updateMany({
      where: { role: 'WORKER' as UserRole },
      data: { role: 'VIEWER' as UserRole },
    })
  }

  // Also populate roleId for everyone based on their enum
  const allRoles = await prisma.role.findMany()
  for (const userRoleEnum of Object.values(UserRole)) {
    const matchingRole = allRoles.find((r) => r.name === userRoleEnum)
    if (matchingRole) {
      await prisma.user.updateMany({
        where: { role: userRoleEnum },
        data: { roleId: matchingRole.id },
      })
    }
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
