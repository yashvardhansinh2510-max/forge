import { clerkMiddleware } from '@clerk/nextjs/server'

// clerkMiddleware() must run for auth() / currentUser() to work in API routes.
// Public routes are accessible without a session; protected routes redirect to sign-in.
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
