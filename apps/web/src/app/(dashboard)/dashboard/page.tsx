import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const metadata = {
  title: 'Dashboard — Forge',
}

const clerkConfigured =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'string' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 8

export default async function DashboardPage() {
  let firstName = ''

  if (clerkConfigured) {
    const { currentUser } = await import('@clerk/nextjs/server')
    const user = await currentUser()
    firstName = user?.firstName ?? ''
  }

  return <DashboardClient firstName={firstName} />
}
