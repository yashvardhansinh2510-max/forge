import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'

// PATCH /api/quotations/[id]/lock
// Locks a QuotationRevision (sets status=LOCKED, isLocked=true).
// For mock quotation IDs not in the DB, returns { success: true } silently — no-op.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    await prisma.quotationRevision.update({
      where: { id },
      data: { status: 'LOCKED', isLocked: true, lockedAt: new Date() },
    })
  } catch (e) {
    const code = (e as { code?: string })?.code
    // P2025 = record not found — mock quotation ID, treat as no-op
    if (code !== 'P2025') {
      const message = e instanceof Error ? e.message : 'Lock failed'
      return NextResponse.json({ message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
