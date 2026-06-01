// POST /api/webhooks/clerk — syncs Clerk user events to the DB
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { prisma } from '@forge/db'
import { writeAuditLog } from '@/lib/auth'

type ClerkEmailAddress = { email_address: string; id: string }

type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    email_addresses: ClerkEmailAddress[]
    public_metadata: { role?: string }
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(webhookSecret)

  let evt: ClerkUserEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  const { type, data } = evt
  const email = data.email_addresses[0]?.email_address ?? ''
  const name =
    [data.first_name, data.last_name].filter(Boolean).join(' ') || email

  if (type === 'user.created') {
    const user = await prisma.user.upsert({
      where: { clerkId: data.id },
      create: { clerkId: data.id, email, name, role: 'WORKER' },
      update: { email, name },
    })
    await writeAuditLog({
      actorId: user.id,
      action: 'user_created',
      category: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      afterSnapshot: { email, name },
    })
  }

  if (type === 'user.updated') {
    const roleFromMeta = data.public_metadata?.role?.toUpperCase()
    const validRole = ['OWNER', 'MANAGER', 'WORKER'].includes(roleFromMeta ?? '')
      ? (roleFromMeta as 'OWNER' | 'MANAGER' | 'WORKER')
      : undefined

    const user = await prisma.user.upsert({
      where: { clerkId: data.id },
      update: { email, name, ...(validRole ? { role: validRole } : {}) },
      create: { clerkId: data.id, email, name, role: validRole ?? 'WORKER' },
    })
    await writeAuditLog({
      actorId: user.id,
      action: 'user_updated',
      category: 'AUTH',
      entityType: 'User',
      entityId: user.id,
      afterSnapshot: { email, name, role: user.role },
    })
  }

  if (type === 'user.deleted') {
    await prisma.user.updateMany({
      where: { clerkId: data.id },
      data: { isActive: false },
    })
  }

  return new Response('OK', { status: 200 })
}
