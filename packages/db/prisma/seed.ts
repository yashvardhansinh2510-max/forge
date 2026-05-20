import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductBrand = 'GROHE' | 'HANSGROHE' | 'AXOR' | 'VITRA' | 'GEBERIT' | 'OTHER'
type ProductCategory = 'SHOWERS' | 'WCS' | 'THERMOSTATS' | 'FAUCETS' | 'BASINS' | 'BATHTUBS' | 'ACCESSORIES' | 'CONCEALED' | 'KITCHEN'
type ContactType = 'ARCHITECT' | 'INTERIOR_DESIGNER' | 'BUILDER' | 'CONTRACTOR' | 'RETAIL' | 'INSTITUTIONAL'
type WarehouseType = 'SHOWROOM' | 'GODOWN' | 'DISPATCH'

interface CatalogProduct {
  sku: string
  name: string
  brand: string
  brandGroup: string
  category: string
  subcategory: string
  section: string | null
  mrp: number | null
  gstRate: number
  unit: string
  finishCode: string | null
  finishName: string | null
  hasImage: boolean
  imageFile: string | null
  sourceFile: string | null
}

// ─── Brand / Category maps ────────────────────────────────────────────────────

const BRAND_MAP: Record<string, ProductBrand> = {
  HANSGROHE: 'HANSGROHE',
  AXOR: 'AXOR',
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  FAUCETS: 'FAUCETS',
  SHOWERS: 'SHOWERS',
  THERMOSTATS: 'THERMOSTATS',
  ACCESSORIES: 'ACCESSORIES',
  BASINS: 'BASINS',
  KITCHEN: 'KITCHEN',
  WCS: 'WCS',
}

// ─── Series extractor ─────────────────────────────────────────────────────────

const SERIES_PATTERNS: Array<[RegExp, string]> = [
  [/^HG Vernis Blend\b/i, 'Vernis Blend'],
  [/^HG Vernis Shape\b/i, 'Vernis Shape'],
  [/^HG Talis Select\b/i, 'Talis Select'],
  [/^HG Talis E\b/i, 'Talis E'],
  [/^HG Talis S\b/i, 'Talis S'],
  [/^HG Tecturis E\b/i, 'Tecturis E'],
  [/^HG Tecturis S\b/i, 'Tecturis S'],
  [/^HG Croma\b/i, 'Croma'],
  [/^HG Crometta\b/i, 'Crometta'],
  [/^HG Ecostat\b/i, 'Ecostat'],
  [/^HG ShowerSelect\b/i, 'ShowerSelect'],
  [/^HG RainSelect\b/i, 'RainSelect'],
  [/^HG Rainfinity\b/i, 'Rainfinity'],
  [/^HG Raindance\b/i, 'Raindance'],
  [/^HG Metropol\b/i, 'Metropol'],
  [/^HG Pulsify\b/i, 'Pulsify'],
  [/^HG Finoris\b/i, 'Finoris'],
  [/^HG Vivenis\b/i, 'Vivenis'],
  [/^HG Aquno\b/i, 'Aquno'],
  [/^HG Metris\b/i, 'Metris'],
  [/^HG Logis\b/i, 'Logis'],
  [/^HG Focus\b/i, 'Focus'],
  [/^AX Citterio E\b/i, 'Citterio E'],
  [/^AX Citterio M\b/i, 'Citterio M'],
  [/^AXOR Citterio C\b/i, 'Citterio C'],
  [/^AX MyEdition\b/i, 'MyEdition'],
  [/^AX ShowerHeaven\b/i, 'ShowerHeaven'],
  [/^AX Starck\b/i, 'Starck'],
  [/^AX Edge\b/i, 'Edge'],
  [/^AX ONE\b/i, 'ONE'],
  [/^AX Urquiola\b/i, 'Urquiola'],
  [/^AX Nendo\b/i, 'Nendo'],
  [/^AX Uno\b/i, 'Uno'],
]

