import { PrismaClient } from '@forge/db'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting AuditLog migration...')

  // Get all legacy logs
  const logs = await prisma.auditLog.findMany({
    where: {
      category: 'LEGACY',
    },
  })

  console.log(`Found ${logs.length} legacy logs to migrate.`)

  let migrated = 0
  let failed = 0

  for (const log of logs) {
    try {
      let entityType = 'LEGACY'
      let category = 'LEGACY'

      // Infer entityType from action string or target
      if (log.action.includes('user') || log.action.includes('role') || log.action.includes('permission') || log.action === 'login') {
        entityType = 'User'
        category = 'AUTH'
      } else if (log.action.includes('quotation')) {
        entityType = 'Quotation'
        category = 'QUOTATIONS'
      } else if (log.action.includes('payment')) {
        entityType = 'Payment'
        category = 'PAYMENTS'
      } else if (log.action.includes('purchase') || log.action.includes('po')) {
        entityType = 'PurchaseOrder'
        category = 'PURCHASES'
      } else if (log.action.includes('follow')) {
        entityType = 'FollowUp'
        category = 'FOLLOWUPS'
      } else if (log.action.includes('project')) {
        entityType = 'Project'
        category = 'PROJECTS'
      }

      await prisma.auditLog.update({
        where: { id: log.id },
        data: {
          category,
          entityType,
          entityId: log.target,
          afterSnapshot: log.metadata,
        },
      })
      migrated++
    } catch (e) {
      console.error(`Failed to migrate log ${log.id}`, e)
      failed++
    }
  }

  console.log(`Migration complete. Migrated: ${migrated}, Failed: ${failed}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
