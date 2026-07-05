import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@fontsource-variable/bricolage-grotesque'
import { ToastProvider } from '@forge/ui'
<<<<<<< HEAD
import { ClerkRoleProvider } from '@/lib/use-role'
=======
import { LocalAuthProvider } from '@/lib/auth/local-auth-provider'
import { clerkConfigured } from '@/lib/auth/config'
>>>>>>> origin/main
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge',
  description: 'The Operating System for Modern Business',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const content = <ToastProvider>{children}</ToastProvider>
  let body: React.ReactNode

  if (clerkConfigured) {
    const { ClerkRootProvider } = await import('@/lib/auth/clerk-root-provider')
    body = <ClerkRootProvider>{content}</ClerkRootProvider>
  } else {
    body = <LocalAuthProvider>{content}</LocalAuthProvider>
  }

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
<<<<<<< HEAD
      <body>
        {clerkConfigured ? (
          <ClerkProvider>
            <ClerkRoleProvider>
              <header className="flex justify-end items-center p-4 gap-4 h-16 border-b">
                <Show when="signed-out">
                  <SignInButton />
                  <SignUpButton>
                    <button className="bg-purple-700 text-white rounded-full font-medium text-sm h-10 px-5 cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </header>
              {content}
            </ClerkRoleProvider>
          </ClerkProvider>
        ) : content}
      </body>
=======
      <body>{body}</body>
>>>>>>> origin/main
    </html>
  )
}
