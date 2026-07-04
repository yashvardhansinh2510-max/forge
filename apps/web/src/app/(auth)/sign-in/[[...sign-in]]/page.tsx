import { redirect } from 'next/navigation'
import { clerkConfigured } from '@/lib/auth/config'

export default async function SignInPage() {
  if (!clerkConfigured) redirect('/dashboard' as never)

  const { ClerkSignIn } = await import('@/lib/auth/clerk-sign-in')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--surface-ground]">
      <ClerkSignIn />
    </div>
  )
}
