import { DashboardShell } from '@/components/layout/dashboard-shell'

const clerkConfigured =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'string' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 8

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (clerkConfigured) {
    const { auth } = await import('@clerk/nextjs/server')
    const { redirect } = await import('next/navigation')
    const { userId } = await auth()
    if (!userId) redirect('/sign-in' as never)
  }

  return <DashboardShell>{children}</DashboardShell>
}
