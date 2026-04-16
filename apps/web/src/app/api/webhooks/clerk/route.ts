import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@forge/db'

type ClerkUserData = {
  id: string
  email_addresses: Array<{ email_address: string; id: string }>
  primary_email_address_id: string
  first_name: string | null
  last_name: string | null
  public_metadata: { role?: string }
}

type ClerkWebhookEvent = {
  type: string
  data: ClerkUserData
}

function getEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
}

function getName(data: ClerkUserData): string {
  return [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getRole(metadata: { role?: string }): 'OWNER' | 'MANAGER' | 'WORKER' {
  const r = metadata.role?.toUpperCase()
  if (r === 'OWNER' || r === 'MANAGER' || r === 'WORKER') return r
  return 'WORKER'
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return NextResponse.json({ received: true })
  }

  const { data } = event
  const email = getEmail(data)
  const name = getName(data)
  const role = getRole(data.public_metadata)

  await prisma.user.upsert({
    where: { clerkId: data.id },
    create: { clerkId: data.id, email, name, role },
    update: { email, name, role },
  })

  return NextResponse.json({ received: true })
}
