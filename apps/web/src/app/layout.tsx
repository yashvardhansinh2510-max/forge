import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@fontsource-variable/bricolage-grotesque'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@forge/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge',
  description: 'The Operating System for Modern Business',
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkConfigured = clerkKey.length > 8

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const content = <ToastProvider>{children}</ToastProvider>
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {clerkConfigured ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  )
}
