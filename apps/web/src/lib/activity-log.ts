import type { ActivityType } from '@forge/db'
import { prisma } from '@forge/db'

export interface ActivityLogInput {
  type?: ActivityType
  description: string
  userId?: string | null
  contactId?: string | null
  companyId?: string | null
  projectId?: string | null
  quotationId?: string | null
  value?: number | null
}

export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: input.type ?? 'NOTE',
        description: input.description,
        userId: input.userId ?? null,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        projectId: input.projectId ?? null,
        quotationId: input.quotationId ?? null,
        value: input.value ?? null,
      },
    })
  } catch (error) {
    console.error('[ActivityLog] Failed to create activity', error)
  }
}
