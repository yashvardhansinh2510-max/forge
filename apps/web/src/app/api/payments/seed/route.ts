import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

// Seed realistic Buildcon House sales orders into Neon.
// Idempotent — only inserts if no orders exist.
// Hit POST /api/payments/seed once after setup.

export async function POST() {
  return withErrorHandling(async () => {
    const existing = await prisma.salesOrder.count()
    if (existing > 0) {
      return NextResponse.json({ message: `Already seeded (${existing} orders exist)` })
    }

    // ── Seed orders ────────────────────────────────────────────────────────────
    const orders = await prisma.$transaction([
      // 1. Lodha Developers — partial payments
      prisma.salesOrder.create({
        data: {
          id: 'so-lodha-001',
          number: 'SO-2025-0042',
          customerId: 'c02',
          customerName: 'Lodha Developers Ltd',
          customerPhone: '+91 98765 44321',
          status: 'CONFIRMED',
          projectName: 'Lodha Supremus — Luxury Bathroom Package',
          deliveryAddress: '412, Lodha Supremus, Lower Parel, Mumbai 400013',
          mrpTotal: 130000,
          offerTotal: 100000,
          createdAt: new Date('2025-04-02'),
          updatedAt: new Date('2025-04-02'),
          lineItems: {
            create: [
              { sku: 'GRH-SS-EUPH-260', name: 'Grohe Euphoria 260 Shower System', brand: 'GROHE', qty: 2, mrp: 28500, offerRate: 22800 },
              { sku: 'AXR-BM-UNO-CH', name: 'Axor Uno Basin Mixer Chrome', brand: 'AXOR', qty: 4, mrp: 18250, offerRate: 13600 },
            ],
          },
          payments: {
            create: [
              { amount: 30000, method: 'UPI', reference: 'UTR8842221', receivedAt: new Date('2025-03-15'), recordedBy: 'Suresh Iyer' },
              { amount: 30000, method: 'BANK_TRANSFER', reference: 'NEFT09922', receivedAt: new Date('2025-03-28'), recordedBy: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 2. Rajesh Constructions — large outstanding
      prisma.salesOrder.create({
        data: {
          id: 'so-rajesh-001',
          number: 'SO-2025-0039',
          customerId: 'c01',
          customerName: 'Rajesh Constructions Pvt Ltd',
          customerPhone: '+91 98200 11234',
          status: 'PROCESSING',
          projectName: 'Rajesh Heights — Bathroom Package (12 Units)',
          deliveryAddress: 'Rajesh Heights, Plot 44C, Andheri West, Mumbai 400053',
          mrpTotal: 385000,
          offerTotal: 308000,
          createdAt: new Date('2025-03-28'),
          updatedAt: new Date('2025-03-28'),
          lineItems: {
            create: [
              { sku: 'GRH-WC-SENSIA-WH', name: 'Grohe Sensia Arena Wall-Hung WC', brand: 'GROHE', qty: 12, mrp: 18500, offerRate: 15000 },
              { sku: 'HAG-BM-METRO-CH', name: 'Hansgrohe Metroatherm Basin Mixer', brand: 'HANSGROHE', qty: 12, mrp: 13667, offerRate: 10667 },
            ],
          },
          payments: {
            create: [
              { amount: 100000, method: 'CHEQUE', reference: 'CHQ-004821', receivedAt: new Date('2025-04-01'), recordedBy: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 3. Prestige Group — fully paid
      prisma.salesOrder.create({
        data: {
          id: 'so-prestige-001',
          number: 'SO-2025-0035',
          customerId: 'c03',
          customerName: 'Prestige Group (Mumbai)',
          customerPhone: '+91 87654 99001',
          status: 'DELIVERED',
          projectName: 'Prestige Windsor — Villa Wing Flooring',
          deliveryAddress: 'Prestige Windsor Site, Bandra East, Mumbai 400051',
          mrpTotal: 112000,
          offerTotal: 98560,
          createdAt: new Date('2025-03-15'),
          updatedAt: new Date('2025-03-15'),
          lineItems: {
            create: [
              { sku: 'VIT-WC-INTEGRA-WH', name: 'Vitra Integra Wall-Hung WC', brand: 'VITRA', qty: 4, mrp: 14000, offerRate: 12320 },
              { sku: 'VIT-WB-SHIFT-550', name: 'Vitra Shift Wall-Hung Basin 550mm', brand: 'VITRA', qty: 4, mrp: 14000, offerRate: 12320 },
            ],
          },
          payments: {
            create: [
              { amount: 49280, method: 'BANK_TRANSFER', reference: 'RTGS-2203', receivedAt: new Date('2025-03-10'), recordedBy: 'Suresh Iyer' },
              { amount: 49280, method: 'BANK_TRANSFER', reference: 'RTGS-3301', receivedAt: new Date('2025-03-20'), recordedBy: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 4. Sanjay Patil — unpaid
      prisma.salesOrder.create({
        data: {
          id: 'so-patil-001',
          number: 'SO-2025-0031',
          customerId: 'c04',
          customerName: 'Sanjay Patil Interior Works',
          customerPhone: '+91 99204 56789',
          status: 'CONFIRMED',
          projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
          deliveryAddress: 'Client Flat: 1204B, Runwal Greens, Mulund West',
          mrpTotal: 68000,
          offerTotal: 59840,
          createdAt: new Date('2025-04-05'),
          updatedAt: new Date('2025-04-05'),
          lineItems: {
            create: [
              { sku: 'GRH-BM-BAUCLINE-CH', name: 'Grohe BauClassic Basin Mixer', brand: 'GROHE', qty: 2, mrp: 8500, offerRate: 7480 },
              { sku: 'GRH-SF-MONO-CH', name: 'Grohe Mono Single-Lever Shower Faucet', brand: 'GROHE', qty: 2, mrp: 12500, offerRate: 11000 },
              { sku: 'KAJ-FT-ETW-600', name: 'Kajaria Eternity White Floor Tile 600×600', brand: 'KAJARIA', qty: 20, mrp: 1450, offerRate: 1276 },
            ],
          },
        },
      }),

      // 5. Green Earth Homes — mostly paid
      prisma.salesOrder.create({
        data: {
          id: 'so-green-001',
          number: 'SO-2025-0028',
          customerId: 'c05',
          customerName: 'Green Earth Homes LLP',
          customerPhone: '+91 70456 12345',
          status: 'DISPATCHED',
          projectName: 'Eco Park Colony — 3BHK Remodel',
          deliveryAddress: '22, Eco Park Colony, Chembur, Mumbai 400071',
          mrpTotal: 240000,
          offerTotal: 192000,
          createdAt: new Date('2025-02-20'),
          updatedAt: new Date('2025-02-20'),
          lineItems: {
            create: [
              { sku: 'HAG-TS-RAINDANCE-CH', name: 'Hansgrohe Raindance Thermostatic Shower Set', brand: 'HANSGROHE', qty: 3, mrp: 48000, offerRate: 38400 },
              { sku: 'VIT-BASIN-METROPOLE', name: 'Vitra Metropole 600 Countertop Basin', brand: 'VITRA', qty: 3, mrp: 12000, offerRate: 9600 },
              { sku: 'GRH-BF-BAUNOVA-CH', name: 'Grohe BauNova Bath Filler', brand: 'GROHE', qty: 3, mrp: 16000, offerRate: 12800 },
            ],
          },
          payments: {
            create: [
              { amount: 50000, method: 'UPI', reference: 'UTR5512900', receivedAt: new Date('2025-02-20'), recordedBy: 'Suresh Iyer' },
              { amount: 50000, method: 'BANK_TRANSFER', reference: 'NEFT-88401', receivedAt: new Date('2025-03-05'), recordedBy: 'Suresh Iyer' },
              { amount: 50000, method: 'CASH', receivedAt: new Date('2025-03-22'), recordedBy: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 6. Lodha — second order, unpaid
      prisma.salesOrder.create({
        data: {
          id: 'so-lodha-002',
          number: 'SO-2025-0022',
          customerId: 'c02',
          customerName: 'Lodha Developers Ltd',
          customerPhone: '+91 98765 44321',
          status: 'CONFIRMED',
          projectName: 'Lodha Belmondo — Guest Bathrooms (8 Units)',
          deliveryAddress: '33, Lodha Belmondo, Pune-Mumbai Expressway',
          mrpTotal: 87000,
          offerTotal: 76560,
          createdAt: new Date('2025-04-08'),
          updatedAt: new Date('2025-04-08'),
          lineItems: {
            create: [
              { sku: 'AXR-SS-SHOWER-12-CH', name: 'Axor ShowerSolutions 120 3jet Chrome', brand: 'AXOR', qty: 8, mrp: 6500, offerRate: 5720 },
              { sku: 'GRH-BM-LINEARE-CH', name: 'Grohe Lineare Basin Mixer M-Size', brand: 'GROHE', qty: 8, mrp: 4375, offerRate: 3850 },
            ],
          },
        },
      }),
    ])

    return NextResponse.json({ message: `Seeded ${orders.length} orders successfully` }, { status: 201 })
  })
}
