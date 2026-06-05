import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductBrand    = 'GROHE' | 'HANSGROHE' | 'AXOR' | 'VITRA' | 'GEBERIT' | 'OTHER'
type ProductCategory = 'SHOWERS' | 'WCS' | 'THERMOSTATS' | 'FAUCETS' | 'BASINS' | 'BATHTUBS' | 'ACCESSORIES' | 'CONCEALED' | 'KITCHEN'
type ContactType     = 'ARCHITECT' | 'INTERIOR_DESIGNER' | 'BUILDER' | 'CONTRACTOR' | 'RETAIL' | 'INSTITUTIONAL'
type WarehouseType   = 'SHOWROOM' | 'GODOWN' | 'DISPATCH'

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
  AXOR:      'AXOR',
}

const CATEGORY_MAP: Record<string, ProductCategory> = {
  FAUCETS:     'FAUCETS',
  SHOWERS:     'SHOWERS',
  THERMOSTATS: 'THERMOSTATS',
  ACCESSORIES: 'ACCESSORIES',
  BASINS:      'BASINS',
  KITCHEN:     'KITCHEN',
  WCS:         'WCS',
}

// ─── Finish hex swatches ──────────────────────────────────────────────────────

const FINISH_HEX: Record<string, string> = {
  '000': '#B0B7BC',  // Chrome
  '007': '#B0B7BC',  // Chrome
  '008': '#B0B7BC',  // Chrome
  '147': '#B0B7BC',  // Chrome variant
  '180': '#B0B7BC',  // Chrome (Basic Set)
  '187': '#B0B7BC',  // Chrome (Basic Set)
  '408': '#B0B7BC',  // Chrome variant
  '708': '#F2F2F0',  // Matt White variant → keep as white
  '140': '#8B6747',  // Brushed Bronze (BBR)
  '670': '#1C1C1E',  // Matt Black
  '677': '#1C1C1E',  // Matt Black
  '678': '#1C1C1E',  // Matt Black
  '700': '#F2F2F0',  // Matt White
  '340': '#2D2D2D',  // Brushed Black Chrome (BBC)
  '347': '#2D2D2D',  // BBC variant
  '990': '#C4973D',  // Polished Gold Optic (PGO)
  '997': '#C4973D',  // PGO variant
  '450': '#FAFAFA',  // White
  '400': '#E8E8E8',  // White/Chrome
  '300': '#B5705A',  // Polished Red Gold (PRG)
  '310': '#9B6255',  // Brushed Red Gold (BRG)
  '800': '#7B8B98',  // Steel Optic
  '330': '#1A1A1A',  // Polished Black Chrome (PBC)
  '820': '#A0A8B0',  // Brushed Nickel (BN)
  '250': '#C4973D',  // Brushed Gold Optic (BGO)
  '950': '#2A2A2A',  // Brushed Black
  '600': '#3D3D3D',  // Black/Chrome
  '570': '#1B8C8C',  // Petrol
  '540': '#1B8C8C',  // Petrol
  '640': '#2A2A2A',  // Zebra
  '210': '#C8A45A',  // Lion
  '560': '#E878A8',  // Pink
}

// MRP premium multiplier for finishes that lack MRP in catalog
const FINISH_PREMIUM: Record<string, number> = {
  '140': 1.40, // BBR
  '670': 1.35, // Matt Black
  '677': 1.35,
  '678': 1.35,
  '700': 1.35, // Matt White
  '708': 1.35,
  '340': 1.40, // BBC
  '347': 1.40,
  '990': 1.40, // PGO
  '997': 1.40,
  '300': 1.45, // PRG
  '310': 1.45, // BRG
  '800': 1.30, // Steel Optic
  '330': 1.45, // PBC
  '820': 1.30, // BN
  '250': 1.40, // BGO
  '950': 1.40,
  '600': 1.30,
  '450': 1.20, // White
  '400': 1.25, // White/Chrome
}

// ─── Series extractor ─────────────────────────────────────────────────────────

