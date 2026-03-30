// packages/db/prisma/seed.ts
// Seeds the PostgreSQL database with mock procurement data matching procurement-data.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create a dev user (required for foreign keys)
  const user = await prisma.user.upsert({
    where: { id: 'dev-user-001' },
    update: {},
    create: {
      id: 'dev-user-001',
      name: 'Dev User',
      email: 'dev@forge.local',
      role: 'ADMIN',
    },
  })
  console.log('  User:', user.id)

  // 2. Create projects (matching MOCK_CUSTOMERS ids)
  const projects = [
    { id: 'proj-001', clientName: 'Rajesh Smith', siteAddress: 'Flat 12B, Sea View Tower, Bandra West, Mumbai 400050', architectName: 'Mehta Architects' },
    { id: 'proj-002', clientName: 'Suresh Mehta', siteAddress: 'Penthouse 40F, One Avighna Park, Lower Parel, Mumbai 400013', architectName: 'Studio Lotus' },
    { id: 'proj-003', clientName: 'Vikram Oberoi', siteAddress: '12th Floor, Oberoi Heights, Goregaon West, Mumbai 400104', architectName: 'Hafeez Contractor' },
    { id: 'proj-004', clientName: 'Priya Shah', siteAddress: 'B-402, Sea Breeze Apartments, Juhu Tara Road, Mumbai 400049', architectName: 'Studio i.d.e.a' },
    { id: 'proj-005', clientName: 'Lodha Group', siteAddress: 'Tower A, Lodha Altamount, Tardeo, Mumbai 400034', architectName: 'Pei Cobb Freed & Partners' },
    { id: 'proj-006', clientName: 'Prestige Realty', siteAddress: 'G Block, Bandra Kurla Complex, Mumbai 400051', architectName: 'Hafeez Contractor' },
    { id: 'proj-007', clientName: 'Arjun Kapoor', siteAddress: 'D-1501, Westwind Heights, Andheri West, Mumbai 400053', architectName: 'A+D Design Studio' },
  ]

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    })
  }
  console.log('  Projects:', projects.length)

  // 3. Create products (matching mock line items)
  const products = [
    { id: 'grh-rain-310', brand: 'GROHE' as const, category: 'SHOWERS' as const, sku: 'GRH-RAIN-310', name: 'Rainshower 310 SmartActive', mrp: 46200 },
    { id: 'grh-euphoria', brand: 'GROHE' as const, category: 'SHOWERS' as const, sku: 'GRH-EUPH-260', name: 'Euphoria System 260', mrp: 33880 },
    { id: 'hgr-raindance-e', brand: 'HANSGROHE' as const, category: 'SHOWERS' as const, sku: 'HGR-RD-E300', name: 'Raindance E 300 AI', mrp: 52800 },
    { id: 'vtr-s50-wc', brand: 'VITRA' as const, category: 'WCS' as const, sku: 'VTR-S50-RWC', name: 'S50 Rimless WC', mrp: 18500 },
    { id: 'axr-montreux', brand: 'AXOR' as const, category: 'FAUCETS' as const, sku: 'AXR-MNTRX-SL', name: 'Axor Montreux Single Lever', mrp: 52000 },
    { id: 'axr-citterio', brand: 'AXOR' as const, category: 'THERMOSTATS' as const, sku: 'AXR-CTR-THERM', name: 'Axor Citterio Thermostatic', mrp: 92000 },
    { id: 'gbr-sigma', brand: 'GEBERIT' as const, category: 'CONCEALED' as const, sku: 'GBR-SIGMA-CC', name: 'Geberit Sigma Concealed Cistern', mrp: 42000 },
    { id: 'hgr-select-e', brand: 'HANSGROHE' as const, category: 'SHOWERS' as const, sku: 'HGR-SEL-E300', name: 'Hansgrohe Select E 300 3jet', mrp: 68000 },
    { id: 'vtr-frame-wc', brand: 'VITRA' as const, category: 'WCS' as const, sku: 'VTR-FRAME-WCS', name: 'Vitra Frame WC + Seat', mrp: 32000 },
    { id: 'vtr-sento', brand: 'VITRA' as const, category: 'BASINS' as const, sku: 'VTR-SENTO-55', name: 'Vitra Sento Basin 55cm', mrp: 11000 },
    { id: 'grh-feel', brand: 'GROHE' as const, category: 'KITCHEN' as const, sku: 'GRH-FEEL-KIT', name: 'Grohe Feel Kitchen Mixer', mrp: 56000 },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    })
  }
  console.log('  Products:', products.length)

  // 4. Create Purchase Orders + Line Items (matching MOCK_PURCHASE_ORDERS exactly)
  const purchaseOrders = [
    {
      id: 'po-001', poNumber: 'PO-2026-0001', mode: 'PROJECT_LINKED' as const, status: 'SUBMITTED' as const,
      projectId: 'proj-001', vendorName: 'GROHE', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-04-15'), notes: 'Priority delivery — client moving in April end',
      createdAt: new Date('2026-03-10T10:00:00Z'),
      lineItems: [
        { id: 'line-001', productId: 'grh-rain-310', qtyOrdered: 2, qtyReceived: 1, qtyPendingCo: 1, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 36000, clientOfferRate: 46200, status: 'PARTIALLY_RECEIVED' as const },
        { id: 'line-002', productId: 'grh-euphoria', qtyOrdered: 1, qtyReceived: 1, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 28000, clientOfferRate: 33880, status: 'FULLY_RECEIVED' as const },
      ],
    },
    {
      id: 'po-002', poNumber: 'PO-2026-0002', mode: 'PROJECT_LINKED' as const, status: 'DRAFT' as const,
      projectId: 'proj-002', vendorName: 'HANSGROHE', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-05-01'), notes: '',
      createdAt: new Date('2026-03-18T09:00:00Z'),
      lineItems: [
        { id: 'line-003', productId: 'hgr-raindance-e', qtyOrdered: 3, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 41000, clientOfferRate: 52800, status: 'PENDING' as const },
      ],
    },
    {
      id: 'po-003', poNumber: 'PO-2026-0003', mode: 'BULK_COMPANY' as const, status: 'FULLY_RECEIVED' as const,
      projectId: null, vendorName: 'VITRA', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-03-01'), notes: 'Showroom replenishment — S50 series',
      createdAt: new Date('2026-02-20T08:00:00Z'),
      lineItems: [
        { id: 'line-004', productId: 'vtr-s50-wc', qtyOrdered: 5, qtyReceived: 5, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 1, qtyInBox: 3, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 18500, clientOfferRate: null, status: 'FULLY_RECEIVED' as const },
      ],
    },
    {
      id: 'po-004', poNumber: 'PO-2026-0004', mode: 'PROJECT_LINKED' as const, status: 'PARTIALLY_RECEIVED' as const,
      projectId: 'proj-005', vendorName: 'AXOR', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-04-20'), notes: 'Master bath + guest bath fixtures',
      createdAt: new Date('2026-03-01T11:00:00Z'),
      lineItems: [
        { id: 'line-005', productId: 'axr-montreux', qtyOrdered: 4, qtyReceived: 2, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 2, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 38500, clientOfferRate: 52000, status: 'PARTIALLY_RECEIVED' as const },
        { id: 'line-006', productId: 'axr-citterio', qtyOrdered: 2, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 68000, clientOfferRate: 92000, status: 'PENDING' as const },
      ],
    },
    {
      id: 'po-005', poNumber: 'PO-2026-0005', mode: 'PROJECT_LINKED' as const, status: 'SUBMITTED' as const,
      projectId: 'proj-005', vendorName: 'GEBERIT', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-04-28'), notes: 'Concealed cisterns — 3 bathrooms',
      createdAt: new Date('2026-03-05T14:00:00Z'),
      lineItems: [
        { id: 'line-007', productId: 'gbr-sigma', qtyOrdered: 3, qtyReceived: 0, qtyPendingCo: 2, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 31500, clientOfferRate: 42000, status: 'PENDING' as const },
      ],
    },
    {
      id: 'po-006', poNumber: 'PO-2026-0006', mode: 'PROJECT_LINKED' as const, status: 'SUBMITTED' as const,
      projectId: 'proj-006', vendorName: 'HANSGROHE', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-05-10'), notes: '6 premium apartments — uniform spec',
      createdAt: new Date('2026-03-15T10:30:00Z'),
      lineItems: [
        { id: 'line-008', productId: 'hgr-select-e', qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 5, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 52000, clientOfferRate: 68000, status: 'PENDING' as const },
      ],
    },
    {
      id: 'po-007', poNumber: 'PO-2026-0007', mode: 'PROJECT_LINKED' as const, status: 'DRAFT' as const,
      projectId: 'proj-006', vendorName: 'VITRA', createdById: 'dev-user-001',
      expectedDelivery: null, notes: '',
      createdAt: new Date('2026-03-20T16:00:00Z'),
      lineItems: [
        { id: 'line-009', productId: 'vtr-frame-wc', qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 6, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 24000, clientOfferRate: 32000, status: 'PENDING' as const },
        { id: 'line-010', productId: 'vtr-sento', qtyOrdered: 6, qtyReceived: 0, qtyPendingCo: 4, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 0, qtyNotDisplayed: 0, landingCost: 8500, clientOfferRate: 11000, status: 'PENDING' as const },
      ],
    },
    {
      id: 'po-008', poNumber: 'PO-2026-0008', mode: 'PROJECT_LINKED' as const, status: 'FULLY_RECEIVED' as const,
      projectId: 'proj-002', vendorName: 'GROHE', createdById: 'dev-user-001',
      expectedDelivery: new Date('2026-03-10'), notes: 'Kitchen & utility fittings',
      createdAt: new Date('2026-02-15T08:00:00Z'),
      lineItems: [
        { id: 'line-011', productId: 'grh-feel', qtyOrdered: 1, qtyReceived: 1, qtyPendingCo: 0, qtyPendingDist: 0, qtyAtGodown: 0, qtyInBox: 0, qtyDispatched: 1, qtyNotDisplayed: 0, landingCost: 44000, clientOfferRate: 56000, status: 'FULLY_RECEIVED' as const },
      ],
    },
  ]

  for (const po of purchaseOrders) {
    const { lineItems, ...poData } = po
    await prisma.purchaseOrder.upsert({
      where: { id: po.id },
      update: {},
      create: poData,
    })
    for (const li of lineItems) {
      await prisma.pOLineItem.upsert({
        where: { id: li.id },
        update: {},
        create: { ...li, poId: po.id },
      })
    }
  }
  console.log('  Purchase Orders:', purchaseOrders.length)
  console.log('  Line Items:', purchaseOrders.reduce((sum, po) => sum + po.lineItems.length, 0))

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
