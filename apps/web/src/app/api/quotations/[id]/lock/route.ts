import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { requirePermission, writeAuditLog } from '@/lib/auth'

// PATCH /api/quotations/[id]/lock
// Locks a QuotationRevision. [id] can be either a revisionId or quotationId.
// If revisionId: locks that revision directly.
// If quotationId: finds the latest DRAFT revision and locks it.
// For IDs not found in the DB at all, returns 404 instead of silently succeeding.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requirePermission('Quotations', 'Edit')
  const { id } = await params

  try {
    // First try: treat [id] as a revisionId
    const revision = await prisma.quotationRevision.update({
      where: { id },
      data: { status: 'LOCKED', isLocked: true, lockedAt: new Date() },
      select: { quotationId: true },
    })
    await writeAuditLog({
      actorId: actor.id,
      action: 'QUOTATION_LOCKED',
      category: 'QUOTATIONS',
      entityType: 'QuotationRevision',
      entityId: id,
      afterSnapshot: { revisionId: id, quotationId: revision.quotationId, status: 'LOCKED' },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code !== 'P2025') {
      const message = e instanceof Error ? e.message : 'Lock failed'
      return NextResponse.json({ message }, { status: 500 })
    }
  }

  // Second try: treat [id] as a quotationId — find latest DRAFT revision
  try {
    const draftRevision = await prisma.quotationRevision.findFirst({
      where: { quotationId: id, status: 'DRAFT' },
      orderBy: { revisionNumber: 'desc' },
      select: { id: true },
    })

    if (!draftRevision) {
      // No DRAFT revision found — 404 so callers know the lock didn't happen
      return NextResponse.json({ message: 'No lockable revision found' }, { status: 404 })
    }

    await prisma.quotationRevision.update({
      where: { id: draftRevision.id },
      data: { status: 'LOCKED', isLocked: true, lockedAt: new Date() },
    })

    await writeAuditLog({
      actorId: actor.id,
      action: 'QUOTATION_LOCKED',
      category: 'QUOTATIONS',
      entityType: 'QuotationRevision',
      entityId: draftRevision.id,
      afterSnapshot: { revisionId: draftRevision.id, quotationId: id, status: 'LOCKED' },
    })

    return NextResponse.json({ success: true, revisionId: draftRevision.id })
  } catch (e2) {
    const message = e2 instanceof Error ? e2.message : 'Lock failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
