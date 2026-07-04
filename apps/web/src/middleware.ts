import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { clerkConfigured } from '@/lib/auth/config'

const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

const clerkAuthMiddleware = clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth.protect()
})

export default clerkConfigured
  ? clerkAuthMiddleware
  : function localAuthMiddleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
