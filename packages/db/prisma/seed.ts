import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ProductBrand = 'GROHE' | 'HANSGROHE' | 'AXOR' | 'VITRA' | 'GEBERIT' | 'OTHER'
type ProductCategory = 'SHOWERS' | 'WCS' | 'THERMOSTATS' | 'FAUCETS' | 'BASINS' | 'BATHTUBS' | 'ACCESSORIES' | 'CONCEALED' | 'KITCHEN'
type ContactType = 'ARCHITECT' | 'INTERIOR_DESIGNER' | 'BUILDER' | 'CONTRACTOR' | 'RETAIL' | 'INSTITUTIONAL'
type WarehouseType = 'SHOWROOM' | 'GODOWN' | 'DISPATCH'

function mapBrand(brand: string): ProductBrand {
  const map: Record<string, ProductBrand> = {
    'Grohe': 'GROHE',
    'Hansgrohe': 'HANSGROHE',
    'Axor': 'AXOR',
    'Vitra': 'VITRA',
    'Geberit': 'GEBERIT',
  }
  return map[brand] ?? 'OTHER'
}

function mapCategory(subCategory: string): ProductCategory {
  const sub = subCategory.toLowerCase()
  if (sub.includes('basin mixer') || sub.includes('bath mixer') || sub.includes('bath filler') || sub.includes('kitchen mixer') || sub.includes('valve') || sub.includes('cock')) return sub.includes('kitchen') ? 'KITCHEN' : 'FAUCETS'
  if (sub.includes('shower system') || sub.includes('overhead shower') || sub.includes('rain shower')) return 'SHOWERS'
  if (sub.includes('thermostat')) return 'THERMOSTATS'
  if (sub.includes('bathtub') || sub.includes('bath tub')) return 'BATHTUBS'
  if (sub.includes('wc') || sub.includes('toilet') || sub.includes('cistern')) return 'WCS'
  if (sub.includes('wash basin') || sub.includes('basin')) return 'BASINS'
  if (sub.includes('concealed')) return 'CONCEALED'
  return 'ACCESSORIES'
}

interface ProductSeed {
  sku: string; name: string; brand: string; subCategory: string
  description: string; unit: string; mrp: number; gstRate: number
}

