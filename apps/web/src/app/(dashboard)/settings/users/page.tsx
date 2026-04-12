import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsUsersClient } from './settings-users-client'

export default async function SettingsUsersPage() {
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  if (role !== 'owner') {
    redirect('/dashboard')
  }

  return <SettingsUsersClient />
}
