import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

type ProductBrand = 'GROHE' | 'HANSGROHE' | 'AXOR' | 'VITRA' | 'GEBERIT' | 'OTHER'
type ProductCategory = 'SHOWERS' | 'WCS' | 'THERMOSTATS' | 'FAUCETS' | 'BASINS' | 'BATHTUBS' | 'ACCESSORIES' | 'CONCEALED' | 'KITCHEN'
type ContactType = 'ARCHITECT' | 'INTERIOR_DESIGNER' | 'BUILDER' | 'CONTRACTOR' | 'RETAIL' | 'INSTITUTIONAL'
type WarehouseType = 'SHOWROOM' | 'GODOWN' | 'DISPATCH'

interface CatalogEntry {
  sku: string
  name: string
  brand: string
  brandGroup: string
  category: string
  subcategory: string
  section: string
  mrp: number | null
  gstRate: number
  unit: string
  finishCode: string
  finishName: string
  hasImage: boolean
  imageFile: string | null
  articleNumber?: string
  seriesName?: string | null
  sourceFile: string
}

const BRAND_MAP: Record<string, ProductBrand> = {
  HANSGROHE: 'HANSGROHE',
  AXOR: 'AXOR',
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  FAUCETS: 'FAUCETS',
  SHOWERS: 'SHOWERS',
  THERMOSTATS: 'THERMOSTATS',
  ACCESSORIES: 'ACCESSORIES',
  KITCHEN: 'KITCHEN',
  BASINS: 'BASINS',
}

function getTier(brand: string, mrp: number | null): string {
  if (!mrp) return 'PREMIUM'
  if (brand === 'AXOR') return mrp > 100000 ? 'LUXURY' : 'PREMIUM'
  return mrp > 50000 ? 'PREMIUM' : 'MID'
}

const SERIES_PREFIXES = [
  'Vernis Blend', 'Vernis Shape', 'Vernis',
  'Metropol Classic', 'Metropol',
  'Talis E', 'Talis S', 'Talis Select', 'Talis',
  'Rainfinity', 'Raindance Select', 'Raindance',
  'Logis Fine', 'Logis E', 'Logis',
  'Focus E', 'Focus',
  'Finoris', 'Vivenis', 'Rebris',
  'Tecturis E', 'Tecturis S', 'Tecturis',
  'Crometta', 'Croma Select', 'Croma',
  'Ecostat Select', 'Ecostat',
  'ShowerSelect', 'RainSelect',
  'Pulsify Select S', 'Pulsify Select', 'Pulsify S', 'Pulsify',
  'Metris Select', 'Metris',
  'Aquno Select', 'Aquno',
  "Unica'S Puro", "Unica'E Puro", "Unica'S", 'Unica',
  'Starck Organic', 'Starck',
  'Edge',
  'AXOR One', 'ONE',
  'Citterio C', 'Citterio E', 'Citterio M', 'Citterio',
  'Uno Select', 'Uno',
  'Urquiola', 'MyEdition', 'Nendo',
  'DuoTurn E', 'DuoTurn Q', 'DuoTurn S', 'DuoTurn',
  'iBox', 'Porter E', 'Porter', 'Sensoflex', 'Isiflex',
]

function extractSeries(name: string): string | null {
  const stripped = name.replace(/^(HG|AX|AXOR)\s+/i, '').trim()
  const sl = stripped.toLowerCase()
  for (const s of SERIES_PREFIXES) {
    if (sl.startsWith(s.toLowerCase())) return s
  }
  return null
}

// ── Static seed data ──────────────────────────────────────────────────────────

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

