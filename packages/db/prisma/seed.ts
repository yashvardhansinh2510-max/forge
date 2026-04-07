import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Dev user
  await prisma.user.upsert({
    where: { id: 'dev-user-001' }, update: {},
    create: { id: 'dev-user-001', name: 'Dev User', email: 'dev@forge.local', role: 'ADMIN' },
  })

  // 2. Companies (4 customers)
  const companies = [
    { id: 'comp-001', name: 'Oberoi Residences', industry: 'Luxury Residential',   address: 'Worli Sea Face, Mumbai 400030' },
    { id: 'comp-002', name: 'The Grand Hotel',   industry: 'Hospitality',           address: 'Ballard Estate, Mumbai 400001' },
    { id: 'comp-003', name: 'Taj Suites',        industry: 'Hospitality',           address: 'Apollo Bunder, Mumbai 400001' },
    { id: 'comp-004', name: 'Lodha Altamount',   industry: 'Real Estate Developer', address: 'Altamount Road, Mumbai 400026' },
  ]
  for (const c of companies) {
    await prisma.company.upsert({ where: { id: c.id }, update: {}, create: c })
  }
  console.log('  Companies:', companies.length)

  // 3. Projects
  const projects = [
    { id: 'proj-001', clientName: 'Oberoi Residences', companyId: 'comp-001', siteAddress: 'Worli Sea Face Tower A, Mumbai 400030', architectName: 'Hafeez Contractor' },
    { id: 'proj-002', clientName: 'The Grand Hotel',   companyId: 'comp-002', siteAddress: 'Ballard Estate, Fort, Mumbai 400001',   architectName: 'Studio Lotus' },
    { id: 'proj-003', clientName: 'Showroom Stock',    companyId: null,       siteAddress: null,                                    architectName: null },
    { id: 'proj-004', clientName: 'Rajesh Shah',       companyId: null,       siteAddress: 'Bandra West, Mumbai 400050',            architectName: 'Mehta Architects' },
    { id: 'proj-005', clientName: 'Lodha Altamount',   companyId: 'comp-004', siteAddress: 'Altamount Road, Tardeo, Mumbai 400026', architectName: 'Pei Cobb Freed & Partners' },
    { id: 'proj-006', clientName: 'Taj Suites',        companyId: 'comp-003', siteAddress: 'Apollo Bunder, Colaba, Mumbai 400001',  architectName: 'Bentel Associates' },
    { id: 'proj-007', clientName: 'Arjun Kapoor',      companyId: null,       siteAddress: 'Andheri West, Mumbai 400053',           architectName: 'A+D Design' },
  ]
  for (const p of projects) {
    await prisma.project.upsert({ where: { id: p.id }, update: {}, create: p })
  }
  console.log('  Projects:', projects.length)

  // 4. Products (11)
  const products = [
    { id: 'grh-rain-310', brand: 'GROHE'     as const, category: 'SHOWERS'     as const, sku: 'GRH-RAIN-310',  name: 'Rainshower 310 SmartActive',      mrp: 46200 },
    { id: 'grh-euphoria',  brand: 'GROHE'     as const, category: 'SHOWERS'     as const, sku: 'GRH-EUPH-260',  name: 'Euphoria System 260',             mrp: 33880 },
    { id: 'hgr-raindance', brand: 'HANSGROHE' as const, category: 'SHOWERS'     as const, sku: 'HGR-RD-E300',   name: 'Raindance E 300 AI',              mrp: 52800 },
    { id: 'vtr-s50-wc',    brand: 'VITRA'     as const, category: 'WCS'         as const, sku: 'VTR-S50-RWC',   name: 'S50 Rimless WC',                  mrp: 18500 },
    { id: 'axr-montreux',  brand: 'AXOR'      as const, category: 'FAUCETS'     as const, sku: 'AXR-MNTRX-SL',  name: 'Axor Montreux Single Lever',      mrp: 52000 },
    { id: 'axr-citterio',  brand: 'AXOR'      as const, category: 'THERMOSTATS' as const, sku: 'AXR-CTR-THERM', name: 'Axor Citterio Thermostatic',      mrp: 92000 },
    { id: 'gbr-sigma',     brand: 'GEBERIT'   as const, category: 'CONCEALED'   as const, sku: 'GBR-SIGMA-CC',  name: 'Geberit Sigma Concealed Cistern', mrp: 42000 },
    { id: 'hgr-select-e',  brand: 'HANSGROHE' as const, category: 'SHOWERS'     as const, sku: 'HGR-SEL-E300',  name: 'Hansgrohe Select E 300 3jet',     mrp: 68000 },
    { id: 'vtr-frame-wc',  brand: 'VITRA'     as const, category: 'WCS'         as const, sku: 'VTR-FRAME-WCS', name: 'Vitra Frame WC + Seat',           mrp: 32000 },
    { id: 'vtr-sento',     brand: 'VITRA'     as const, category: 'BASINS'      as const, sku: 'VTR-SENTO-55',  name: 'Vitra Sento Basin 55cm',          mrp: 11000 },
    { id: 'grh-feel',      brand: 'GROHE'     as const, category: 'KITCHEN'     as const, sku: 'GRH-FEEL-KIT',  name: 'Grohe Feel Kitchen Mixer',        mrp: 56000 },
  ]
  for (const p of products) {
    await prisma.product.upsert({ where: { id: p.id }, update: {}, create: p })
  }
  console.log('  Products:', products.length)

  // 5. Locked quotations (no PO yet — shows in "Ready to Order" banner)
  // Quotation 1 → Oberoi Residences
  await prisma.quotation.upsert({
    where: { id: 'quot-001' }, update: {},
    create: { id: 'quot-001', number: 'Q-2026-0001', projectId: 'proj-001', createdById: 'dev-user-001', currentStatus: 'LOCKED' },
  })
  await prisma.quotationRevision.upsert({
    where: { id: 'rev-001' }, update: {},
    create: { id: 'rev-001', quotationId: 'quot-001', revisionNumber: 0, status: 'LOCKED', isLocked: true, lockedAt: new Date('2026-03-25T10:00:00Z'), globalDiscountPct: 10 },
  })
  await prisma.quotationRoom.upsert({ where: { id: 'room-001a' }, update: {}, create: { id: 'room-001a', revisionId: 'rev-001', roomName: 'Master Bathroom', order: 0 } })
  await prisma.quotationRoom.upsert({ where: { id: 'room-001b' }, update: {}, create: { id: 'room-001b', revisionId: 'rev-001', roomName: 'Guest Bathroom',  order: 1 } })
  const qItems1 = [
    { id: 'qi-001', roomId: 'room-001a', productId: 'grh-rain-310', quantity: 2, mrp: 46200, discountPct: 10, offerRate: 41580, totalOffer: 83160 },
    { id: 'qi-002', roomId: 'room-001a', productId: 'axr-montreux',  quantity: 2, mrp: 52000, discountPct: 10, offerRate: 46800, totalOffer: 93600 },
    { id: 'qi-003', roomId: 'room-001a', productId: 'gbr-sigma',     quantity: 1, mrp: 42000, discountPct: 10, offerRate: 37800, totalOffer: 37800 },
    { id: 'qi-004', roomId: 'room-001b', productId: 'vtr-s50-wc',   quantity: 2, mrp: 18500, discountPct: 10, offerRate: 16650, totalOffer: 33300 },
    { id: 'qi-005', roomId: 'room-001b', productId: 'vtr-sento',     quantity: 2, mrp: 11000, discountPct: 10, offerRate: 9900,  totalOffer: 19800 },
  ]
  for (const qi of qItems1) {
    await prisma.quotationItem.upsert({ where: { id: qi.id }, update: {}, create: qi })
  }

  // Quotation 2 → Lodha Altamount
  await prisma.quotation.upsert({
    where: { id: 'quot-002' }, update: {},
    create: { id: 'quot-002', number: 'Q-2026-0002', projectId: 'proj-005', createdById: 'dev-user-001', currentStatus: 'LOCKED' },
  })
  await prisma.quotationRevision.upsert({
    where: { id: 'rev-002' }, update: {},
    create: { id: 'rev-002', quotationId: 'quot-002', revisionNumber: 0, status: 'LOCKED', isLocked: true, lockedAt: new Date('2026-03-28T14:00:00Z'), globalDiscountPct: 12 },
  })
  await prisma.quotationRoom.upsert({ where: { id: 'room-002a' }, update: {}, create: { id: 'room-002a', revisionId: 'rev-002', roomName: 'Penthouse Suite', order: 0 } })
  await prisma.quotationRoom.upsert({ where: { id: 'room-002b' }, update: {}, create: { id: 'room-002b', revisionId: 'rev-002', roomName: 'Guest Suites',    order: 1 } })
  const qItems2 = [
    { id: 'qi-006', roomId: 'room-002a', productId: 'axr-citterio',  quantity: 2, mrp: 92000, discountPct: 12, offerRate: 80960, totalOffer: 161920 },
    { id: 'qi-007', roomId: 'room-002a', productId: 'axr-montreux',  quantity: 2, mrp: 52000, discountPct: 12, offerRate: 45760, totalOffer: 91520  },
    { id: 'qi-008', roomId: 'room-002b', productId: 'hgr-raindance', quantity: 3, mrp: 52800, discountPct: 12, offerRate: 46464, totalOffer: 139392 },
    { id: 'qi-009', roomId: 'room-002b', productId: 'gbr-sigma',     quantity: 2, mrp: 42000, discountPct: 12, offerRate: 36960, totalOffer: 73920  },
  ]
  for (const qi of qItems2) {
    await prisma.quotationItem.upsert({ where: { id: qi.id }, update: {}, create: qi })
  }
  console.log('  Quotations: 2 (LOCKED, pending PO creation)')

  // 6. Purchase Orders + 15 Line Items
  type LineInput = {
    id: string; productId: string; qtyOrdered: number; qtyReceived: number
    qtyPendingCo: number; qtyPendingDist: number; qtyAtGodown: number
    qtyInBox: number; qtyDispatched: number; qtyNotDisplayed: number
    landingCost: number | null; clientOfferRate: number | null
    status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED'
    followUpStatus?: string
  }
  const pos: Array<{
    id: string; poNumber: string; mode: 'PROJECT_LINKED' | 'BULK_COMPANY'
    status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED'
    projectId: string | null; vendorName: string | null
    expectedDelivery: Date | null; notes: string; createdAt: Date
    lineItems: LineInput[]
  }> = [
    {
      id: 'po-001', poNumber: 'PO-2026-0001', mode: 'PROJECT_LINKED', status: 'SUBMITTED',
      projectId: 'proj-001', vendorName: 'GROHE', expectedDelivery: new Date('2026-04-15'),
      notes: 'Priority — client moving April end', createdAt: new Date('2026-03-10T10:00:00Z'),
      lineItems: [
        { id: 'line-001', productId: 'grh-rain-310', qtyOrdered: 2, qtyReceived: 1, qtyPendingCo: 1, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 36000, clientOfferRate: 46200, status: 'PARTIALLY_RECEIVED' },
        { id: 'line-002', productId: 'grh-euphoria',  qtyOrdered: 1, qtyReceived: 1, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 28000, clientOfferRate: 33880, status: 'FULLY_RECEIVED', followUpStatus: 'AWAITING' },
      ],
    },
    {
      id: 'po-002', poNumber: 'PO-2026-0002', mode: 'PROJECT_LINKED', status: 'DRAFT',
      projectId: 'proj-002', vendorName: 'HANSGROHE', expectedDelivery: new Date('2026-05-01'),
      notes: '', createdAt: new Date('2026-03-18T09:00:00Z'),
      lineItems: [
        { id: 'line-003', productId: 'hgr-raindance', qtyOrdered: 3, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 41000, clientOfferRate: 52800, status: 'PENDING' },
        { id: 'line-012', productId: 'gbr-sigma',     qtyOrdered: 2, qtyReceived: 0, qtyPendingCo: 0, qtyPendingDist: 1, qtyAtGodown: 1, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 33000, clientOfferRate: 42000, status: 'PENDING' },
      ],
    },
    {
      id: 'po-003', poNumber: 'PO-2026-0003', mode: 'BULK_COMPANY', status: 'FULLY_RECEIVED',
      projectId: null, vendorName: 'VITRA', expectedDelivery: new Date('2026-03-01'),
      notes: 'Showroom replenishment', createdAt: new Date('2026-02-20T08:00:00Z'),
      lineItems: [
        { id: 'line-004', productId: 'vtr-s50-wc', qtyOrdered: 5, qtyReceived: 5, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 3, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 18500, clientOfferRate: null, status: 'FULLY_RECEIVED' },
      ],
    },
    {
      id: 'po-004', poNumber: 'PO-2026-0004', mode: 'PROJECT_LINKED', status: 'PARTIALLY_RECEIVED',
      projectId: 'proj-005', vendorName: 'AXOR', expectedDelivery: new Date('2026-04-20'),
      notes: 'Master bath + guest bath', createdAt: new Date('2026-03-01T11:00:00Z'),
      lineItems: [
        { id: 'line-005', productId: 'axr-montreux', qtyOrdered: 4, qtyReceived: 2, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 2, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 38500, clientOfferRate: 52000, status: 'PARTIALLY_RECEIVED' },
        { id: 'line-006', productId: 'axr-citterio', qtyOrdered: 2, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 68000, clientOfferRate: 92000, status: 'PENDING' },
        { id: 'line-013', productId: 'vtr-sento',    qtyOrdered: 6, qtyReceived: 4, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 3, qtyInBox: 2, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 9000,  clientOfferRate: 11000, status: 'PARTIALLY_RECEIVED', followUpStatus: 'INSTALLED' },
      ],
    },
    {
      id: 'po-005', poNumber: 'PO-2026-0005', mode: 'PROJECT_LINKED', status: 'SUBMITTED',
      projectId: 'proj-005', vendorName: 'GEBERIT', expectedDelivery: new Date('2026-04-28'),
      notes: 'Concealed cisterns — 3 bathrooms', createdAt: new Date('2026-03-05T14:00:00Z'),
      lineItems: [
        { id: 'line-007', productId: 'gbr-sigma', qtyOrdered: 3, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 31500, clientOfferRate: 42000, status: 'PENDING' },
      ],
    },
    {
      id: 'po-006', poNumber: 'PO-2026-0006', mode: 'PROJECT_LINKED', status: 'SUBMITTED',
      projectId: 'proj-006', vendorName: 'HANSGROHE', expectedDelivery: new Date('2026-05-10'),
      notes: '6 premium suites', createdAt: new Date('2026-03-15T10:30:00Z'),
      lineItems: [
        { id: 'line-008', productId: 'hgr-select-e', qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 5, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 52000, clientOfferRate: 68000, status: 'PENDING' },
        { id: 'line-014', productId: 'grh-feel',      qtyOrdered: 3, qtyReceived: 3, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 1, qtyDispatched: 2, qtyNotDisplayed: 0, landingCost: 44000, clientOfferRate: 56000, status: 'FULLY_RECEIVED', followUpStatus: 'SNAGGING' },
      ],
    },
    {
      id: 'po-007', poNumber: 'PO-2026-0007', mode: 'PROJECT_LINKED', status: 'DRAFT',
      projectId: 'proj-006', vendorName: 'VITRA', expectedDelivery: null,
      notes: '', createdAt: new Date('2026-03-20T16:00:00Z'),
      lineItems: [
        { id: 'line-009', productId: 'vtr-frame-wc', qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 6, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 24000, clientOfferRate: 32000, status: 'PENDING' },
        { id: 'line-010', productId: 'vtr-sento',    qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 4, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 8500,  clientOfferRate: 11000, status: 'PENDING' },
      ],
    },
    {
      id: 'po-008', poNumber: 'PO-2026-0008', mode: 'PROJECT_LINKED', status: 'FULLY_RECEIVED',
      projectId: 'proj-002', vendorName: 'GROHE', expectedDelivery: new Date('2026-03-10'),
      notes: 'Kitchen & utility fittings', createdAt: new Date('2026-02-15T08:00:00Z'),
      lineItems: [
        { id: 'line-011', productId: 'grh-feel',     qtyOrdered: 1, qtyReceived: 1, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 44000, clientOfferRate: 56000, status: 'FULLY_RECEIVED', followUpStatus: 'AWAITING' },
        { id: 'line-015', productId: 'grh-euphoria', qtyOrdered: 2, qtyReceived: 2, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 2, qtyNotDisplayed: 0, landingCost: 26000, clientOfferRate: 33880, status: 'FULLY_RECEIVED', followUpStatus: 'INSTALLED' },
      ],
    },
  ]

  for (const po of pos) {
    const { lineItems, ...poData } = po
    await prisma.purchaseOrder.upsert({ where: { id: po.id }, update: {}, create: poData })
    for (const li of lineItems) {
      await prisma.pOLineItem.upsert({ where: { id: li.id }, update: {}, create: { ...li, poId: po.id } })
    }
  }
  const totalLines = pos.reduce((s, po) => s + po.lineItems.length, 0)
  console.log(`  POs: ${pos.length}  Line Items: ${totalLines}`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
