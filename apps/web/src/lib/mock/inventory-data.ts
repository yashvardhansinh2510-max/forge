// ─── Types ────────────────────────────────────────────────────────────────────

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST' | 'RETURN'
export type ProductUnit = 'pcs' | 'box' | 'set' | 'sqft' | 'pair'
export type ProductTier = 'luxury' | 'premium' | 'mid'

export interface WarehouseStock {
  warehouseId: string
  warehouseName: string
  quantity: number
  reserved: number
}

export interface Product {
  id: string
  name: string
  sku: string
  brand: string
  tier: ProductTier
  category: string
  subCategory: string
  description: string
  unit: string
  unitPrice: number
  costPrice: number
  gstRate: number
  weight?: string
  dimensions?: string
  barcode?: string
  reorderPoint: number
  leadTimeDays: number
  status: StockStatus
  totalStock: number
  warehouses: WarehouseStock[]
  tags: string[]
}

export interface Warehouse {
  id: string
  name: string
  shortName: string
  type: 'showroom' | 'godown' | 'dispatch'
  address: string
  city: string
  state: string
  manager: { name: string; initials: string; color: string }
  phone: string
  totalSKUs: number
  totalUnits: number
  totalValue: number
  utilization: number
  color: string
  notes: string
}

export interface StockMovement {
  id: string
  type: MovementType
  productId: string
  productName: string
  sku: string
  fromWarehouseId: string | null
  fromWarehouseName: string | null
  toWarehouseId: string | null
  toWarehouseName: string | null
  quantity: number
  reference: string
  reason: string
  performedBy: string
  createdAt: Date
}

// ─── Brand Config ─────────────────────────────────────────────────────────────

