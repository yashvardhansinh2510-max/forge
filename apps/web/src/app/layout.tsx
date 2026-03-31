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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {clerkConfigured ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  )
}
