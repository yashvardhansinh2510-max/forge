/**
 * Finish Consolidation Script
 *
 * Patches the live DB so every AXOR/Hansgrohe canonical product has:
 *   - variants.finishes[]  fully populated from catalog.json
 *   - human-readable finish names (no parenthetical abbreviations)
 *   - correct swatch hex colors
 *   - sibling (non-canonical) products marked isActive=false
 *
 * Usage:
 *   pnpm exec tsx scripts/consolidate-finishes.ts            # dry-run
 *   pnpm exec tsx scripts/consolidate-finishes.ts --apply    # write to DB
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// ─── Finish name canonical map ────────────────────────────────────────────────
// Normalised display names — removes parenthetical abbreviations,
// maps all Chrome aliases (007, 008, 180, 187 …) to plain "Chrome".

const FINISH_NAME: Record<string, string> = {
  '000': 'Chrome',
  '007': 'Chrome',
  '008': 'Chrome',
  '147': 'Chrome',
  '180': 'Chrome',
  '187': 'Chrome',
  '408': 'Chrome',
  '140': 'Brushed Bronze',
  '670': 'Matt Black',
  '677': 'Matt Black',
  '678': 'Matt Black',
  '700': 'Matt White',
  '708': 'Matt White',
  '340': 'Brushed Black Chrome',
  '347': 'Brushed Black Chrome',
  '990': 'Polished Gold Optic',
  '997': 'Polished Gold Optic',
  '300': 'Polished Red Gold',
  '310': 'Brushed Red Gold',
  '800': 'Steel Optic',
  '330': 'Polished Black Chrome',
  '820': 'Brushed Nickel',
  '250': 'Brushed Gold Optic',
  '950': 'Brushed Brass',
  '600': 'Black / Chrome',
  '450': 'White',
  '400': 'White / Chrome',
  '540': 'Petrol',
  '560': 'Pink',
  '570': 'Petrol (Crocodile)',
  '640': 'Zebra',
  '210': 'Lion',
}

// ─── Finish hex swatches ──────────────────────────────────────────────────────

const FINISH_HEX: Record<string, string> = {
  '000': '#B0B7BC',
  '007': '#B0B7BC',
  '008': '#B0B7BC',
  '147': '#B0B7BC',
  '180': '#B0B7BC',
  '187': '#B0B7BC',
  '408': '#B0B7BC',
  '140': '#8B6747',
  '670': '#1C1C1E',
  '677': '#1C1C1E',
  '678': '#1C1C1E',
  '700': '#F2F2F0',
  '708': '#F2F2F0',
  '340': '#2D2D2D',
  '347': '#2D2D2D',
  '990': '#C4973D',
  '997': '#C4973D',
  '300': '#B5705A',
  '310': '#9B6255',
  '800': '#7B8B98',
  '330': '#1A1A1A',
  '820': '#A0A8B0',
  '250': '#C4A84A',
  '950': '#A07840',
  '600': '#3D3D3D',
  '450': '#FAFAFA',
  '400': '#E8E8E8',
  '540': '#1B8C8C',
  '560': '#E878A8',
  '570': '#1B8C8C',
  '640': '#2A2A2A',
  '210': '#C8A45A',
}

// Finish code display priority (Chrome first, then dark finishes, then light)
const FINISH_SORT_ORDER: Record<string, number> = {
  '000': 0, '007': 0, '008': 0, '147': 0, '180': 0, '187': 0, '408': 0,
  '140': 1,
  '670': 2, '677': 2, '678': 2,
  '340': 3, '347': 3,
  '330': 4,
  '250': 5,
  '300': 6,
  '310': 7,
  '990': 8, '997': 8,
  '820': 9,
  '800': 10,
  '950': 11,
  '600': 12,
  '700': 13, '708': 13,
  '450': 14,
  '400': 15,
}

// MRP premium multipliers for finishes that lack catalog MRP
const FINISH_PREMIUM: Record<string, number> = {
  '140': 1.40,
  '670': 1.35, '677': 1.35, '678': 1.35,
  '700': 1.35, '708': 1.35,
  '340': 1.40, '347': 1.40,
  '990': 1.40, '997': 1.40,
  '300': 1.45,
  '310': 1.45,
  '800': 1.30,
  '330': 1.45,
  '820': 1.30,
  '250': 1.40,
  '950': 1.40,
  '600': 1.30,
  '450': 1.20,
  '400': 1.25,
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogEntry {
  sku: string
  name: string
  brand: string
  mrp: number | null
  finishCode: string | null
  finishName: string | null
  hasImage: boolean
  imageFile: string | null
  sourceFile: string | null
}

interface FinishEntry {
  name: string
  code: string
  sku: string
  color: string
  priceAdj: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function sortOrder(code: string): number {
  return FINISH_SORT_ORDER[code] ?? 99
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎨 Finish Consolidation — ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)

  // Load catalog source
  const catalog: CatalogEntry[] = JSON.parse(
    readFileSync(join(__dirname, '../../../scripts/catalog.json'), 'utf-8'),
  )
  const hgAxorCatalog = catalog.filter((p) => ['AXOR', 'HANSGROHE'].includes(p.brand))
  console.log(`Source catalog: ${hgAxorCatalog.length} AXOR+HG entries`)

  // Group catalog by article family (first 5 digits)
  const families = new Map<string, CatalogEntry[]>()
  for (const p of hgAxorCatalog) {
    const base = p.sku.slice(0, 5)
    const list = families.get(base) ?? []
    list.push(p)
    families.set(base, list)
  }
  console.log(`Article families in catalog: ${families.size}`)

  // Snapshot before state
  const [totalBefore, activeBefore, inactiveBefore] = await Promise.all([
    prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] } } }),
    prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: true } }),
    prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: false } }),
  ])

  // Count before: how many active have multi-finish variants
  const allActiveBefore = await prisma.product.findMany({
    where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: true },
    select: { variants: true },
  })
  let multiFinishBefore = 0, nullVariantsBefore = 0, singleFinishBefore = 0
  for (const p of allActiveBefore) {
    const v = p.variants as any
    const cnt = Array.isArray(v?.finishes) ? (v.finishes as any[]).filter(f => f && f.code).length : 0
    if (cnt === 0) nullVariantsBefore++
    else if (cnt === 1) singleFinishBefore++
    else multiFinishBefore++
  }

  console.log(`\nBEFORE:`)
  console.log(`  Total AXOR+HG products: ${totalBefore} (active: ${activeBefore}, inactive: ${inactiveBefore})`)
  console.log(`  Active with multi-finish: ${multiFinishBefore}`)
  console.log(`  Active with single-finish: ${singleFinishBefore}`)
  console.log(`  Active with null variants: ${nullVariantsBefore}`)

  // Process each article family
  let consolidated = 0
  let skipped = 0
  let nullPatched = 0
  let nameNormalised = 0
  let errors = 0
  const skippedReasons: string[] = []

  const allFamilies = Array.from(families.entries())
  const batches = chunk(allFamilies, 15)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async ([familyBase, siblings]) => {
        // Sort: Chrome (000) first, then by finish code
        siblings.sort((a, b) => {
          const aSort = sortOrder(a.finishCode ?? '99')
          const bSort = sortOrder(b.finishCode ?? '99')
          if (aSort !== bSort) return aSort - bSort
          return (a.finishCode ?? '').localeCompare(b.finishCode ?? '')
        })

        // Elect canonical: prefer Chrome (000), then lowest sort-order, then first with MRP
        const canonical =
          siblings.find((s) => s.finishCode === '000') ??
          siblings.find((s) => FINISH_NAME[s.finishCode ?? ''] === 'Chrome') ??
          siblings.find((s) => s.mrp !== null) ??
          siblings[0]!

        const canonicalMrp = canonical.mrp ?? siblings.find((s) => s.mrp !== null)?.mrp ?? 0
        if (canonicalMrp === 0) {
          skipped++
          skippedReasons.push(`${familyBase}: no MRP`)
          return
        }

        // Build finishes array
        const finishes: FinishEntry[] = siblings.map((s) => {
          let mrp = s.mrp
          if (mrp === null) {
            const mult = FINISH_PREMIUM[s.finishCode ?? ''] ?? 1.38
            mrp = Math.round(canonicalMrp * mult)
          }
          const code = s.finishCode ?? '000'
          return {
            name:     FINISH_NAME[code] ?? s.finishName ?? 'Chrome',
            code,
            sku:      s.sku,
            color:    FINISH_HEX[code] ?? '#B0B7BC',
            priceAdj: Math.round(mrp - canonicalMrp),
          }
        })
        // Sort finishes: Chrome first, then by sort order
        finishes.sort((a, b) => sortOrder(a.code) - sortOrder(b.code))

        // Deduplicate by code (keep first occurrence = Chrome-prefered)
        const seen = new Set<string>()
        const deduped = finishes.filter((f) => {
          const isDupe = seen.has(f.code)
          seen.add(f.code)
          return !isDupe
        })

        // Check if DB canonical exists and needs update
        let dbCanonical = await prisma.product.findUnique({
          where: { sku: canonical.sku },
          select: { id: true, isActive: true, variants: true, finishCode: true, finishName: true },
        })

        if (!dbCanonical) {
          // Canonical not in DB at all — skip (will be handled by seed)
          skipped++
          skippedReasons.push(`${familyBase}: canonical SKU ${canonical.sku} not in DB`)
          return
        }

        const currentVariants = dbCanonical.variants as any
        const currentFinishCount = Array.isArray(currentVariants?.finishes)
          ? (currentVariants.finishes as any[]).filter(f => f && f.code).length
          : 0

        // Determine if update needed
        const needsVariantUpdate = currentFinishCount !== deduped.length || currentFinishCount === 0
        const needsNameNorm = currentFinishCount > 0 &&
          (currentVariants?.finishes as any[] ?? []).some(
            (f: any) => f && f.name && f.name !== FINISH_NAME[f.code ?? ''] && FINISH_NAME[f.code ?? '']
          )

        if (!needsVariantUpdate && !needsNameNorm && dbCanonical.isActive) {
          // Nothing to fix — but still ensure siblings are inactive
          await ensureSiblingsInactive(siblings, canonical.sku)
          skipped++
          return
        }

        if (APPLY) {
          // Update canonical: set variants + isActive=true
          await prisma.product.update({
            where: { sku: canonical.sku },
            data: {
              isActive: true,
              variants: { finishes: deduped },
              finishCode: canonical.finishCode ?? null,
              finishName: FINISH_NAME[canonical.finishCode ?? '000'] ?? 'Chrome',
            },
          })

          // Ensure all siblings are inactive
          await ensureSiblingsInactive(siblings, canonical.sku)
        }

        if (currentFinishCount === 0) nullPatched++
        if (needsNameNorm) nameNormalised++
        consolidated++
      })
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        errors++
        console.error('  ✗ Error:', (result.reason as Error)?.message ?? result.reason)
      }
    }
  }

  // ─── After stats ─────────────────────────────────────────────────────────────

  let multiFinishAfter = 0, nullVariantsAfter = 0, singleFinishAfter = 0
  if (APPLY) {
    const allActiveAfter = await prisma.product.findMany({
      where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: true },
      select: { variants: true },
    })
    for (const p of allActiveAfter) {
      const v = p.variants as any
      const cnt = Array.isArray(v?.finishes) ? (v.finishes as any[]).filter(f => f && f.code).length : 0
      if (cnt === 0) nullVariantsAfter++
      else if (cnt === 1) singleFinishAfter++
      else multiFinishAfter++
    }
  }

  const [totalAfter, activeAfter, inactiveAfter] = APPLY
    ? await Promise.all([
        prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] } } }),
        prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: true } }),
        prisma.product.count({ where: { brand: { in: ['AXOR', 'HANSGROHE'] }, isActive: false } }),
      ])
    : [totalBefore, activeBefore, inactiveBefore]

  // ─── Report ───────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(58)}`)
  console.log(`CONSOLIDATION REPORT — ${APPLY ? 'APPLIED' : 'DRY RUN (pass --apply to write)'}`)
  console.log(`${'─'.repeat(58)}`)

  console.log(`\nFAMILIES PROCESSED:`)
  console.log(`  ✅  Consolidated/updated: ${consolidated}`)
  console.log(`  ↩   Skipped (already OK): ${skipped - errors}`)
  console.log(`  ✗   Errors:               ${errors}`)

  console.log(`\nPATCH BREAKDOWN:`)
  console.log(`  🔧  Null variants patched:   ${nullPatched}`)
  console.log(`  ✏️   Finish names normalised: ${nameNormalised}`)

  console.log(`\nDB STATE — BEFORE:`)
  console.log(`  Total:             ${totalBefore}`)
  console.log(`  Active (canon):    ${activeBefore}`)
  console.log(`  Inactive (sibling):${inactiveBefore}`)
  console.log(`  Multi-finish:      ${multiFinishBefore}`)
  console.log(`  Single-finish:     ${singleFinishBefore}`)
  console.log(`  Null variants:     ${nullVariantsBefore}`)

  if (APPLY) {
    console.log(`\nDB STATE — AFTER:`)
    console.log(`  Total:             ${totalAfter}`)
    console.log(`  Active (canon):    ${activeAfter}`)
    console.log(`  Inactive (sibling):${inactiveAfter}`)
    console.log(`  Multi-finish:      ${multiFinishAfter}`)
    console.log(`  Single-finish:     ${singleFinishAfter}`)
    console.log(`  Null variants:     ${nullVariantsAfter}`)

    const coverage = multiFinishAfter / (activeAfter || 1) * 100
    console.log(`\nFINISH COVERAGE: ${coverage.toFixed(1)}% of canonicals have multi-finish variants`)
  }

  console.log(`\nFINISH NAME MAP (canonical names used):`)
  const displayedNames = new Set(Object.values(FINISH_NAME))
  Array.from(displayedNames).sort().forEach(n => console.log(`  • ${n}`))

  if (skippedReasons.length > 0 && skippedReasons.filter(r => r.includes(':')).length > 0) {
    const realSkips = skippedReasons.filter(r => r.includes('no MRP') || r.includes('not in DB'))
    if (realSkips.length > 0) {
      console.log(`\nSKIPPED (${realSkips.length}):`)
      realSkips.slice(0, 10).forEach(r => console.log('  ', r))
      if (realSkips.length > 10) console.log(`  … and ${realSkips.length - 10} more`)
    }
  }

  console.log(`\n${APPLY ? '✅ Done.' : '⏸  Dry run complete. Pass --apply to write changes.'}`)
}

// Marks all siblings of a family inactive (except the canonical)
async function ensureSiblingsInactive(siblings: CatalogEntry[], canonicalSku: string) {
  const siblingSkus = siblings
    .filter(s => s.sku !== canonicalSku)
    .map(s => s.sku)
  if (siblingSkus.length === 0) return
  await prisma.product.updateMany({
    where: { sku: { in: siblingSkus }, isActive: true },
    data: { isActive: false },
  })
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