function extractSeries(name: string): string | null {
  for (const [pattern, series] of SERIES_PATTERNS) {
    if (pattern.test(name)) return series
  }
  // Default: second word after HG/AX prefix
  const match = name.match(/^(?:HG|AX|AXOR)\s+(\S+)/)
  return match ? match[1] : null
}

// ─── Tier logic ───────────────────────────────────────────────────────────────

function assignTier(brand: ProductBrand, mrp: number): string {
  if (brand === 'AXOR') return mrp > 100_000 ? 'luxury' : 'premium'
  if (brand === 'HANSGROHE') return mrp > 50_000 ? 'premium' : 'mid'
  return 'premium'
}

// ─── Chunk helper ─────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// ─── Static seed data ─────────────────────────────────────────────────────────

interface CompanySeed { id: string; name: string; industry: string }
const COMPANIES: CompanySeed[] = [
  { id: 'co01', name: 'Mehta Architects & Associates', industry: 'Architecture' },
  { id: 'co02', name: 'Priya Nair Interiors', industry: 'Interior Design' },
  { id: 'co03', name: 'Rajesh Constructions Pvt Ltd', industry: 'Real Estate & Construction' },
  { id: 'co04', name: 'Studio Anita Lobo', industry: 'Interior Design' },
  { id: 'co05', name: 'KD Building Works', industry: 'Construction' },
  { id: 'co06', name: 'Lodha Group', industry: 'Real Estate' },
  { id: 'co07', name: 'Oberoi Realty', industry: 'Real Estate' },
]