export const BRANDS = {
  GROHE:      { name: 'Grohe',       color: '#009FE3', origin: 'Germany', tier: 'premium' as ProductTier },
  HANSGROHE:  { name: 'Hansgrohe',   color: '#00529A', origin: 'Germany', tier: 'premium' as ProductTier },
  AXOR:       { name: 'Axor',        color: '#1C1C1E', origin: 'Germany', tier: 'luxury'  as ProductTier },
  VITRA:      { name: 'Vitra',       color: '#E5002B', origin: 'Turkey',  tier: 'premium' as ProductTier },
  KOHLER:     { name: 'Kohler',      color: '#231F20', origin: 'USA',     tier: 'luxury'  as ProductTier },
  JAGUAR:     { name: 'Jaguar',      color: '#C41E3A', origin: 'India',   tier: 'mid'     as ProductTier },
  HINDWARE:   { name: 'Hindware',    color: '#E85D04', origin: 'India',   tier: 'mid'     as ProductTier },
  KAJARIA:    { name: 'Kajaria',     color: '#D62839', origin: 'India',   tier: 'mid'     as ProductTier },
  SOMANY:     { name: 'Somany',      color: '#1B4332', origin: 'India',   tier: 'mid'     as ProductTier },
  RAK:        { name: 'RAK Ceramics',color: '#8B1A1A', origin: 'UAE',     tier: 'mid'     as ProductTier },
  OYSTER:     { name: 'Oyster',      color: '#4A4E69', origin: 'India',   tier: 'mid'     as ProductTier },
  QUTONE:     { name: 'Qutone',      color: '#6B4226', origin: 'India',   tier: 'premium' as ProductTier },
  DIMORE:     { name: 'Dimore',      color: '#2D3A3A', origin: 'Italy',   tier: 'luxury'  as ProductTier },
  NEXION:     { name: 'Nexion',      color: '#5C3317', origin: 'India',   tier: 'mid'     as ProductTier },
  GEBERIT:    { name: 'Geberit',     color: '#003E6B', origin: 'Switzerland', tier: 'premium' as ProductTier },
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatQty(qty: number, unit: string): string {
  return `${qty.toLocaleString()} ${unit}`
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const products: Product[] = [

  // ══ GROHE ══════════════════════════════════════════════════════════════════
  {
    id: 'p001', name: 'Grohe Essence Single-Lever Basin Mixer',
    sku: 'GRH-ES-BM-CH', brand: 'Grohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Single-lever basin mixer, L-size, Grohe SilkMove ceramic cartridge, Grohe StarLight chrome, M-size aerator.',
    unit: 'pcs', unitPrice: 14500, costPrice: 8700, gstRate: 18,
    dimensions: 'Spout reach 120mm, height 160mm',
    barcode: '4005176921810', reorderPoint: 8, leadTimeDays: 7,
    status: 'in_stock', totalStock: 32,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 8, reserved: 2 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 24, reserved: 4 },
    ],
    tags: ['best-seller', 'chrome', 'grohe-silkmove'],
  },
  {
    id: 'p002', name: 'Grohe Essence Concealed Thermostatic Shower System',
    sku: 'GRH-ES-TSS-CH', brand: 'Grohe', tier: 'premium',
    category: 'Bathroom Fittings', subCategory: 'Shower Systems',
    description: 'Concealed thermostatic valve + 260mm rain head + handshower + 3-way diverter. SmartControl.',
    unit: 'set', unitPrice: 68000, costPrice: 38000, gstRate: 18,
    barcode: '4005176934001', reorderPoint: 3, leadTimeDays: 14,
    status: 'in_stock', totalStock: 7,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 7, reserved: 2 },
    ],
    tags: ['thermostatic', 'complete-system', 'smartcontrol'],
  },
  {
    id: 'p003', name: 'Grohe Eurostyle Single-Lever Kitchen Mixer',
    sku: 'GRH-EU-KM-CH', brand: 'Grohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Kitchen Mixers',
    description: 'Single-lever kitchen mixer, swivel spout 360°, integrated aerator, StarLight chrome.',
    unit: 'pcs', unitPrice: 9800, costPrice: 5800, gstRate: 18,
    dimensions: 'Spout reach 185mm', barcode: '4005176882801',
    reorderPoint: 10, leadTimeDays: 7,
    status: 'in_stock', totalStock: 28,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 6, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 22, reserved: 3 },
    ],
    tags: ['kitchen', 'chrome', 'fast-mover'],
  },
  {
    id: 'p004', name: 'Grohe Rainshower 310 Overhead Shower',
    sku: 'GRH-RS-310-CH', brand: 'Grohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Overhead Showers',
    description: 'Rain shower head 310mm, 2 spray modes, DreamRain technology, with 400mm arm.',
    unit: 'set', unitPrice: 22000, costPrice: 13000, gstRate: 18,
    dimensions: 'Diameter: 310mm', barcode: '4005176928901',
    reorderPoint: 5, leadTimeDays: 10,
    status: 'low_stock', totalStock: 4,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 4, reserved: 1 },
    ],
    tags: ['rain-shower', 'dreamrain', '310mm'],
  },
  {
    id: 'p005', name: 'Grohe Concetto Pull-Out Kitchen Mixer',
    sku: 'GRH-CC-PO-CH', brand: 'Grohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Kitchen Mixers',
    description: 'Pull-out kitchen faucet, dual spray, StarLight chrome, SilkMove cartridge.',
    unit: 'pcs', unitPrice: 16400, costPrice: 9800, gstRate: 18,
    barcode: '4005176892001', reorderPoint: 6, leadTimeDays: 10,
    status: 'in_stock', totalStock: 14,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 4, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 10, reserved: 2 },
    ],
    tags: ['pull-out', 'kitchen', 'premium'],
  },

  // ══ HANSGROHE ══════════════════════════════════════════════════════════════
  {
    id: 'p006', name: 'Hansgrohe Metropol Single-Lever Basin Mixer',
    sku: 'HG-MP-BM-CH', brand: 'Hansgrohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Single-lever basin mixer 110, CoolStart technology (default cold water), EcoSmart flow limiter 5L/min.',
    unit: 'pcs', unitPrice: 18200, costPrice: 10800, gstRate: 18,
    dimensions: 'Spout reach 110mm', barcode: '4011097789001',
    reorderPoint: 6, leadTimeDays: 10,
    status: 'in_stock', totalStock: 18,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 4, reserved: 1 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 14, reserved: 2 },
    ],
    tags: ['coolstart', 'ecosmart', 'hansgrohe-metropol'],
  },
  {
    id: 'p007', name: 'Hansgrohe Metropol Classic Widespread Basin Mixer',
    sku: 'HG-MPWP-BM-CH', brand: 'Hansgrohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Widespread 3-hole basin mixer with pop-up waste, CoolStart, EcoSmart. Classic cross-handle design.',
    unit: 'set', unitPrice: 28500, costPrice: 17000, gstRate: 18,
    barcode: '4011097793001', reorderPoint: 4, leadTimeDays: 12,
    status: 'in_stock', totalStock: 9,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 9, reserved: 2 },
    ],
    tags: ['widespread', '3-hole', 'classic'],
  },
  {
    id: 'p008', name: 'Hansgrohe Raindance S 240 PowderRain Overhead Shower',
    sku: 'HG-RDS-240-CH', brand: 'Hansgrohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Overhead Showers',
    description: '240mm overhead shower with PowderRain + RainAir spray modes, with shower arm 390mm.',
    unit: 'set', unitPrice: 19800, costPrice: 11800, gstRate: 18,
    dimensions: 'Diameter: 240mm', barcode: '4011097234001',
    reorderPoint: 5, leadTimeDays: 10,
    status: 'in_stock', totalStock: 12,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 2, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 10, reserved: 1 },
    ],
    tags: ['powderrain', 'rainair', '240mm'],
  },
  {
    id: 'p009', name: 'Hansgrohe Logis Exposed Thermostatic Bath Mixer',
    sku: 'HG-LG-TBM-CH', brand: 'Hansgrohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Bath Mixers',
    description: 'Exposed thermostatic mixer for bath/shower combo, max 38°C safety stop, EcoSmart.',
    unit: 'pcs', unitPrice: 34500, costPrice: 20500, gstRate: 18,
    barcode: '4011097456001', reorderPoint: 3, leadTimeDays: 14,
    status: 'low_stock', totalStock: 2,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 2, reserved: 0 },
    ],
    tags: ['thermostatic', 'bath-shower', 'exposed'],
  },

  // ══ AXOR ═══════════════════════════════════════════════════════════════════
  {
    id: 'p010', name: 'Axor Starck Single-Lever Basin Mixer 80',
    sku: 'AX-SK-BM80-CH', brand: 'Axor', tier: 'luxury',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Single-lever basin mixer 80, designed by Philippe Starck. Precision ceramic disc cartridge, EcoSmart 5L/min.',
    unit: 'pcs', unitPrice: 38500, costPrice: 22000, gstRate: 18,
    dimensions: 'Spout reach 80mm, height 225mm', barcode: '4011097011001',
    reorderPoint: 3, leadTimeDays: 21,
    status: 'in_stock', totalStock: 6,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 2, reserved: 1 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 4, reserved: 0 },
    ],
    tags: ['philippe-starck', 'luxury', 'ecosmart'],
  },
  {
    id: 'p011', name: 'Axor Edge Diamond Cut Basin Mixer',
    sku: 'AX-ED-BM-CH', brand: 'Axor', tier: 'luxury',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Basin mixer with precise diamond-cut lines, designed by Jean-Marie Massaud. FinishPlus chrome.',
    unit: 'pcs', unitPrice: 72000, costPrice: 42000, gstRate: 18,
    dimensions: 'Spout reach 140mm', barcode: '4011097223001',
    reorderPoint: 2, leadTimeDays: 28,
    status: 'in_stock', totalStock: 4,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 1, reserved: 1 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 3, reserved: 0 },
    ],
    tags: ['diamond-cut', 'massaud', 'finishplus', 'flagship'],
  },
  {
    id: 'p012', name: 'Axor One Overhead Shower 280 1jet',
    sku: 'AX-ONE-OS-280', brand: 'Axor', tier: 'luxury',
    category: 'CP Fittings', subCategory: 'Overhead Showers',
    description: 'Square overhead shower 280×280mm, single jet PowderRain, designed by Phoenix Design.',
    unit: 'set', unitPrice: 55000, costPrice: 32000, gstRate: 18,
    dimensions: '280×280mm', barcode: '4011097445001',
    reorderPoint: 2, leadTimeDays: 21,
    status: 'in_stock', totalStock: 3,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 3, reserved: 1 },
    ],
    tags: ['square', 'powderrain', 'phoenix-design', 'luxury'],
  },
  {
    id: 'p013', name: 'Axor Starck Freestanding Bath Spout',
    sku: 'AX-SK-FBS-CH', brand: 'Axor', tier: 'luxury',
    category: 'CP Fittings', subCategory: 'Bath Fillers',
    description: 'Floor-standing bath filler, single lever, tall column design, Philippe Starck. Requires concealed mixer.',
    unit: 'pcs', unitPrice: 185000, costPrice: 108000, gstRate: 18,
    dimensions: 'Height: 820mm', barcode: '4011097678001',
    reorderPoint: 1, leadTimeDays: 28,
    status: 'low_stock', totalStock: 1,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 1, reserved: 1 },
    ],
    tags: ['freestanding', 'floor-standing', 'ultra-luxury', 'starck'],
  },

  // ══ VITRA ══════════════════════════════════════════════════════════════════
  {
    id: 'p014', name: 'Vitra S50 Wall-Hung WC (Compact, White)',
    sku: 'VT-S50-WHC-WH', brand: 'Vitra', tier: 'premium',
    category: 'Sanitary Ware', subCategory: 'WC & Toilets',
    description: 'Wall-hung WC compact 48cm, Satin White glaze, Vortex flushing, includes soft-close seat.',
    unit: 'pcs', unitPrice: 28500, costPrice: 17000, gstRate: 18,
    weight: '30kg', dimensions: '480×330×355mm', barcode: '8690506478001',
    reorderPoint: 5, leadTimeDays: 14,
    status: 'in_stock', totalStock: 14,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 2, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 12, reserved: 3 },
    ],
    tags: ['wall-hung', 'compact', 'vortex', 'vitra-s50'],
  },
  {
    id: 'p015', name: 'Vitra Integra Rimless Wall-Hung WC',
    sku: 'VT-INT-RWH-WH', brand: 'Vitra', tier: 'premium',
    category: 'Sanitary Ware', subCategory: 'WC & Toilets',
    description: 'Rimless wall-hung WC 54cm, AquaBlade technology, hygienic glaze, soft-close seat.',
    unit: 'pcs', unitPrice: 34800, costPrice: 20800, gstRate: 18,
    weight: '32kg', dimensions: '540×360×365mm', barcode: '8690506512001',
    reorderPoint: 4, leadTimeDays: 14,
    status: 'in_stock', totalStock: 8,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 8, reserved: 2 },
    ],
    tags: ['rimless', 'aquablade', 'hygienic-glaze'],
  },
  {
    id: 'p016', name: 'Vitra Equal Wash Basin (60cm, Wall-Hung)',
    sku: 'VT-EQ-WB-60-WH', brand: 'Vitra', tier: 'premium',
    category: 'Sanitary Ware', subCategory: 'Wash Basins',
    description: 'Wall-hung wash basin 60cm, 1 tap hole, overflow, semi-recessed mounting option.',
    unit: 'pcs', unitPrice: 18200, costPrice: 10800, gstRate: 18,
    weight: '14kg', dimensions: '600×460mm', barcode: '8690506634001',
    reorderPoint: 6, leadTimeDays: 14,
    status: 'in_stock', totalStock: 16,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 3, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 13, reserved: 2 },
    ],
    tags: ['wall-hung', '600mm', 'semi-recessed'],
  },
  {
    id: 'p017', name: 'Vitra Memoria Freestanding Bathtub (170cm)',
    sku: 'VT-MEM-FBT-WH', brand: 'Vitra', tier: 'premium',
    category: 'Bathroom Fittings', subCategory: 'Bathtubs',
    description: 'Oval freestanding bathtub 170cm, acrylic, Vitra Stone white, pre-drilled for deck-mounted filler.',
    unit: 'pcs', unitPrice: 148000, costPrice: 88000, gstRate: 18,
    weight: '38kg', dimensions: '1700×780×580mm', barcode: '8690506789001',
    reorderPoint: 1, leadTimeDays: 21,
    status: 'in_stock', totalStock: 3,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 3, reserved: 1 },
    ],
    tags: ['freestanding', 'oval', 'premium', 'vitra-stone'],
  },
  {
    id: 'p018', name: 'Vitra M-Line Vanity Unit (80cm, Matte White)',
    sku: 'VT-ML-VU-80-MW', brand: 'Vitra', tier: 'premium',
    category: 'Bathroom Fittings', subCategory: 'Vanity Units',
    description: 'Wall-hung vanity 80cm with single basin cutout, 2 drawers, soft-close, matt white finish.',
    unit: 'pcs', unitPrice: 52000, costPrice: 31000, gstRate: 18,
    weight: '48kg', dimensions: '800×460×520mm', barcode: '8690506823001',
    reorderPoint: 2, leadTimeDays: 21,
    status: 'in_stock', totalStock: 5,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 5, reserved: 1 },
    ],
    tags: ['vanity', 'matt-white', 'wall-hung', '80cm'],
  },

  // ══ KOHLER ═════════════════════════════════════════════════════════════════
  {
    id: 'p019', name: 'Kohler Archer Wall-Hung WC (White)',
    sku: 'KOH-WC-AWH-WH', brand: 'Kohler', tier: 'luxury',
    category: 'Sanitary Ware', subCategory: 'WC & Toilets',
    description: 'Wall-hung WC, dual flush 3/6L, ReadyLatch quick-release seat, concealed cistern compatible.',
    unit: 'pcs', unitPrice: 42500, costPrice: 25500, gstRate: 18,
    weight: '28kg', dimensions: '540×370×400mm', barcode: '0043261601001',
    reorderPoint: 4, leadTimeDays: 14,
    status: 'in_stock', totalStock: 12,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 2, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 10, reserved: 3 },
    ],
    tags: ['wall-hung', 'readylatch', 'dual-flush'],
  },
  {
    id: 'p020', name: 'Kohler Veil Freestanding Bathtub (White, 1700mm)',
    sku: 'KOH-BT-VEIL-WH', brand: 'Kohler', tier: 'luxury',
    category: 'Bathroom Fittings', subCategory: 'Bathtubs',
    description: 'Freestanding acrylic soaking tub, 1700mm, pre-drilled for Kohler floor-mount filler. Sculptural oval form.',
    unit: 'pcs', unitPrice: 185000, costPrice: 110000, gstRate: 18,
    weight: '42kg', dimensions: '1700×750×580mm', barcode: '0043261712001',
    reorderPoint: 1, leadTimeDays: 21,
    status: 'low_stock', totalStock: 2,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 2, reserved: 1 },
    ],
    tags: ['freestanding', 'ultra-luxury', 'sculptural'],
  },
  {
    id: 'p021', name: 'Kohler Reach Thermostatic Shower System (Chrome)',
    sku: 'KOH-SS-REACH-CH', brand: 'Kohler', tier: 'luxury',
    category: 'Bathroom Fittings', subCategory: 'Shower Systems',
    description: 'Complete thermostatic system: 300mm rain head + hand shower + 3 body jets + diverter. Concealed.',
    unit: 'set', unitPrice: 95000, costPrice: 57000, gstRate: 18,
    barcode: '0043261834001', reorderPoint: 2, leadTimeDays: 21,
    status: 'low_stock', totalStock: 1,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 1, reserved: 0 },
    ],
    tags: ['thermostatic', 'body-jets', 'premium', 'complete'],
  },

  // ══ JAGUAR ═════════════════════════════════════════════════════════════════
  {
    id: 'p022', name: 'Jaguar Lyric Single-Lever Basin Mixer (Chrome)',
    sku: 'JAG-BM-LYRIC-CH', brand: 'Jaguar', tier: 'mid',
    category: 'CP Fittings', subCategory: 'Basin Mixers',
    description: 'Single-lever basin mixer, 360° swivel spout, ceramic cartridge, aerator, chrome. Popular mid-range.',
    unit: 'pcs', unitPrice: 8400, costPrice: 4900, gstRate: 18,
    dimensions: 'Spout reach 115mm', barcode: '8906012001001',
    reorderPoint: 20, leadTimeDays: 5,
    status: 'in_stock', totalStock: 68,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 12, reserved: 3 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 56, reserved: 8 },
    ],
    tags: ['best-seller', 'mid-range', 'fast-mover'],
  },
  {
    id: 'p023', name: 'Jaguar Florentine Overhead Rain Shower (300mm)',
    sku: 'JAG-OS-FLOR-300', brand: 'Jaguar', tier: 'mid',
    category: 'CP Fittings', subCategory: 'Overhead Showers',
    description: 'Round overhead shower 300mm, single function, chrome finish, with 450mm arm.',
    unit: 'set', unitPrice: 7200, costPrice: 4100, gstRate: 18,
    dimensions: 'Diameter: 300mm', barcode: '8906012045001',
    reorderPoint: 10, leadTimeDays: 5,
    status: 'in_stock', totalStock: 34,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 6, reserved: 2 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 28, reserved: 4 },
    ],
    tags: ['rain-shower', 'popular', 'chrome'],
  },
  {
    id: 'p024', name: 'Jaguar Continental Angle Cock (15mm, Chrome)',
    sku: 'JAG-AC-CONT-15', brand: 'Jaguar', tier: 'mid',
    category: 'CP Fittings', subCategory: 'Valves & Cocks',
    description: 'Brass angle valve 15mm, quarter-turn, chrome plated. For basin/WC inlet connections.',
    unit: 'pcs', unitPrice: 480, costPrice: 240, gstRate: 18,
    barcode: '8906012112001', reorderPoint: 100, leadTimeDays: 2,
    status: 'in_stock', totalStock: 320,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 40, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 280, reserved: 25 },
    ],
    tags: ['valve', 'high-volume', 'fast-mover', 'essential'],
  },
  {
    id: 'p025', name: 'Jaguar 5-in-1 Bathroom Accessories Set (Chrome)',
    sku: 'JAG-ACC-5IN1-CH', brand: 'Jaguar', tier: 'mid',
    category: 'Bathroom Accessories', subCategory: 'Accessory Sets',
    description: 'Towel bar 24" + paper holder + soap dish + glass shelf + hook, chrome, wall-mount.',
    unit: 'set', unitPrice: 5800, costPrice: 3100, gstRate: 18,
    barcode: '8906012156001', reorderPoint: 10, leadTimeDays: 5,
    status: 'in_stock', totalStock: 42,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 8, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 34, reserved: 5 },
    ],
    tags: ['accessories', '5-piece', 'value-set'],
  },

  // ══ HINDWARE ═══════════════════════════════════════════════════════════════
  {
    id: 'p026', name: 'Hindware Opus Floor-Mount WC (White)',
    sku: 'HW-WC-OPUS-WH', brand: 'Hindware', tier: 'mid',
    category: 'Sanitary Ware', subCategory: 'WC & Toilets',
    description: 'Floor-mount WC, soft-close seat, 6L single flush, UF seat, vitreous china.',
    unit: 'pcs', unitPrice: 12800, costPrice: 7400, gstRate: 18,
    weight: '22kg', dimensions: '680×360×780mm', barcode: '8901336001001',
    reorderPoint: 15, leadTimeDays: 7,
    status: 'in_stock', totalStock: 48,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 6, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 42, reserved: 8 },
    ],
    tags: ['floor-mount', 'value', 'best-seller'],
  },
  {
    id: 'p027', name: 'Hindware Calido Wall-Hung Basin (White, 550mm)',
    sku: 'HW-WB-CALI-WH', brand: 'Hindware', tier: 'mid',
    category: 'Sanitary Ware', subCategory: 'Wash Basins',
    description: 'Vitreous china wall-hung basin, overflow, single tap hole, 550mm width.',
    unit: 'pcs', unitPrice: 5600, costPrice: 3100, gstRate: 18,
    weight: '9kg', dimensions: '550×420mm', barcode: '8901336045001',
    reorderPoint: 15, leadTimeDays: 7,
    status: 'in_stock', totalStock: 36,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 6, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 30, reserved: 4 },
    ],
    tags: ['wall-hung', '550mm', 'value'],
  },
  {
    id: 'p028', name: 'Hindware LED Backlit Mirror (800×600mm)',
    sku: 'HW-MIR-LED-800', brand: 'Hindware', tier: 'mid',
    category: 'Bathroom Accessories', subCategory: 'Mirrors',
    description: 'Rectangular LED backlit mirror, IP44, anti-fog coating, touch dimmer, CCT adjustable.',
    unit: 'pcs', unitPrice: 12500, costPrice: 7200, gstRate: 18,
    dimensions: '800×600×40mm', barcode: '8901336089001',
    reorderPoint: 5, leadTimeDays: 10,
    status: 'in_stock', totalStock: 14,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 3, reserved: 1 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 11, reserved: 0 },
    ],
    tags: ['led', 'anti-fog', 'touch-dimmer'],
  },

  // ══ OYSTER ═════════════════════════════════════════════════════════════════
  {
    id: 'p029', name: 'Oyster Calacatta Oro Large Format Tile (1200×600)',
    sku: 'OYS-CAL-LF-1200', brand: 'Oyster', tier: 'premium',
    category: 'Tiles', subCategory: 'Large Format Tiles',
    description: 'Polished porcelain, Calacatta Oro marble pattern, book-matched rectified. For walls & floors.',
    unit: 'box', unitPrice: 4800, costPrice: 2900, gstRate: 28,
    dimensions: '1200×600mm, 2 pcs/box, 1.44 sqm/box', barcode: '8907890001001',
    reorderPoint: 20, leadTimeDays: 7,
    status: 'in_stock', totalStock: 120,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 120, reserved: 36 },
    ],
    tags: ['calacatta', 'large-format', 'polished', 'book-match'],
  },
  {
    id: 'p030', name: 'Oyster Nero Marquina Matte Floor Tile (800×800)',
    sku: 'OYS-NM-MT-800', brand: 'Oyster', tier: 'premium',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Full-body porcelain, Nero Marquina black marble look, matte finish, R10 anti-slip.',
    unit: 'box', unitPrice: 3600, costPrice: 2100, gstRate: 28,
    dimensions: '800×800mm, 2 pcs/box, 1.28 sqm/box', barcode: '8907890045001',
    reorderPoint: 15, leadTimeDays: 7,
    status: 'in_stock', totalStock: 88,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 88, reserved: 20 },
    ],
    tags: ['nero-marquina', 'black', 'full-body', 'r10'],
  },
  {
    id: 'p031', name: 'Oyster Statuario Venato Glossy Wall Tile (600×300)',
    sku: 'OYS-STV-GL-600', brand: 'Oyster', tier: 'premium',
    category: 'Tiles', subCategory: 'Wall Tiles',
    description: 'Glossy ceramic, Statuario Venato white marble effect, suitable for bathroom feature walls.',
    unit: 'box', unitPrice: 1980, costPrice: 1150, gstRate: 28,
    dimensions: '600×300mm, 8 pcs/box, 1.44 sqm/box', barcode: '8907890089001',
    reorderPoint: 25, leadTimeDays: 5,
    status: 'in_stock', totalStock: 154,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 154, reserved: 32 },
    ],
    tags: ['statuario', 'glossy', 'feature-wall', 'popular'],
  },
  {
    id: 'p032', name: 'Oyster Grigio Concrete Effect Tile (600×600)',
    sku: 'OYS-GR-CON-600', brand: 'Oyster', tier: 'premium',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Porcelain, textured concrete look, warm grey tone, anti-slip R11. Ideal for living/bathroom.',
    unit: 'box', unitPrice: 2400, costPrice: 1400, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box, 1.44 sqm/box', barcode: '8907890112001',
    reorderPoint: 20, leadTimeDays: 5,
    status: 'low_stock', totalStock: 14,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 14, reserved: 0 },
    ],
    tags: ['concrete-look', 'grey', 'r11', 'living'],
  },

  // ══ QUTONE ═════════════════════════════════════════════════════════════════
  {
    id: 'p033', name: 'Qutone Calacatta Altissimo Slab (1800×900)',
    sku: 'QUT-CA-SLAB-1800', brand: 'Qutone', tier: 'premium',
    category: 'Tiles', subCategory: 'Slabs & Large Format',
    description: 'Sintered stone slab, Calacatta Altissimo pattern, 6mm thin, for walls, floors, and countertops.',
    unit: 'pcs', unitPrice: 8400, costPrice: 5200, gstRate: 28,
    dimensions: '1800×900mm, 6mm thick', barcode: '8904501001001',
    reorderPoint: 10, leadTimeDays: 10,
    status: 'in_stock', totalStock: 45,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 45, reserved: 12 },
    ],
    tags: ['slab', 'sintered-stone', 'calacatta', 'countertop', 'premium'],
  },
  {
    id: 'p034', name: 'Qutone Forest Green Terrazzo Tile (600×600)',
    sku: 'QUT-FG-TRZ-600', brand: 'Qutone', tier: 'premium',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Terrazzo-inspired porcelain, forest green base with white and gold chips, 600×600mm matt.',
    unit: 'box', unitPrice: 3200, costPrice: 1900, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box', barcode: '8904501045001',
    reorderPoint: 12, leadTimeDays: 10,
    status: 'in_stock', totalStock: 62,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 62, reserved: 8 },
    ],
    tags: ['terrazzo', 'green', 'designer', 'statement'],
  },
  {
    id: 'p035', name: 'Qutone Limra White Marble Effect Wall Tile (900×300)',
    sku: 'QUT-LW-WT-900', brand: 'Qutone', tier: 'premium',
    category: 'Tiles', subCategory: 'Wall Tiles',
    description: 'Rectified porcelain, Limra limestone texture, brushed surface, for feature walls.',
    unit: 'box', unitPrice: 2850, costPrice: 1700, gstRate: 28,
    dimensions: '900×300mm, 4 pcs/box, 1.08 sqm/box', barcode: '8904501089001',
    reorderPoint: 15, leadTimeDays: 10,
    status: 'in_stock', totalStock: 80,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 80, reserved: 16 },
    ],
    tags: ['limra', 'brushed', 'feature-wall', 'rectified'],
  },

  // ══ DIMORE ═════════════════════════════════════════════════════════════════
  {
    id: 'p036', name: 'Dimore Venezia Gold Mosaic Tile (300×300)',
    sku: 'DIM-VEN-MOS-300', brand: 'Dimore', tier: 'luxury',
    category: 'Tiles', subCategory: 'Mosaic & Decorative',
    description: 'Hand-crafted Murano glass mosaic, Venezia gold palette, Italian. For accent walls and niches.',
    unit: 'box', unitPrice: 12800, costPrice: 8000, gstRate: 28,
    dimensions: '300×300mm sheet, 11 pcs/box, 1.0 sqm/box', barcode: '8390001001001',
    reorderPoint: 5, leadTimeDays: 21,
    status: 'in_stock', totalStock: 22,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 4, reserved: 1 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 18, reserved: 3 },
    ],
    tags: ['murano-glass', 'gold', 'handcraft', 'italian', 'luxury', 'niche'],
  },
  {
    id: 'p037', name: 'Dimore Arabescato Bianco Polished Tile (800×400)',
    sku: 'DIM-AB-POL-800', brand: 'Dimore', tier: 'luxury',
    category: 'Tiles', subCategory: 'Wall Tiles',
    description: 'Italian porcelain, Arabescato Bianco marble pattern, high-gloss polished, rectified.',
    unit: 'box', unitPrice: 6800, costPrice: 4200, gstRate: 28,
    dimensions: '800×400mm, 3 pcs/box, 0.96 sqm/box', barcode: '8390001045001',
    reorderPoint: 8, leadTimeDays: 21,
    status: 'in_stock', totalStock: 38,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 38, reserved: 6 },
    ],
    tags: ['arabescato', 'polished', 'rectified', 'italian-luxury'],
  },
  {
    id: 'p038', name: 'Dimore Nero Assoluto Honed Tile (600×600)',
    sku: 'DIM-NA-HN-600', brand: 'Dimore', tier: 'luxury',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Italian porcelain, Nero Assoluto absolute black, honed matte finish, rectified. For high-end interiors.',
    unit: 'box', unitPrice: 5600, costPrice: 3400, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box, 1.44 sqm/box', barcode: '8390001089001',
    reorderPoint: 8, leadTimeDays: 21,
    status: 'low_stock', totalStock: 6,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 6, reserved: 2 },
    ],
    tags: ['black', 'honed', 'rectified', 'luxury'],
  },

  // ══ NEXION ═════════════════════════════════════════════════════════════════
  {
    id: 'p039', name: 'Nexion Granite Grey R12 Outdoor Tile (600×600)',
    sku: 'NEX-GG-R12-600', brand: 'Nexion', tier: 'mid',
    category: 'Tiles', subCategory: 'Outdoor Tiles',
    description: 'Porcelain outdoor tile, granite grey texture, R12 slip-resistance, frost-proof, pressed face.',
    unit: 'box', unitPrice: 1950, costPrice: 1150, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box, 1.44 sqm/box', barcode: '8902567001001',
    reorderPoint: 30, leadTimeDays: 5,
    status: 'in_stock', totalStock: 180,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 180, reserved: 40 },
    ],
    tags: ['outdoor', 'r12', 'frost-proof', 'terrace', 'anti-slip'],
  },
  {
    id: 'p040', name: 'Nexion Travertino Noce Outdoor Tile (450×450)',
    sku: 'NEX-TN-OUT-450', brand: 'Nexion', tier: 'mid',
    category: 'Tiles', subCategory: 'Outdoor Tiles',
    description: 'Travertino Noce pattern, R11 anti-slip, suitable for outdoor paths, pool decks.',
    unit: 'box', unitPrice: 1650, costPrice: 980, gstRate: 28,
    dimensions: '450×450mm, 6 pcs/box, 1.22 sqm/box', barcode: '8902567045001',
    reorderPoint: 25, leadTimeDays: 5,
    status: 'in_stock', totalStock: 140,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 140, reserved: 24 },
    ],
    tags: ['travertino', 'r11', 'pool-deck', 'path'],
  },
  {
    id: 'p041', name: 'Nexion TechStone Industrial Floor Tile (600×600)',
    sku: 'NEX-TS-IND-600', brand: 'Nexion', tier: 'mid',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Industrial-look full-body porcelain, cement grey, R9 anti-slip, for commercial & residential.',
    unit: 'box', unitPrice: 1450, costPrice: 860, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box', barcode: '8902567089001',
    reorderPoint: 30, leadTimeDays: 5,
    status: 'in_stock', totalStock: 220,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 220, reserved: 44 },
    ],
    tags: ['industrial', 'cement-look', 'full-body', 'commercial'],
  },

  // ══ KAJARIA ════════════════════════════════════════════════════════════════
  {
    id: 'p042', name: 'Kajaria Eternity White Ceramic Floor Tile (600×600)',
    sku: 'KAJ-FT-ETW-600', brand: 'Kajaria', tier: 'mid',
    category: 'Tiles', subCategory: 'Floor Tiles',
    description: 'Matt ceramic floor tile, anti-skid surface, high durability. Best value mid-range tile.',
    unit: 'box', unitPrice: 1450, costPrice: 920, gstRate: 28,
    dimensions: '600×600mm, 4 pcs/box, 1.44 sqm/box', barcode: '8901234100015',
    reorderPoint: 60, leadTimeDays: 3,
    status: 'in_stock', totalStock: 480,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 480, reserved: 120 },
    ],
    tags: ['anti-skid', 'best-seller', 'value', 'fast-mover'],
  },
  {
    id: 'p043', name: 'Kajaria GVT Nova Beige Vitrified Tile (800×800)',
    sku: 'KAJ-GVT-NB-800', brand: 'Kajaria', tier: 'mid',
    category: 'Tiles', subCategory: 'Vitrified Tiles',
    description: 'Glazed vitrified tile, Nova Beige, double charge, mirror polish. Popular for living areas.',
    unit: 'box', unitPrice: 2200, costPrice: 1380, gstRate: 28,
    dimensions: '800×800mm, 2 pcs/box, 1.28 sqm/box', barcode: '8901234100067',
    reorderPoint: 40, leadTimeDays: 3,
    status: 'in_stock', totalStock: 340,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 340, reserved: 80 },
    ],
    tags: ['gvt', 'mirror-polish', 'living', 'popular'],
  },
  {
    id: 'p044', name: 'Kajaria Duragres Hexa Blue-Grey Wall Tile (275×240)',
    sku: 'KAJ-HEX-BG-275', brand: 'Kajaria', tier: 'mid',
    category: 'Tiles', subCategory: 'Wall Tiles',
    description: 'Hexagonal ceramic wall tile, blue-grey matte, for feature walls and bathroom walls.',
    unit: 'box', unitPrice: 1350, costPrice: 820, gstRate: 28,
    dimensions: '275×240mm (hex), 14 pcs/box, 0.90 sqm/box', barcode: '8901234100089',
    reorderPoint: 20, leadTimeDays: 4,
    status: 'out_of_stock', totalStock: 0,
    warehouses: [],
    tags: ['hexagonal', 'feature-wall', 'blue-grey', 'trending'],
  },

  // ══ SOMANY ═════════════════════════════════════════════════════════════════
  {
    id: 'p045', name: 'Somany Duragres Infinity Ivory Vitrified Tile (800×800)',
    sku: 'SOM-VT-INF-800', brand: 'Somany', tier: 'mid',
    category: 'Tiles', subCategory: 'Vitrified Tiles',
    description: 'GVT tile, Infinity Ivory pattern, high sheen, PEI 4 hardness, for commercial and residential.',
    unit: 'box', unitPrice: 2600, costPrice: 1620, gstRate: 28,
    dimensions: '800×800mm, 2 pcs/box', barcode: '8907452001001',
    reorderPoint: 35, leadTimeDays: 4,
    status: 'in_stock', totalStock: 260,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 260, reserved: 60 },
    ],
    tags: ['gvt', 'high-sheen', 'pei4', 'commercial'],
  },
  {
    id: 'p046', name: 'Somany Mosaic Carbon Black Wall Tile (200×200)',
    sku: 'SOM-MOS-CB-200', brand: 'Somany', tier: 'mid',
    category: 'Tiles', subCategory: 'Mosaic & Decorative',
    description: 'Ceramic mosaic tile, carbon black gloss, for accent walls and shower niches.',
    unit: 'box', unitPrice: 1650, costPrice: 980, gstRate: 28,
    dimensions: '200×200mm sheets, 11 pcs/box, 0.44 sqm/box', barcode: '8907452045001',
    reorderPoint: 20, leadTimeDays: 4,
    status: 'in_stock', totalStock: 78,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 78, reserved: 10 },
    ],
    tags: ['mosaic', 'black', 'niche', 'accent'],
  },

  // ══ RAK CERAMICS ═══════════════════════════════════════════════════════════
  {
    id: 'p047', name: 'RAK Ceramics Luster Onyx Full-Body Tile (800×800)',
    sku: 'RAK-VT-ONYX-800', brand: 'RAK Ceramics', tier: 'mid',
    category: 'Tiles', subCategory: 'Vitrified Tiles',
    description: 'Full-body glazed vitrified, Luster Onyx black, 800×800mm, for luxury interiors.',
    unit: 'box', unitPrice: 3600, costPrice: 2200, gstRate: 28,
    dimensions: '800×800mm, 2 pcs/box', barcode: '6294001001001',
    reorderPoint: 20, leadTimeDays: 7,
    status: 'in_stock', totalStock: 110,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 110, reserved: 28 },
    ],
    tags: ['full-body', 'black', 'luxury', 'rak'],
  },
  {
    id: 'p048', name: 'RAK Ceramics Carrara Marble Wall Tile (600×300)',
    sku: 'RAK-WT-CARR-600', brand: 'RAK Ceramics', tier: 'mid',
    category: 'Tiles', subCategory: 'Wall Tiles',
    description: 'Ceramic wall tile, Carrara white marble pattern, gloss finish, bathroom and kitchen.',
    unit: 'box', unitPrice: 1380, costPrice: 820, gstRate: 28,
    dimensions: '600×300mm, 8 pcs/box', barcode: '6294001045001',
    reorderPoint: 30, leadTimeDays: 5,
    status: 'in_stock', totalStock: 190,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 190, reserved: 40 },
    ],
    tags: ['carrara', 'gloss', 'bathroom', 'popular'],
  },

  // ══ PREMIUM / SMART PRODUCTS ═══════════════════════════════════════════════
  {
    id: 'p049', name: 'Grohe Sensia Arena Shower Toilet (Chrome)',
    sku: 'GRH-SA-SWT-CH', brand: 'Grohe', tier: 'luxury',
    category: 'Sanitary Ware', subCategory: 'Smart Toilets',
    description: 'Smart shower toilet, integrated bidet function, dryer, heated seat, touch remote, Rimless+.',
    unit: 'pcs', unitPrice: 285000, costPrice: 168000, gstRate: 18,
    barcode: '4005176998001', reorderPoint: 1, leadTimeDays: 28,
    status: 'in_stock', totalStock: 2,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 1, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 1, reserved: 0 },
    ],
    tags: ['smart-toilet', 'bidet', 'luxury', 'heated-seat'],
  },
  {
    id: 'p050', name: 'Vitra Neon Smart WC with Bidet Function',
    sku: 'VT-NEON-SWT-WH', brand: 'Vitra', tier: 'premium',
    category: 'Sanitary Ware', subCategory: 'Smart Toilets',
    description: 'Integrated smart WC, bidet, dryer, rimless AquaBlade, remote + app control.',
    unit: 'pcs', unitPrice: 148000, costPrice: 88000, gstRate: 18,
    barcode: '8690506901001', reorderPoint: 1, leadTimeDays: 21,
    status: 'out_of_stock', totalStock: 0,
    warehouses: [],
    tags: ['smart-toilet', 'bidet', 'app-control', 'aquablade'],
  },
  {
    id: 'p051', name: 'Hansgrohe uBox Concealed Installation Box (Universal)',
    sku: 'HG-UBX-CONC-UNI', brand: 'Hansgrohe', tier: 'premium',
    category: 'CP Fittings', subCategory: 'Concealed Bodies',
    description: 'Universal concealed installation box for Hansgrohe / Axor mixers. Compatible with all rough-in valves.',
    unit: 'pcs', unitPrice: 8400, costPrice: 5000, gstRate: 18,
    barcode: '4011097890001', reorderPoint: 10, leadTimeDays: 14,
    status: 'in_stock', totalStock: 24,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 24, reserved: 4 },
    ],
    tags: ['concealed', 'installation-box', 'rough-in', 'universal'],
  },
  {
    id: 'p052', name: 'Geberit Duofix Element (Wall-Hung WC, H114)',
    sku: 'GEB-DF-WHC-114', brand: 'Geberit', tier: 'premium',
    category: 'Sanitary Ware', subCategory: 'Concealed Cisterns',
    description: 'Wall-hung WC installation frame + concealed Sigma 12cm cistern + flush plate. Complete unit.',
    unit: 'set', unitPrice: 32000, costPrice: 19000, gstRate: 18,
    dimensions: 'H: 1140mm (adjustable 820–1020mm WC position)', barcode: '7611913001001',
    reorderPoint: 5, leadTimeDays: 14,
    status: 'in_stock', totalStock: 16,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 16, reserved: 4 },
    ],
    tags: ['geberit', 'concealed-cistern', 'installation-frame', 'sigma'],
  },
  {
    id: 'p053', name: 'Jaguar Bottle Trap (32mm, Chrome)',
    sku: 'JAG-BT-32-CH', brand: 'Jaguar', tier: 'mid',
    category: 'Bathroom Accessories', subCategory: 'Waste Fittings',
    description: 'Chrome bottle trap, 32mm, P-trap, for wall-hung basins.',
    unit: 'pcs', unitPrice: 680, costPrice: 340, gstRate: 18,
    barcode: '8906012200001', reorderPoint: 50, leadTimeDays: 2,
    status: 'in_stock', totalStock: 145,
    warehouses: [
      { warehouseId: 'w1', warehouseName: 'Showroom — Andheri', quantity: 25, reserved: 0 },
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 120, reserved: 15 },
    ],
    tags: ['bottle-trap', 'waste', 'chrome', 'fast-mover'],
  },
  {
    id: 'p054', name: 'Nexion Tile Adhesive C1T (20kg)',
    sku: 'NEX-TA-C1T-20', brand: 'Nexion', tier: 'mid',
    category: 'Installation Materials', subCategory: 'Adhesives',
    description: 'Cementitious tile adhesive C1T, suitable for ceramic, porcelain, vitrified tiles. Interior use.',
    unit: 'box', unitPrice: 480, costPrice: 280, gstRate: 18,
    dimensions: '20kg per bag', barcode: '8902567200001',
    reorderPoint: 50, leadTimeDays: 2,
    status: 'in_stock', totalStock: 280,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 280, reserved: 40 },
    ],
    tags: ['adhesive', 'c1t', 'installation', 'fast-mover'],
  },
  {
    id: 'p055', name: 'Nexion Epoxy Grout (2kg, Pearl White)',
    sku: 'NEX-EG-PW-2', brand: 'Nexion', tier: 'mid',
    category: 'Installation Materials', subCategory: 'Grouts',
    description: '2-component epoxy grout, Pearl White, stain-resistant, for joints 2–20mm. Premium finish.',
    unit: 'pcs', unitPrice: 820, costPrice: 480, gstRate: 18,
    dimensions: '2kg kit (resin + hardener)', barcode: '8902567245001',
    reorderPoint: 30, leadTimeDays: 2,
    status: 'in_stock', totalStock: 96,
    warehouses: [
      { warehouseId: 'w2', warehouseName: 'Main Godown', quantity: 96, reserved: 12 },
    ],
    tags: ['epoxy-grout', 'stain-resistant', 'premium', 'installation'],
  },
]

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const warehouses: Warehouse[] = [
  {
    id: 'w1',
    name: 'Showroom & Experience Centre',
    shortName: 'Showroom — Andheri',
    type: 'showroom',
    address: 'Plot 12, MIDC Road, Andheri East, Mumbai 400093',
    city: 'Mumbai', state: 'Maharashtra',
    manager: { name: 'Suresh Iyer', initials: 'SI', color: '#0071E3' },
    phone: '+91 22 6789 0123',
    totalSKUs: 28,
    totalUnits: 212,
    totalValue: 4820000,
    utilization: 55,
    color: '#0071E3',
    notes: 'Display stock only. Showroom open Mon–Sat 10AM–7PM. All Grohe, Axor, Hansgrohe, Vitra, Kohler display units here.',
  },
  {
    id: 'w2',
    name: 'Main Godown — Bhiwandi',
    shortName: 'Main Godown',
    type: 'godown',
    address: 'Shed 7-B, Transport Nagar, Bhiwandi, Thane 421302',
    city: 'Bhiwandi', state: 'Maharashtra',
    manager: { name: 'Ramesh Pawar', initials: 'RP', color: '#7C3AED' },
    phone: '+91 98210 44456',
    totalSKUs: 55,
    totalUnits: 5180,
    totalValue: 28400000,
    utilization: 84,
    color: '#7C3AED',
    notes: 'Primary bulk storage. 84% utilization — reorder planning needed. Tiles take up 60% of space.',
  },
  {
    id: 'w3',
    name: 'Dispatch Hub — Navi Mumbai',
    shortName: 'Dispatch Hub',
    type: 'dispatch',
    address: 'Unit 4, TTC Industrial Area, Mahape, Navi Mumbai 400710',
    city: 'Navi Mumbai', state: 'Maharashtra',
    manager: { name: 'Deepa Kulkarni', initials: 'DK', color: '#059669' },
    phone: '+91 22 2778 5500',
    totalSKUs: 18,
    totalUnits: 640,
    totalValue: 5200000,
    utilization: 38,
    color: '#059669',
    notes: 'Staging for dispatches. Large project deliveries consolidate here before site delivery.',
  },
]

