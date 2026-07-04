import { redirect } from 'next/navigation'
import { clerkConfigured } from '@/lib/auth/config'
import { SettingsUsersClient } from './settings-users-client'

export default async function SettingsUsersPage() {
  if (!clerkConfigured) return <SettingsUsersClient />

  const { auth } = await import('@clerk/nextjs/server')
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (role !== 'owner') {
    redirect('/dashboard')
  }

  return <SettingsUsersClient />
}
