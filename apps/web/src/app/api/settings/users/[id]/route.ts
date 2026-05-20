import { NextResponse } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  role: z.enum(['owner', 'manager', 'worker']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  return NextResponse.json({ id, role: parsed.data.role })
}