const SERIES_PATTERNS: Array<[RegExp, string]> = [
  // AXOR — explicit brand prefix first
  [/^(?:AX|AXOR)\s+AXOR One\b/i,         'ONE'],
  [/^(?:AX|AXOR)\s+AXOR Citterio\b/i,    'Citterio'],
  [/^AXOR Citterio C\b/i,                 'Citterio C'],
  [/^AXOR Citterio E\b/i,                 'Citterio E'],
  [/^AXOR Citterio M\b/i,                 'Citterio M'],
  [/^AXOR Starck Classic\b/i,             'Starck Classic'],
  [/^AXOR Starck\b/i,                     'Starck'],
  [/^AX Citterio C\b/i,                   'Citterio C'],
  [/^AX Citterio E\b/i,                   'Citterio E'],
  [/^AX Citterio M\b/i,                   'Citterio M'],
  [/^AX Citterio\b/i,                     'Citterio'],
  [/^AX MyEdition\b/i,                    'MyEdition'],
  [/^AX ShowerHeaven\b/i,                 'ShowerHeaven'],
  [/^AX Starck\b/i,                       'Starck'],
  [/^AX Edge\b/i,                         'Edge'],
  [/^AX ONE\b/i,                          'ONE'],
  [/^AX Urquiola\b/i,                     'Urquiola'],
  [/^AX Nendo\b/i,                        'Nendo'],
  [/^AX Uno\b/i,                          'Uno'],
  [/^AX Massaud\b/i,                      'Massaud'],
  [/^AX Montreux\b/i,                     'Montreux'],
  [/^AX ShowerSelect\b/i,                 'ShowerSelect'],
  [/^AX iBox\b/i,                         'iBox Universal'],
  // HANSGROHE
  [/^HG Vernis Blend\b/i,                 'Vernis Blend'],
  [/^HG Vernis Shape\b/i,                 'Vernis Shape'],
  [/^HG Talis Select\b/i,                 'Talis Select'],
  [/^HG Talis E\b/i,                      'Talis E'],
  [/^HG Talis S\b/i,                      'Talis S'],
  [/^HG Talis\b/i,                        'Talis'],
  [/^HG Tecturis E\b/i,                   'Tecturis E'],
  [/^HG Tecturis S\b/i,                   'Tecturis S'],
  [/^HG Croma E\b/i,                      'Croma E'],
  [/^HG Croma\b/i,                        'Croma'],
  [/^HG Crometta\b/i,                     'Crometta'],
  [/^HG Ecostat\b/i,                      'Ecostat'],
  [/^HG ShowerSelect\b/i,                 'ShowerSelect'],
  [/^HG RainSelect\b/i,                   'RainSelect'],
  [/^HG Rainfinity\b/i,                   'Rainfinity'],
  [/^HG Raindance Alive\b/i,              'Raindance Alive'],
  [/^HG Raindance\b/i,                    'Raindance'],
  [/^HG Rainmaker\b/i,                    'Rainmaker'],
  [/^HG Metropol\b/i,                     'Metropol'],
  [/^HG Pulsify\b/i,                      'Pulsify'],
  [/^HG Finoris\b/i,                      'Finoris'],
  [/^HG Vivenis\b/i,                      'Vivenis'],
  [/^HG Aquno\b/i,                        'Aquno'],
  [/^HG Metris\b/i,                       'Metris'],
  [/^HG Logis\b/i,                        'Logis'],
  [/^HG Focus\b/i,                        'Focus'],
  [/^HG Rebris\b/i,                       'Rebris'],
  [/^HG Unica\b/i,                        'Unica'],
  [/^HG FixFit\b/i,                       'FixFit'],
  [/^HG Porter\b/i,                       'Porter'],
  [/^HG Isiflex\b/i,                      'Isiflex'],
  [/^HG Sensoflex\b/i,                    'Sensoflex'],
  [/^HG DuoTurn\b/i,                      'DuoTurn'],
  [/^HG Jocolino\b/i,                     'Jocolino'],
  [/^HG Novus\b/i,                        'Novus'],
  [/^HG Clubmaster\b/i,                   'Clubmaster'],
  [/^HG iBox\b/i,                         'iBox Universal'],
  [/^HG iControl\b/i,                     'iControl'],
  // RD abbreviation → Raindance (must come before generic HG RD* fallback)
  [/^HG RD\b/i,                           'Raindance'],
  // ShowerSelect Comfort variants (dot in name blocks fallback)
  [/^HG ShowerSel\.Com\.E\b/i,            'ShowerSelect Comfort E'],
  [/^HG ShowerSel\.Com\.S\b/i,            'ShowerSelect Comfort S'],
  [/^HG ShowerSel\.Com\.Q\b/i,            'ShowerSelect Comfort Q'],
  // Tectur.S = Tecturis (dot in name blocks fallback)
  [/^HG Tectur\.S\b/i,                    'Tecturis'],
  // FixFit case variant
  [/^HG Fixfit\b/i,                       'FixFit'],
  // iBox/ShowerSelect basic sets
  [/^HG basic set iBox\b/i,               'iBox Universal'],
  [/^HG basic set Select\b/i,             'ShowerSelect'],
  // Shower hose lines without HG prefix word order
  [/^HG shower hose\s+Isiflex\b/i,        'Isiflex'],
  [/^HG shower hose\s+Sensoflex\b/i,      'Sensoflex'],
  [/^HG shower hose\s+Metaflex\b/i,       'Metaflex'],
  // Wall bar belongs to Unica family
  [/^HG Wall bar Unica\b/i,               'Unica'],
  // Bidette — dedicated hygiene shower product line
  [/^Bidette\b/i,                         'Bidette'],
  // Double HG prefix typo in source data
  [/^HG HG Raindance\b/i,                 'Raindance'],
  // Products without HG/AX prefix (Hansgrohe ceramics + some basin mixers)
  [/^EluPura\b/i,                         'EluPura'],
  [/^MellowTide\b/i,                      'MellowTide'],
  [/^LakeShore\b/i,                       'LakeShore'],
  [/^(?:Set of )?WH WC\b/i,              'WH Ceramics'],
  [/^Handrinse basin\b/i,                 'WH Ceramics'],
  [/^Washbasin\b/i,                       'WH Ceramics'],
  [/^Double Washbasin\b/i,                'WH Ceramics'],
  [/^Undercounter basin\b/i,              'WH Ceramics'],
  [/^Above Counter basin\b/i,             'WH Ceramics'],
  [/^bowl\b/i,                            'WH Ceramics'],
  [/^Pulsify\b/i,                         'Pulsify'],
  [/^Croma E\b/i,                         'Croma E'],
  [/^Croma\b/i,                           'Croma'],
  [/^Finoris\b/i,                         'Finoris'],
  [/^Vivenis\b/i,                         'Vivenis'],
  [/^Logis\b/i,                           'Logis'],
  [/^Rebris\b/i,                          'Rebris'],
  [/^Vernis Blend\b/i,                    'Vernis Blend'],
  [/^Vernis Shape\b/i,                    'Vernis Shape'],
  [/^Tecturis E\b/i,                      'Tecturis E'],
  [/^Tecturis S\b/i,                      'Tecturis S'],
  // Kitchen
  [/^A41\b/i,                             'A41'],
]

