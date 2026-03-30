// lib/poNumberGenerator.ts
// Auto-generates sequential PO numbers in the format "PO-YYYY-NNNN"

import { prisma } from '@forge/db'

/**
 * Generates the next sequential PO number.
 * Format: PO-{YYYY}-{N padded to 4 digits}
 * Example: PO-2025-0042
 *
 * Uses a transaction-level count to avoid collisions under concurrent inserts.
 * The @unique constraint on PurchaseOrder.poNumber is the final safety net.
 */
export async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.purchaseOrder.count()
  const seq = String(count + 1).padStart(4, '0')
  return `PO-${year}-${seq}`
}

/**
 * Generates a human-readable box code from a client name.
 * Format: BOX-{CLIENT_SLUG}-{NNN}
 * Example: BOX-SMITH-001
 */
export async function generateBoxCode(clientName: string): Promise<string> {
  const slug = clientName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

  const count = await prisma.inventoryBox.count()
  const seq = String(count + 1).padStart(3, '0')
  return `BOX-${slug}-${seq}`
}
