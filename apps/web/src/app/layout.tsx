import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@fontsource-variable/bricolage-grotesque'
import { ToastProvider } from '@forge/ui'
import { LocalAuthProvider } from '@/lib/auth/local-auth-provider'
import { clerkConfigured } from '@/lib/auth/config'
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
      <body>{body}</body>
    </html>
  )
}