const PRODUCTS: ProductSeed[] = [
  // GROHE
  { sku: 'GRH-ES-BM-CH', name: 'Grohe Essence Single-Lever Basin Mixer', brand: 'Grohe', subCategory: 'Basin Mixers', description: 'Single-lever basin mixer, L-size, Grohe SilkMove ceramic cartridge, StarLight chrome, M-size aerator.', unit: 'pcs', mrp: 14500, gstRate: 18 },
  { sku: 'GRH-ES-TSS-CH', name: 'Grohe Essence Concealed Thermostatic Shower System', brand: 'Grohe', subCategory: 'Shower Systems', description: 'Concealed thermostatic valve + 260mm rain head + handshower + 3-way diverter. SmartControl.', unit: 'set', mrp: 68000, gstRate: 18 },
  { sku: 'GRH-EU-KM-CH', name: 'Grohe Eurostyle Single-Lever Kitchen Mixer', brand: 'Grohe', subCategory: 'Kitchen Mixer', description: 'Single-lever kitchen mixer, swivel spout 360°, integrated aerator, StarLight chrome.', unit: 'pcs', mrp: 9800, gstRate: 18 },
  { sku: 'GRH-RS-310-CH', name: 'Grohe Rainshower 310 Overhead Shower', brand: 'Grohe', subCategory: 'Overhead Showers', description: 'Rain shower head 310mm, 2 spray modes, DreamRain technology, with 400mm arm.', unit: 'set', mrp: 22000, gstRate: 18 },
  { sku: 'GRH-CC-PO-CH', name: 'Grohe Concetto Pull-Out Kitchen Mixer', brand: 'Grohe', subCategory: 'Kitchen Mixer', description: 'Pull-out kitchen faucet, dual spray, StarLight chrome, SilkMove cartridge.', unit: 'pcs', mrp: 16400, gstRate: 18 },
  { sku: 'GRH-SA-SWT-CH', name: 'Grohe Sensia Arena Shower Toilet', brand: 'Grohe', subCategory: 'Smart Toilet', description: 'Smart shower toilet, integrated bidet function, dryer, heated seat, touch remote, Rimless+.', unit: 'pcs', mrp: 285000, gstRate: 18 },
  // HANSGROHE
  { sku: 'HG-MP-BM-CH', name: 'Hansgrohe Metropol Single-Lever Basin Mixer', brand: 'Hansgrohe', subCategory: 'Basin Mixers', description: 'Single-lever basin mixer 110, CoolStart technology, EcoSmart flow limiter 5L/min.', unit: 'pcs', mrp: 18200, gstRate: 18 },
  { sku: 'HG-MPWP-BM-CH', name: 'Hansgrohe Metropol Classic Widespread Basin Mixer', brand: 'Hansgrohe', subCategory: 'Basin Mixers', description: 'Widespread 3-hole basin mixer with pop-up waste, CoolStart, EcoSmart.', unit: 'set', mrp: 28500, gstRate: 18 },
  { sku: 'HG-RDS-240-CH', name: 'Hansgrohe Raindance S 240 PowderRain Overhead Shower', brand: 'Hansgrohe', subCategory: 'Overhead Showers', description: '240mm overhead shower with PowderRain + RainAir spray modes, with shower arm 390mm.', unit: 'set', mrp: 19800, gstRate: 18 },
  { sku: 'HG-LG-TBM-CH', name: 'Hansgrohe Logis Exposed Thermostatic Bath Mixer', brand: 'Hansgrohe', subCategory: 'Bath Mixer', description: 'Exposed thermostatic mixer for bath/shower combo, max 38°C safety stop, EcoSmart.', unit: 'pcs', mrp: 34500, gstRate: 18 },
  { sku: 'HG-UBX-CONC-UNI', name: 'Hansgrohe uBox Concealed Installation Box', brand: 'Hansgrohe', subCategory: 'Concealed Bodies', description: 'Universal concealed installation box for Hansgrohe/Axor mixers.', unit: 'pcs', mrp: 8400, gstRate: 18 },
  // AXOR
  { sku: 'AX-SK-BM80-CH', name: 'Axor Starck Single-Lever Basin Mixer 80', brand: 'Axor', subCategory: 'Basin Mixers', description: 'Single-lever basin mixer 80, designed by Philippe Starck. EcoSmart 5L/min.', unit: 'pcs', mrp: 38500, gstRate: 18 },
  { sku: 'AX-ED-BM-CH', name: 'Axor Edge Diamond Cut Basin Mixer', brand: 'Axor', subCategory: 'Basin Mixers', description: 'Basin mixer with precise diamond-cut lines, designed by Jean-Marie Massaud. FinishPlus chrome.', unit: 'pcs', mrp: 72000, gstRate: 18 },
  { sku: 'AX-ONE-OS-280', name: 'Axor One Overhead Shower 280 1jet', brand: 'Axor', subCategory: 'Overhead Showers', description: 'Square overhead shower 280×280mm, single jet PowderRain, designed by Phoenix Design.', unit: 'set', mrp: 55000, gstRate: 18 },
  { sku: 'AX-SK-FBS-CH', name: 'Axor Starck Freestanding Bath Spout', brand: 'Axor', subCategory: 'Bath Fillers', description: 'Floor-standing bath filler, single lever, tall column design, Philippe Starck.', unit: 'pcs', mrp: 185000, gstRate: 18 },
  // VITRA
  { sku: 'VT-S50-WHC-WH', name: 'Vitra S50 Wall-Hung WC (Compact, White)', brand: 'Vitra', subCategory: 'WC & Toilets', description: 'Wall-hung WC compact 48cm, Satin White glaze, Vortex flushing, includes soft-close seat.', unit: 'pcs', mrp: 28500, gstRate: 18 },
  { sku: 'VT-INT-RWH-WH', name: 'Vitra Integra Rimless Wall-Hung WC', brand: 'Vitra', subCategory: 'WC & Toilets', description: 'Rimless wall-hung WC 54cm, AquaBlade technology, hygienic glaze, soft-close seat.', unit: 'pcs', mrp: 34800, gstRate: 18 },
  { sku: 'VT-EQ-WB-60-WH', name: 'Vitra Equal Wash Basin (60cm, Wall-Hung)', brand: 'Vitra', subCategory: 'Wash Basins', description: 'Wall-hung wash basin 60cm, 1 tap hole, overflow, semi-recessed mounting option.', unit: 'pcs', mrp: 18200, gstRate: 18 },
  { sku: 'VT-MEM-FBT-WH', name: 'Vitra Memoria Freestanding Bathtub (170cm)', brand: 'Vitra', subCategory: 'Bathtubs', description: 'Oval freestanding bathtub 170cm, acrylic, Vitra Stone white.', unit: 'pcs', mrp: 148000, gstRate: 18 },
  { sku: 'VT-ML-VU-80-MW', name: 'Vitra M-Line Vanity Unit (80cm, Matte White)', brand: 'Vitra', subCategory: 'Vanity Units', description: 'Wall-hung vanity 80cm with single basin cutout, 2 drawers, soft-close, matt white.', unit: 'pcs', mrp: 52000, gstRate: 18 },
  { sku: 'VT-NEON-SWT-WH', name: 'Vitra Neon Smart WC with Bidet Function', brand: 'Vitra', subCategory: 'Smart Toilet', description: 'Integrated smart WC, bidet, dryer, rimless AquaBlade, remote + app control.', unit: 'pcs', mrp: 148000, gstRate: 18 },
  // GEBERIT
  { sku: 'GEB-DF-WHC-114', name: 'Geberit Duofix Element (Wall-Hung WC, H114)', brand: 'Geberit', subCategory: 'Concealed Cisterns', description: 'Wall-hung WC installation frame + concealed Sigma 12cm cistern + flush plate.', unit: 'set', mrp: 32000, gstRate: 18 },
  // OTHER BRANDS
  { sku: 'KOH-WC-AWH-WH', name: 'Kohler Archer Wall-Hung WC (White)', brand: 'Kohler', subCategory: 'WC & Toilets', description: 'Wall-hung WC, dual flush 3/6L, ReadyLatch quick-release seat.', unit: 'pcs', mrp: 42500, gstRate: 18 },
  { sku: 'KOH-BT-VEIL-WH', name: 'Kohler Veil Freestanding Bathtub (White, 1700mm)', brand: 'Kohler', subCategory: 'Bathtubs', description: 'Freestanding acrylic soaking tub, 1700mm. Sculptural oval form.', unit: 'pcs', mrp: 185000, gstRate: 18 },
  { sku: 'KOH-SS-REACH-CH', name: 'Kohler Reach Thermostatic Shower System', brand: 'Kohler', subCategory: 'Shower Systems', description: 'Complete thermostatic system: 300mm rain head + hand shower + 3 body jets.', unit: 'set', mrp: 95000, gstRate: 18 },
  { sku: 'JAG-BM-LYRIC-CH', name: 'Jaguar Lyric Single-Lever Basin Mixer', brand: 'Jaguar', subCategory: 'Basin Mixers', description: 'Single-lever basin mixer, 360° swivel spout, ceramic cartridge, chrome.', unit: 'pcs', mrp: 8400, gstRate: 18 },
  { sku: 'JAG-OS-FLOR-300', name: 'Jaguar Florentine Overhead Rain Shower (300mm)', brand: 'Jaguar', subCategory: 'Overhead Showers', description: 'Round overhead shower 300mm, single function, chrome finish, with 450mm arm.', unit: 'set', mrp: 7200, gstRate: 18 },
  { sku: 'JAG-AC-CONT-15', name: 'Jaguar Continental Angle Cock (15mm)', brand: 'Jaguar', subCategory: 'Valves & Cocks', description: 'Brass angle valve 15mm, quarter-turn, chrome plated.', unit: 'pcs', mrp: 480, gstRate: 18 },
  { sku: 'JAG-ACC-5IN1-CH', name: 'Jaguar 5-in-1 Bathroom Accessories Set', brand: 'Jaguar', subCategory: 'Accessory Sets', description: 'Towel bar 24" + paper holder + soap dish + glass shelf + hook, chrome.', unit: 'set', mrp: 5800, gstRate: 18 },
  { sku: 'JAG-BT-32-CH', name: 'Jaguar Bottle Trap (32mm, Chrome)', brand: 'Jaguar', subCategory: 'Waste Fittings', description: 'Chrome bottle trap, 32mm, P-trap, for wall-hung basins.', unit: 'pcs', mrp: 680, gstRate: 18 },
  { sku: 'HW-WC-OPUS-WH', name: 'Hindware Opus Floor-Mount WC (White)', brand: 'Hindware', subCategory: 'WC & Toilets', description: 'Floor-mount WC, soft-close seat, 6L single flush, UF seat, vitreous china.', unit: 'pcs', mrp: 12800, gstRate: 18 },
  { sku: 'HW-WB-CALI-WH', name: 'Hindware Calido Wall-Hung Basin (White, 550mm)', brand: 'Hindware', subCategory: 'Wash Basins', description: 'Vitreous china wall-hung basin, overflow, single tap hole, 550mm width.', unit: 'pcs', mrp: 5600, gstRate: 18 },
  { sku: 'HW-MIR-LED-800', name: 'Hindware LED Backlit Mirror (800×600mm)', brand: 'Hindware', subCategory: 'Mirrors', description: 'Rectangular LED backlit mirror, IP44, anti-fog coating, touch dimmer.', unit: 'pcs', mrp: 12500, gstRate: 18 },
  { sku: 'OYS-CAL-LF-1200', name: 'Oyster Calacatta Oro Large Format Tile (1200×600)', brand: 'Oyster', subCategory: 'Large Format Tiles', description: 'Polished porcelain, Calacatta Oro marble pattern, book-matched rectified.', unit: 'box', mrp: 4800, gstRate: 28 },
  { sku: 'OYS-NM-MT-800', name: 'Oyster Nero Marquina Matte Floor Tile (800×800)', brand: 'Oyster', subCategory: 'Floor Tiles', description: 'Full-body porcelain, Nero Marquina black marble look, matte finish, R10 anti-slip.', unit: 'box', mrp: 3600, gstRate: 28 },
  { sku: 'OYS-STV-GL-600', name: 'Oyster Statuario Venato Glossy Wall Tile (600×300)', brand: 'Oyster', subCategory: 'Wall Tiles', description: 'Glossy ceramic, Statuario Venato white marble effect, bathroom feature walls.', unit: 'box', mrp: 1980, gstRate: 28 },
  { sku: 'OYS-GR-CON-600', name: 'Oyster Grigio Concrete Effect Tile (600×600)', brand: 'Oyster', subCategory: 'Floor Tiles', description: 'Porcelain, textured concrete look, warm grey tone, anti-slip R11.', unit: 'box', mrp: 2400, gstRate: 28 },
  { sku: 'QUT-CA-SLAB-1800', name: 'Qutone Calacatta Altissimo Slab (1800×900)', brand: 'Qutone', subCategory: 'Slabs', description: 'Sintered stone slab, Calacatta Altissimo pattern, 6mm thin, walls/floors/countertops.', unit: 'pcs', mrp: 8400, gstRate: 28 },
  { sku: 'QUT-FG-TRZ-600', name: 'Qutone Forest Green Terrazzo Tile (600×600)', brand: 'Qutone', subCategory: 'Floor Tiles', description: 'Terrazzo-inspired porcelain, forest green base with white and gold chips.', unit: 'box', mrp: 3200, gstRate: 28 },
  { sku: 'QUT-LW-WT-900', name: 'Qutone Limra White Marble Effect Wall Tile (900×300)', brand: 'Qutone', subCategory: 'Wall Tiles', description: 'Rectified porcelain, Limra limestone texture, brushed surface, feature walls.', unit: 'box', mrp: 2850, gstRate: 28 },
  { sku: 'DIM-VEN-MOS-300', name: 'Dimore Venezia Gold Mosaic Tile (300×300)', brand: 'Dimore', subCategory: 'Mosaic', description: 'Hand-crafted Murano glass mosaic, Venezia gold palette, Italian. Accent walls.', unit: 'box', mrp: 12800, gstRate: 28 },
  { sku: 'DIM-AB-POL-800', name: 'Dimore Arabescato Bianco Polished Tile (800×400)', brand: 'Dimore', subCategory: 'Wall Tiles', description: 'Italian porcelain, Arabescato Bianco marble pattern, high-gloss polished.', unit: 'box', mrp: 6800, gstRate: 28 },
  { sku: 'DIM-NA-HN-600', name: 'Dimore Nero Assoluto Honed Tile (600×600)', brand: 'Dimore', subCategory: 'Floor Tiles', description: 'Italian porcelain, Nero Assoluto absolute black, honed matte finish, rectified.', unit: 'box', mrp: 5600, gstRate: 28 },
  { sku: 'NEX-GG-R12-600', name: 'Nexion Granite Grey R12 Outdoor Tile (600×600)', brand: 'Nexion', subCategory: 'Outdoor Tiles', description: 'Porcelain outdoor tile, granite grey texture, R12 slip-resistance, frost-proof.', unit: 'box', mrp: 1950, gstRate: 28 },
  { sku: 'NEX-TN-OUT-450', name: 'Nexion Travertino Noce Outdoor Tile (450×450)', brand: 'Nexion', subCategory: 'Outdoor Tiles', description: 'Travertino Noce pattern, R11 anti-slip, outdoor paths, pool decks.', unit: 'box', mrp: 1650, gstRate: 28 },
  { sku: 'NEX-TS-IND-600', name: 'Nexion TechStone Industrial Floor Tile (600×600)', brand: 'Nexion', subCategory: 'Floor Tiles', description: 'Industrial-look full-body porcelain, cement grey, R9 anti-slip.', unit: 'box', mrp: 1450, gstRate: 28 },
  { sku: 'NEX-TA-C1T-20', name: 'Nexion Tile Adhesive C1T (20kg)', brand: 'Nexion', subCategory: 'Adhesives', description: 'Cementitious tile adhesive C1T, suitable for ceramic, porcelain, vitrified tiles.', unit: 'box', mrp: 480, gstRate: 18 },
  { sku: 'NEX-EG-PW-2', name: 'Nexion Epoxy Grout (2kg, Pearl White)', brand: 'Nexion', subCategory: 'Grouts', description: '2-component epoxy grout, Pearl White, stain-resistant, for joints 2-20mm.', unit: 'pcs', mrp: 820, gstRate: 18 },
  { sku: 'KAJ-FT-ETW-600', name: 'Kajaria Eternity White Ceramic Floor Tile (600×600)', brand: 'Kajaria', subCategory: 'Floor Tiles', description: 'Matt ceramic floor tile, anti-skid surface, high durability.', unit: 'box', mrp: 1450, gstRate: 28 },
  { sku: 'KAJ-GVT-NB-800', name: 'Kajaria GVT Nova Beige Vitrified Tile (800×800)', brand: 'Kajaria', subCategory: 'Vitrified Tiles', description: 'Glazed vitrified tile, Nova Beige, double charge, mirror polish.', unit: 'box', mrp: 2200, gstRate: 28 },
  { sku: 'KAJ-HEX-BG-275', name: 'Kajaria Duragres Hexa Blue-Grey Wall Tile (275×240)', brand: 'Kajaria', subCategory: 'Wall Tiles', description: 'Hexagonal ceramic wall tile, blue-grey matte, for feature walls.', unit: 'box', mrp: 1350, gstRate: 28 },
  { sku: 'SOM-VT-INF-800', name: 'Somany Duragres Infinity Ivory Vitrified Tile (800×800)', brand: 'Somany', subCategory: 'Vitrified Tiles', description: 'GVT tile, Infinity Ivory pattern, high sheen, PEI 4 hardness.', unit: 'box', mrp: 2600, gstRate: 28 },
  { sku: 'SOM-MOS-CB-200', name: 'Somany Mosaic Carbon Black Wall Tile (200×200)', brand: 'Somany', subCategory: 'Wall Tiles', description: 'Ceramic mosaic tile, carbon black gloss, for accent walls and shower niches.', unit: 'box', mrp: 1650, gstRate: 28 },
  { sku: 'RAK-VT-ONYX-800', name: 'RAK Ceramics Luster Onyx Full-Body Tile (800×800)', brand: 'RAK Ceramics', subCategory: 'Vitrified Tiles', description: 'Full-body glazed vitrified, Luster Onyx black, 800×800mm.', unit: 'box', mrp: 3600, gstRate: 28 },
  { sku: 'RAK-WT-CARR-600', name: 'RAK Ceramics Carrara Marble Wall Tile (600×300)', brand: 'RAK Ceramics', subCategory: 'Wall Tiles', description: 'Ceramic wall tile, Carrara white marble pattern, gloss finish.', unit: 'box', mrp: 1380, gstRate: 28 },
]

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
      role: 'ADMIN',
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
    await prisma.warehouse.upsert({
      where: { id: wh.id },
      update: {},
      create: wh,
    })
  }
  console.log(`  Warehouses: ${warehouseData.length}`)

  // ── Products ──────────────────────────────────────────────────────────────
  let productCount = 0
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        brand: mapBrand(p.brand),
        category: mapCategory(p.subCategory),
        description: p.description,
        unit: p.unit,
        mrp: p.mrp,
        gstRate: p.gstRate,
        isActive: true,
        stockAvailable: 0,
        stockOnOrder: 0,
        stockCommitted: 0,
      },
    })
    productCount++
  }
  console.log(`  Products: ${productCount}`)

  // ── Companies ─────────────────────────────────────────────────────────────
  for (const co of COMPANIES) {
    await prisma.company.upsert({
      where: { id: co.id },
      update: {},
      create: { id: co.id, name: co.name, industry: co.industry },
    })
  }
  console.log(`  Companies: ${COMPANIES.length}`)

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
