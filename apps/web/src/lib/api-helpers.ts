// lib/api-helpers.ts — Shared utilities for Next.js API route handlers

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError } from '@/lib/errors'

/** Wraps a route handler and normalises errors into JSON responses. */
export async function withErrorHandling(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.code, message: err.message, details: err.details },
        { status: err.statusCode },
      )
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid request body', details: err.flatten() },
        { status: 422 },
      )
    }
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}

/** Returns a fallback user ID when Clerk is not configured (dev / mock mode). */
export function getDevUserId(): string {
  return 'dev-user-001'
}