interface ContactSeed { name: string; role: string; companyId: string | null; email: string; phone: string; type: ContactType }
const CONTACTS: ContactSeed[] = [
  { name: 'Arjun Mehta', role: 'Principal Architect', companyId: 'co01', email: 'arjun@mehtaarchitects.com', phone: '+91 98200 44512', type: 'ARCHITECT' },
  { name: 'Priya Nair', role: 'Senior Interior Designer', companyId: 'co02', email: 'priya@pninteriors.com', phone: '+91 87654 22001', type: 'INTERIOR_DESIGNER' },
  { name: 'Rajesh Shetty', role: 'Director — Procurement', companyId: 'co03', email: 'rajesh.shetty@rajeshcon.com', phone: '+91 98765 11234', type: 'BUILDER' },
  { name: 'Anita Lobo', role: 'Design Director', companyId: 'co04', email: 'anita@studioanitalobo.com', phone: '+91 90001 34567', type: 'INTERIOR_DESIGNER' },
  { name: 'Kiran Desai', role: 'Site Manager', companyId: 'co05', email: 'kiran.desai@kdbuild.in', phone: '+91 98452 66781', type: 'CONTRACTOR' },
  { name: 'Sameer Kapoor', role: 'VP Projects', companyId: 'co06', email: 'sameer.k@lodha.com', phone: '+91 98190 55678', type: 'BUILDER' },
  { name: 'Deepa Menon', role: 'Architect', companyId: 'co07', email: 'deepa.m@oberoirealty.com', phone: '+91 97690 12345', type: 'ARCHITECT' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Forge database...\n')

  // ── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'admin@buildconhouse.com' },
    update: {},
    create: {
      id: 'dev-user-001',
      name: 'Buildcon Admin',
      email: 'admin@buildconhouse.com',
      clerkId: 'dev_user',
      role: 'OWNER',
      maxDiscountPct: 30,
    },
  })
  console.log(`  User: ${user.name}`)

  // ── Warehouses ────────────────────────────────────────────────────────────
  const warehouseData = [
    { id: 'wh_showroom', name: 'Showroom & Experience Centre', shortName: 'Showroom', type: 'SHOWROOM' as WarehouseType, address: 'Plot 12, MIDC Road, Andheri East, Mumbai 400093', city: 'Mumbai', state: 'Maharashtra', managerName: 'Suresh Iyer' },
    { id: 'wh_godown', name: 'Main Godown — Bhiwandi', shortName: 'Bhiwandi', type: 'GODOWN' as WarehouseType, address: 'Shed 7-B, Transport Nagar, Bhiwandi, Thane 421302', city: 'Bhiwandi', state: 'Maharashtra', managerName: 'Ramesh Pawar' },
    { id: 'wh_dispatch', name: 'Dispatch Hub — Navi Mumbai', shortName: 'Navi Mumbai', type: 'DISPATCH' as WarehouseType, address: 'Unit 4, TTC Industrial Area, Mahape, Navi Mumbai 400710', city: 'Navi Mumbai', state: 'Maharashtra', managerName: 'Deepa Kulkarni' },
  ]
  for (const wh of warehouseData) {
    await prisma.warehouse.upsert({ where: { id: wh.id }, update: {}, create: wh })
  }
  console.log(`  Warehouses: ${warehouseData.length}`)

  // ── Products from catalog.json ────────────────────────────────────────────
  const catalog: CatalogProduct[] = JSON.parse(
    readFileSync(join(__dirname, '../../../scripts/catalog.json'), 'utf-8')
  )

  let successCount = 0
  let failCount = 0
  let noMrpCount = 0

  const eligible = catalog.filter((p) => {
    if (p.mrp === null || p.mrp === undefined) {
      noMrpCount++
      return false
    }
    return true
  })

  const batches = chunk(eligible, 50)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map((p) => {
        const brand = BRAND_MAP[p.brand] ?? 'OTHER'
        const category = CATEGORY_MAP[p.category] ?? 'ACCESSORIES'
        const mrp = p.mrp as number
        const tier = assignTier(brand as ProductBrand, mrp)
        const imageUrl = p.hasImage ? `/products/${p.sku}.png` : null
        const seriesName = extractSeries(p.name)

        const data = {
          brand,
          category,
          name: p.name,
          mrp,
          gstRate: p.gstRate,
          unit: p.unit,
          imageUrl,
          tier,
          isActive: true,
          stockAvailable: 0,
          stockOnOrder: 0,
          stockCommitted: 0,
          finishCode: p.finishCode ?? null,
          finishName: p.finishName ?? null,
          seriesName,
          subcategory: p.subcategory ?? null,
          sectionName: p.section ?? null,
          brandGroup: p.brandGroup ?? p.brand,
          sourceFile: p.sourceFile ?? null,
        }

        return prisma.product.upsert({
          where: { sku: p.sku },
          update: data,
          create: { sku: p.sku, ...data },
        })
      })
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        successCount++
      } else {
        failCount++
        console.error(`  ✗ Failed SKU ${batch[i].sku}: ${result.reason?.message ?? result.reason}`)
      }
    }
  }

  console.log(`\n  Seeded:  ${successCount} products`)
  console.log(`  Failed:  ${failCount} products`)
  console.log(`  Skipped (no MRP): ${noMrpCount} products`)

  // ── Companies ─────────────────────────────────────────────────────────────
  for (const co of COMPANIES) {
    await prisma.company.upsert({ where: { id: co.id }, update: {}, create: { id: co.id, name: co.name, industry: co.industry } })
  }
  console.log(`\n  Companies: ${COMPANIES.length}`)

  // ── Contacts ──────────────────────────────────────────────────────────────
  let contactCount = 0
  for (const ct of CONTACTS) {
    const existing = await prisma.contact.findFirst({ where: { email: ct.email } })
    if (!existing) {
      await prisma.contact.create({
        data: { name: ct.name, role: ct.role, companyId: ct.companyId, email: ct.email, phone: ct.phone, type: ct.type, tags: [], isActive: true },
      })
      contactCount++
    }
  }
  console.log(`  Contacts: ${contactCount} created`)

  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
