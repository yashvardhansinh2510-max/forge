import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Finding all users...')
  const users = await prisma.user.findMany()
  console.log('Current users:', users)

  console.log('Updating all users to OWNER role and ACTIVE status...')
  const result = await prisma.user.updateMany({
    data: {
      role: 'OWNER',
      status: 'ACTIVE',
    },
  })
  console.log('Update result:', result)

  // Find or create Owner role in customRole if needed
  let ownerRole = await prisma.role.findFirst({
    where: { name: 'OWNER' }
  })
  if (!ownerRole) {
    console.log('Creating OWNER custom role...')
    ownerRole = await prisma.role.create({
      data: {
        name: 'OWNER',
        description: 'System Owner with all permissions',
        isSystem: true,
      }
    })
  }

  // Link all users to the custom OWNER role
  console.log('Linking users to OWNER custom role...')
  const updateRoleResult = await prisma.user.updateMany({
    data: {
      roleId: ownerRole.id
    }
  })
  console.log('Role link result:', updateRoleResult)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