function extractSeries(name: string): string | null {
  for (const [pattern, series] of SERIES_PATTERNS) {
    if (pattern.test(name)) return series
  }
  // Generic fallback: second word after HG/AX/AXOR prefix
  // Reject: <=3 chars, contains dot/slash, starts lowercase (accessory noise)
  const m = name.match(/^(?:HG|AX|AXOR)\s+(\S+)/)
  if (m) {
    const word = m[1]!
    if (word.length >= 4 && !/[./\\]/.test(word) && /^[A-Z]/.test(word)) return word
  }
  return null
}

// ─── Tier logic ───────────────────────────────────────────────────────────────

function assignTier(brand: ProductBrand, mrp: number): string {
  if (brand === 'AXOR')       return mrp > 100_000 ? 'luxury' : 'premium'
  if (brand === 'HANSGROHE')  return mrp > 50_000  ? 'premium' : 'mid'
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
  { id: 'co01', name: 'Mehta Architects & Associates',  industry: 'Architecture' },
  { id: 'co02', name: 'Priya Nair Interiors',           industry: 'Interior Design' },
  { id: 'co03', name: 'Rajesh Constructions Pvt Ltd',   industry: 'Real Estate & Construction' },
  { id: 'co04', name: 'Studio Anita Lobo',              industry: 'Interior Design' },
  { id: 'co05', name: 'KD Building Works',              industry: 'Construction' },
  { id: 'co06', name: 'Lodha Group',                    industry: 'Real Estate' },
  { id: 'co07', name: 'Oberoi Realty',                  industry: 'Real Estate' },
]

