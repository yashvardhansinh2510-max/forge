import { redirect } from 'next/navigation'
import { clerkConfigured } from '@/lib/auth/config'

export default async function SignUpPage() {
  if (!clerkConfigured) redirect('/dashboard' as never)

  const { ClerkSignUp } = await import('@/lib/auth/clerk-sign-up')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--surface-ground]">
      <ClerkSignUp />
    </div>
  )
}