interface ContactSeed { name: string; title: string; companyId: string | null; email: string; phone: string; type: ContactType }
const CONTACTS: ContactSeed[] = [
  { name: 'Arjun Mehta', title: 'Principal Architect', companyId: 'co01', email: 'arjun@mehtaarchitects.com', phone: '+91 98200 44512', type: 'ARCHITECT' },
  { name: 'Priya Nair', title: 'Senior Interior Designer', companyId: 'co02', email: 'priya@pninteriors.com', phone: '+91 87654 22001', type: 'INTERIOR_DESIGNER' },
  { name: 'Rajesh Shetty', title: 'Director — Procurement', companyId: 'co03', email: 'rajesh.shetty@rajeshcon.com', phone: '+91 98765 11234', type: 'BUILDER' },
  { name: 'Anita Lobo', title: 'Design Director', companyId: 'co04', email: 'anita@studioanitalobo.com', phone: '+91 90001 34567', type: 'INTERIOR_DESIGNER' },
  { name: 'Kiran Desai', title: 'Site Manager', companyId: 'co05', email: 'kiran.desai@kdbuild.in', phone: '+91 98452 66781', type: 'CONTRACTOR' },
  { name: 'Sameer Kapoor', title: 'VP Projects', companyId: 'co06', email: 'sameer.k@lodha.com', phone: '+91 98190 55678', type: 'BUILDER' },
  { name: 'Deepa Menon', title: 'Architect', companyId: 'co07', email: 'deepa.m@oberoirealty.com', phone: '+91 97690 12345', type: 'ARCHITECT' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Forge database...\n')

  // Load catalog
  const catalogPath = join(__dirname, '../../../scripts/catalog.json')
  const catalog: CatalogEntry[] = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  console.log(`Loaded ${catalog.length} products from catalog.json`)

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

  // ── Products (from catalog.json) ──────────────────────────────────────────
  let success = 0, failed = 0

  const chunks: CatalogEntry[][] = []
  for (let i = 0; i < catalog.length; i += 50) {
    chunks.push(catalog.slice(i, i + 50))
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((p) => {
        const brand: ProductBrand = BRAND_MAP[p.brand] ?? 'HANSGROHE'
        const category: ProductCategory = CATEGORY_MAP[p.category] ?? 'ACCESSORIES'
        const tier = getTier(brand, p.mrp)
        const series = p.seriesName ?? extractSeries(p.name)
        const imageUrl = p.hasImage ? `/products/${p.sku}.png` : null

        return prisma.product.upsert({
          where: { sku: p.sku },
          update: {
            name: p.name,
            brand,
            category,
            subcategory: p.subcategory,
            seriesName: series ?? null,
            sectionName: p.section || null,
            mrp: p.mrp ?? 0,
            gstRate: p.gstRate,
            unit: p.unit,
            tier,
            articleNumber: p.sku,
            finishCode: p.finishCode,
            finishName: p.finishName,
            brandGroup: p.brandGroup,
            imageUrl,
            sourceFile: p.sourceFile,
            isActive: true,
          },
          create: {
            sku: p.sku,
            name: p.name,
            brand,
            category,
            subcategory: p.subcategory,
            seriesName: series ?? null,
            sectionName: p.section || null,
            mrp: p.mrp ?? 0,
            gstRate: p.gstRate,
            unit: p.unit,
            tier,
            articleNumber: p.sku,
            finishCode: p.finishCode,
            finishName: p.finishName,
            brandGroup: p.brandGroup,
            imageUrl,
            sourceFile: p.sourceFile,
            description: null,
            variants: [],
            isActive: true,
          },
        })
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled') success++
      else { failed++; console.error('FAIL:', (r as PromiseRejectedResult).reason) }
    }
  }

  console.log(`\n  Products seeded: ${success}`)
  if (failed > 0) console.log(`  Products failed: ${failed}`)

  // ── Companies ─────────────────────────────────────────────────────────────
  for (const co of COMPANIES) {
    await prisma.company.upsert({ where: { id: co.id }, update: {}, create: { id: co.id, name: co.name, industry: co.industry } })
  }
  console.log(`  Companies: ${COMPANIES.length}`)

  // ── Contacts ──────────────────────────────────────────────────────────────
  let contactCount = 0
  for (const ct of CONTACTS) {
    const existing = await prisma.contact.findFirst({ where: { email: ct.email } })
    if (!existing) {
      await prisma.contact.create({
        data: { name: ct.name, title: ct.title, companyId: ct.companyId, email: ct.email, phone: ct.phone, type: ct.type, tags: [], isActive: true },
      })
      contactCount++
    }
  }
  console.log(`  Contacts: ${contactCount} created`)

  // ── Verification ──────────────────────────────────────────────────────────
  const count = await prisma.product.count()
  const withImages = await prisma.product.count({ where: { imageUrl: { not: null } } })
  const byBrand = await prisma.product.groupBy({ by: ['brand'], _count: true })

  console.log(`\nDB: ${count} products (${withImages} with images)`)
  byBrand.forEach((b) => console.log(`  ${b.brand}: ${b._count}`))
  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