interface ContactSeed { name: string; role: string; companyId: string | null; email: string; phone: string; type: ContactType }
const CONTACTS: ContactSeed[] = [
  { name: 'Arjun Mehta',   role: 'Principal Architect',     companyId: 'co01', email: 'arjun@mehtaarchitects.com',  phone: '+91 98200 44512', type: 'ARCHITECT' },
  { name: 'Priya Nair',    role: 'Senior Interior Designer', companyId: 'co02', email: 'priya@pninteriors.com',      phone: '+91 87654 22001', type: 'INTERIOR_DESIGNER' },
  { name: 'Rajesh Shetty', role: 'Director — Procurement',  companyId: 'co03', email: 'rajesh.shetty@rajeshcon.com',phone: '+91 98765 11234', type: 'BUILDER' },
  { name: 'Anita Lobo',    role: 'Design Director',         companyId: 'co04', email: 'anita@studioanitalobo.com',  phone: '+91 90001 34567', type: 'INTERIOR_DESIGNER' },
  { name: 'Kiran Desai',   role: 'Site Manager',            companyId: 'co05', email: 'kiran.desai@kdbuild.in',    phone: '+91 98452 66781', type: 'CONTRACTOR' },
  { name: 'Sameer Kapoor', role: 'VP Projects',             companyId: 'co06', email: 'sameer.k@lodha.com',        phone: '+91 98190 55678', type: 'BUILDER' },
  { name: 'Deepa Menon',   role: 'Architect',               companyId: 'co07', email: 'deepa.m@oberoirealty.com',  phone: '+91 97690 12345', type: 'ARCHITECT' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Forge database…\n')

  // ── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where:  { email: 'admin@buildconhouse.com' },
    update: {},
    create: {
      id:            'dev-user-001',
      name:          'Buildcon Admin',
      email:         'admin@buildconhouse.com',
      clerkId:       'dev_user',
      role:          'OWNER',
      maxDiscountPct: 30,
    },
  })
  console.log(`  User: ${user.name}`)

  // ── Warehouses ────────────────────────────────────────────────────────────
  const warehouseData = [
    { id: 'wh_showroom', name: 'Showroom & Experience Centre', shortName: 'Showroom', type: 'SHOWROOM' as WarehouseType, address: 'Plot 12, MIDC Road, Andheri East, Mumbai 400093',            city: 'Mumbai',     state: 'Maharashtra', managerName: 'Suresh Iyer' },
    { id: 'wh_godown',   name: 'Main Godown — Bhiwandi',       shortName: 'Bhiwandi', type: 'GODOWN'   as WarehouseType, address: 'Shed 7-B, Transport Nagar, Bhiwandi, Thane 421302',          city: 'Bhiwandi',   state: 'Maharashtra', managerName: 'Ramesh Pawar' },
    { id: 'wh_dispatch', name: 'Dispatch Hub — Navi Mumbai',   shortName: 'Navi Mumbai', type: 'DISPATCH' as WarehouseType, address: 'Unit 4, TTC Industrial Area, Mahape, Navi Mumbai 400710',city: 'Navi Mumbai', state: 'Maharashtra', managerName: 'Deepa Kulkarni' },
  ]
  for (const wh of warehouseData) {
    await prisma.warehouse.upsert({ where: { id: wh.id }, update: {}, create: wh })
  }
  console.log(`  Warehouses: ${warehouseData.length}`)

  // ── Products from catalog.json ────────────────────────────────────────────
  const catalog: CatalogProduct[] = JSON.parse(
    readFileSync(join(__dirname, '../../../scripts/catalog.json'), 'utf-8')
  )

  // Group products by article base (first 5 digits of SKU = Hansgrohe article family)
  const groups = new Map<string, CatalogProduct[]>()
  for (const p of catalog) {
    const base = p.sku.slice(0, 5)
    const list = groups.get(base) ?? []
    list.push(p)
    groups.set(base, list)
  }

  console.log(`\n  Catalog: ${catalog.length} total entries in ${groups.size} article families`)

  let successCount   = 0
  let failCount      = 0
  let noMrpEstimated = 0
  let variantCount   = 0

  // Gather all groups into batches for upsert
  const allGroups = Array.from(groups.values())
  const batches   = chunk(allGroups, 20)

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (siblings) => {
        // Sort: Chrome (000) first, then by finish code
        siblings.sort((a, b) => {
          if (a.finishCode === '000') return -1
          if (b.finishCode === '000') return 1
          return (a.finishCode ?? '').localeCompare(b.finishCode ?? '')
        })

        // Canonical = Chrome (000) if exists, else first with an MRP, else first
        const canonical =
          siblings.find((s) => s.finishCode === '000') ??
          siblings.find((s) => s.mrp !== null) ??
          siblings[0]!

        // Resolve canonical MRP
        const canonicalMrp = canonical.mrp ?? siblings.find((s) => s.mrp !== null)?.mrp ?? 0
        if (canonicalMrp === 0) return null  // skip groups with no pricing at all

        // Build finishes array (all siblings including canonical)
        const finishes = siblings.map((s) => {
          let mrp = s.mrp
          if (mrp === null) {
            // Estimate from canonical × finish premium
            const mult = FINISH_PREMIUM[s.finishCode ?? ''] ?? 1.38
            mrp = Math.round(canonicalMrp * mult)
            noMrpEstimated++
          }
          return {
            name:      s.finishName ?? 'Chrome',
            code:      s.finishCode ?? '000',
            sku:       s.sku,
            color:     FINISH_HEX[s.finishCode ?? '000'] ?? '#C8D0D8',
            priceAdj:  Math.round(mrp - canonicalMrp),
          }
        })

        // Image: prefer Chrome sibling's image, fallback to any sibling with image
        const imageSource = siblings.find((s) => s.hasImage && s.finishCode === '000')
          ?? siblings.find((s) => s.hasImage)
        const imageUrl = imageSource ? `/products/${imageSource.sku}.png` : null

        // Category: BASINS with ceramic subcategory → reclassify to WCS
        const rawCat    = canonical.category
        const finalCat  = (rawCat === 'BASINS' && canonical.subcategory === 'Ceramics, WCs & Wash Bowls')
          ? 'WCS'
          : rawCat
        const category  = CATEGORY_MAP[finalCat] ?? 'ACCESSORIES'
        const brand     = BRAND_MAP[canonical.brand] ?? 'OTHER'
        const mrp       = canonicalMrp
        const tier      = assignTier(brand as ProductBrand, mrp)
        const seriesName = extractSeries(canonical.name)

        // Canonical name: use sibling's name, fallback to first sibling with non-empty name
        const canonicalName = canonical.name.trim() ||
          siblings.find((s) => s.name.trim())?.name.trim() ||
          `${canonical.brand} ${canonical.subcategory}`

        const canonicalData = {
          brand,
          category,
          name:        canonicalName,
          description: null as string | null,
          mrp,
          gstRate:     canonical.gstRate,
          unit:        canonical.unit,
          imageUrl,
          tier,
          isActive:    true,
          stockAvailable: 0,
          stockOnOrder:   0,
          stockCommitted: 0,
          finishCode:  canonical.finishCode ?? null,
          finishName:  canonical.finishName ?? null,
          seriesName,
          subcategory: canonical.subcategory ?? null,
          sectionName: canonical.section ?? null,
          brandGroup:  canonical.brandGroup ?? canonical.brand,
          sourceFile:  canonical.sourceFile ?? null,
          variants:    finishes.length > 1 ? { finishes } : (finishes.length === 1 ? { finishes } : null),
        }

        // Upsert canonical product
        await prisma.product.upsert({
          where:  { sku: canonical.sku },
          update: canonicalData,
          create: { sku: canonical.sku, ...canonicalData },
        })

        // Upsert non-canonical variants as inactive DB records
        // (needed so from-pos PO creation can find them by SKU)
        for (const sibling of siblings) {
          if (sibling.sku === canonical.sku) continue

          const sibMrp = sibling.mrp ?? Math.round(canonicalMrp * (FINISH_PREMIUM[sibling.finishCode ?? ''] ?? 1.38))
          const sibName = sibling.name.trim() || canonicalName

          await prisma.product.upsert({
            where:  { sku: sibling.sku },
            update: { isActive: false, name: sibName, mrp: sibMrp, imageUrl },
            create: {
              sku:        sibling.sku,
              brand,
              category,
              name:       sibName,
              mrp:        sibMrp,
              gstRate:    sibling.gstRate,
              unit:       sibling.unit,
              imageUrl,
              isActive:   false,
              finishCode: sibling.finishCode ?? null,
              finishName: sibling.finishName ?? null,
              seriesName,
              subcategory: sibling.subcategory ?? null,
              brandGroup:  sibling.brandGroup ?? sibling.brand,
              sourceFile:  sibling.sourceFile ?? null,
            },
          })
          variantCount++
        }

        return canonical.sku
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        successCount++
      } else if (result.status === 'rejected') {
        failCount++
        console.error(`  ✗ Batch error: ${(result.reason as Error)?.message ?? result.reason}`)
      }
    }
  }

  console.log(`\n  Canonical products seeded: ${successCount}`)
  console.log(`  Variant (inactive) records: ${variantCount}`)
  console.log(`  MRP estimated from premium: ${noMrpEstimated}`)
  console.log(`  Failed:                     ${failCount}`)

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