// ─── Stock Movements ──────────────────────────────────────────────────────────

export const movements: StockMovement[] = [
  {
    id: 'mv001', type: 'IN',
    productId: 'p001', productName: 'Grohe Essence Single-Lever Basin Mixer', sku: 'GRH-ES-BM-CH',
    fromWarehouseId: null, fromWarehouseName: null,
    toWarehouseId: 'w2', toWarehouseName: 'Main Godown',
    quantity: 10, reference: 'PO-2025-0112',
    reason: 'Stock replenishment from Grohe India',
    performedBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*2),
  },
  {
    id: 'mv002', type: 'OUT',
    productId: 'p022', productName: 'Jaguar Lyric Single-Lever Basin Mixer', sku: 'JAG-BM-LYRIC-CH',
    fromWarehouseId: 'w2', fromWarehouseName: 'Main Godown',
    toWarehouseId: null, toWarehouseName: null,
    quantity: 24, reference: 'SO-2025-0048',
    reason: 'Lodha Palava Phase 7 delivery',
    performedBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*1),
  },
  {
    id: 'mv003', type: 'TRANSFER',
    productId: 'p001', productName: 'Grohe Essence Single-Lever Basin Mixer', sku: 'GRH-ES-BM-CH',
    fromWarehouseId: 'w2', fromWarehouseName: 'Main Godown',
    toWarehouseId: 'w1', toWarehouseName: 'Showroom — Andheri',
    quantity: 4, reference: 'TRF-2025-0034',
    reason: 'Showroom display replenishment',
    performedBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*24*3),
  },
  {
    id: 'mv004', type: 'IN',
    productId: 'p042', productName: 'Kajaria Eternity White Ceramic Floor Tile', sku: 'KAJ-FT-ETW-600',
    fromWarehouseId: null, fromWarehouseName: null,
    toWarehouseId: 'w2', toWarehouseName: 'Main Godown',
    quantity: 120, reference: 'PO-2025-0115',
    reason: 'Bulk tile restock for Rajesh Constructions order',
    performedBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*5),
  },
  {
    id: 'mv005', type: 'ADJUST',
    productId: 'p004', productName: 'Grohe Rainshower 310 Overhead Shower', sku: 'GRH-RS-310-CH',
    fromWarehouseId: 'w2', fromWarehouseName: 'Main Godown',
    toWarehouseId: 'w2', toWarehouseName: 'Main Godown',
    quantity: -1, reference: 'ADJ-2025-0008',
    reason: 'Damaged unit — write off',
    performedBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*48),
  },
  {
    id: 'mv006', type: 'OUT',
    productId: 'p026', productName: 'Hindware Opus Floor-Mount WC', sku: 'HW-WC-OPUS-WH',
    fromWarehouseId: 'w2', fromWarehouseName: 'Main Godown',
    toWarehouseId: null, toWarehouseName: null,
    quantity: 12, reference: 'SO-2025-0044',
    reason: 'KD Building Works — Thane Housing Society',
    performedBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*4),
  },
  {
    id: 'mv007', type: 'RETURN',
    productId: 'p023', productName: 'Jaguar Florentine Overhead Rain Shower', sku: 'JAG-OS-FLOR-300',
    fromWarehouseId: null, fromWarehouseName: null,
    toWarehouseId: 'w2', toWarehouseName: 'Main Godown',
    quantity: 2, reference: 'RTN-2025-0003',
    reason: 'Customer return — size mismatch',
    performedBy: 'Suresh Iyer',
    createdAt: new Date(Date.now() - 1000*60*60*24*5),
  },
  {
    id: 'mv008', type: 'IN',
    productId: 'p010', productName: 'Axor Starck Single-Lever Basin Mixer 80', sku: 'AX-SK-BM80-CH',
    fromWarehouseId: null, fromWarehouseName: null,
    toWarehouseId: 'w2', toWarehouseName: 'Main Godown',
    quantity: 3, reference: 'PO-2025-0098',
    reason: 'Axor import consignment — Mumbai customs cleared',
    performedBy: 'Ramesh Pawar',
    createdAt: new Date(Date.now() - 1000*60*60*24*7),
  },
]
