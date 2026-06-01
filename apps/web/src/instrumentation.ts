export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const required = ['CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SECRET']
    const missing = required.filter((key) => !process.env[key])
    if (missing.length > 0) {
      console.warn(
        `[Forge] WARNING: Missing required env vars: ${missing.join(', ')}. ` +
          'Webhook verification and server-side auth will fail. Run `clerk env pull` and add CLERK_WEBHOOK_SECRET.',
      )
    }
  }
}
