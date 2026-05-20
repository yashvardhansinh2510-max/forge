import { NextResponse } from 'next/server'

export async function GET() {
  // No DB connected yet — return empty list
  return NextResponse.json([])
}
