import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'

// Seed realistic follow-ups into Neon.
// Idempotent — only inserts if no follow-ups exist.
// Restricted to OWNER role.

export async function POST() {
  return withErrorHandling(async () => {
    await requirePermission('Users', 'Invite') // OWNER or MANAGER only

    const existing = await prisma.followUp.count()
    if (existing > 0) {
      return NextResponse.json({ message: `Already seeded (${existing} follow-ups exist)` })
    }

    const now = Date.now()
    const d = (days: number) => new Date(now + days * 86_400_000)

    await prisma.$transaction([
      prisma.followUp.create({
        data: {
          id: 'fu01', type: 'WALK_IN', customerName: 'Ar. Anjali Sharma', customerPhone: '+91 98200 77345',
          customerType: 'ARCHITECT', brandsInterested: ['Grohe', 'Axor'],
          productsNoted: 'Grohe Rainshower 310, Axor Urquiola basin mixer, thermostatic systems',
          estimatedBudget: 480000, projectName: 'Hiranandani Fortune City — 3 premium bathrooms',
          status: 'INTERESTED', nextFollowUpDate: d(-2), lastContactedAt: d(-5),
          notes: 'Came in with client. Loved the Axor Urquiola display.',
          assignedTo: 'Suresh Iyer', createdAt: d(-7), updatedAt: d(-3),
          responses: { create: [
            { id: 'r01a', date: d(-5), method: 'VISIT', outcome: 'Visited showroom. Very interested.', nextAction: 'Send quotation', staffMember: 'Suresh Iyer' },
            { id: 'r01b', date: d(-3), method: 'WHATSAPP', outcome: 'Budget confirmed ₹4–5L.', nextAction: 'Send spec sheet', staffMember: 'Suresh Iyer' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu02', type: 'WALK_IN', customerName: 'Priya Nambiar', customerPhone: '+91 70456 88123',
          customerType: 'INTERIOR_DESIGNER', brandsInterested: ['Hansgrohe', 'Vitra'],
          productsNoted: 'Hansgrohe Metropol faucets, Vitra S50 wall-hung WC',
          estimatedBudget: 320000, projectName: 'Bandra West 4BHK renovation',
          status: 'NEGOTIATING', nextFollowUpDate: d(1), lastContactedAt: d(-1),
          notes: 'Price-sensitive. Has competing quote from Kohler dealer.',
          assignedTo: 'Ramesh Pawar', createdAt: d(-6), updatedAt: d(-1),
          responses: { create: [
            { id: 'r02a', date: d(-4), method: 'VISIT', outcome: 'Comparing us with another dealer.', nextAction: 'Best-price offer', staffMember: 'Ramesh Pawar' },
            { id: 'r02b', date: d(-1), method: 'CALL', outcome: 'Wants 15% discount. We offered 12%.', nextAction: 'Manager approval', staffMember: 'Ramesh Pawar' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu03', type: 'WALK_IN', customerName: 'Mahesh Thakur', customerPhone: '+91 99204 33567',
          customerType: 'BUILDER', brandsInterested: ['Kajaria', 'Vitra'],
          productsNoted: 'Kajaria 600×600 floor tiles, Vitra S20 WC',
          estimatedBudget: 1200000, projectName: 'Mulund East residential complex — 24 units',
          status: 'PENDING', nextFollowUpDate: d(2),
          notes: 'Large builder project. Needs bulk pricing.',
          assignedTo: 'Suresh Iyer', createdAt: d(0), updatedAt: d(0),
          responses: { create: [
            { id: 'r03a', date: d(0), method: 'VISIT', outcome: 'Interested in bulk pricing. Took catalogue.', nextAction: 'Bulk pricing sheet by tomorrow', staffMember: 'Suresh Iyer' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu04', type: 'WALK_IN', customerName: 'Deepak Sawant', customerPhone: '+91 87654 12098',
          customerType: 'RETAIL', brandsInterested: ['Grohe'],
          productsNoted: 'Grohe Euphoria shower set',
          estimatedBudget: 85000, projectName: 'Chembur home bathroom upgrade',
          status: 'CONTACTED', nextFollowUpDate: d(-3), lastContactedAt: d(-6),
          notes: 'Comparing online prices.',
          assignedTo: 'Ramesh Pawar', createdAt: d(-10), updatedAt: d(-6),
          responses: { create: [
            { id: 'r04a', date: d(-8), method: 'VISIT', outcome: 'Quoted ₹82,500.', nextAction: 'Call in 2 days', staffMember: 'Ramesh Pawar' },
            { id: 'r04b', date: d(-6), method: 'CALL', outcome: 'Still deciding.', nextAction: 'Follow up in 3 days', staffMember: 'Ramesh Pawar' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu05', type: 'QUOTATION', customerName: 'Rajesh Constructions Pvt Ltd', customerPhone: '+91 98200 11234',
          customerType: 'BUILDER', brandsInterested: ['Kajaria'],
          productsNoted: 'Kajaria floor tiles — 12 units',
          projectName: 'Rajesh Heights — Bathroom Package (12 Units)',
          quotationNumber: 'Q-2025-0048', quotationValue: 298000,
          status: 'PENDING', nextFollowUpDate: d(1),
          notes: 'Quotation sent 2 days ago.',
          assignedTo: 'Suresh Iyer', createdAt: d(-2), updatedAt: d(-2),
          responses: { create: [
            { id: 'r05a', date: d(-2), method: 'WHATSAPP', outcome: 'Sent quotation. Receipt acknowledged.', nextAction: 'Follow up call Thursday', staffMember: 'Suresh Iyer' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu06', type: 'QUOTATION', customerName: 'Prestige Group (Mumbai)', customerPhone: '+91 87654 99001',
          customerType: 'BUILDER', brandsInterested: ['Grohe'],
          productsNoted: 'Luxury package — 4 penthouse units',
          projectName: 'Prestige Windsor — Luxury Bathroom Package',
          quotationNumber: 'Q-2025-0047', quotationValue: 1724000,
          status: 'CONTACTED', nextFollowUpDate: d(2), lastContactedAt: d(-1),
          notes: 'Needs board approval.',
          assignedTo: 'Suresh Iyer', createdAt: d(-4), updatedAt: d(-1),
          responses: { create: [
            { id: 'r06a', date: d(-4), method: 'WHATSAPP', outcome: 'Sent Q-2025-0047.', nextAction: 'Follow up once viewed', staffMember: 'Suresh Iyer' },
            { id: 'r06b', date: d(-1), method: 'CALL', outcome: 'Within budget but needs board sign-off.', nextAction: 'Wait till Thursday', staffMember: 'Suresh Iyer' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu07', type: 'QUOTATION', customerName: 'Sanjay Patil Interior Works', customerPhone: '+91 99204 56789',
          customerType: 'INTERIOR_DESIGNER', brandsInterested: ['Vitra', 'Grohe'],
          productsNoted: 'Vitra S50 WC, Grohe Rainshower 310 — 2 bathrooms',
          projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
          quotationNumber: 'Q-2025-0046', quotationValue: 176000,
          status: 'WON', nextFollowUpDate: d(7), lastContactedAt: d(-2),
          notes: 'Order confirmed! Advance paid.',
          assignedTo: 'Ramesh Pawar', createdAt: d(-7), updatedAt: d(-2),
          responses: { create: [
            { id: 'r07a', date: d(-6), method: 'WHATSAPP', outcome: 'Sent quotation.', nextAction: 'Follow up in 2 days', staffMember: 'Ramesh Pawar' },
            { id: 'r07b', date: d(-4), method: 'CALL', outcome: 'Client approved! Advance today.', nextAction: 'Issue sales order', staffMember: 'Ramesh Pawar' },
            { id: 'r07c', date: d(-2), method: 'CALL', outcome: 'Advance received. Delivery next week.', nextAction: 'Coordinate dispatch', staffMember: 'Ramesh Pawar' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu08', type: 'QUOTATION', customerName: 'Green Earth Homes LLP', customerPhone: '+91 70456 12345',
          customerType: 'BUILDER', brandsInterested: ['Grohe'],
          productsNoted: 'Wall-Hung WC — 8 units',
          projectName: 'Eco Park Block C — Green Bathroom Package',
          quotationNumber: 'Q-2025-0044', quotationValue: 329400,
          status: 'LOST', nextFollowUpDate: d(30), lastContactedAt: d(-7),
          notes: 'Chose competitor. Re-engage in 30 days.',
          assignedTo: 'Ramesh Pawar', createdAt: d(-12), updatedAt: d(-7),
          responses: { create: [
            { id: 'r08a', date: d(-10), method: 'WHATSAPP', outcome: 'Comparing with 2 other vendors.', nextAction: 'Follow up in 3 days', staffMember: 'Ramesh Pawar' },
            { id: 'r08b', date: d(-7), method: 'CALL', outcome: 'Went with competitor at 20% lower.', nextAction: 'Re-engage list', staffMember: 'Ramesh Pawar' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu09', type: 'WALK_IN', customerName: 'Ar. Neha Joshi', customerPhone: '+91 90000 44231',
          customerType: 'ARCHITECT', brandsInterested: ['Axor', 'Hansgrohe'],
          productsNoted: 'Axor Citterio E tub faucet, Hansgrohe Raindance shower',
          estimatedBudget: 650000, projectName: 'Juhu villa — master + guest bath',
          status: 'INTERESTED', nextFollowUpDate: d(3), lastContactedAt: d(-1),
          notes: 'High-end Juhu residential. German brands only.',
          assignedTo: 'Suresh Iyer', createdAt: d(-5), updatedAt: d(-1),
          responses: { create: [
            { id: 'r09a', date: d(-3), method: 'VISIT', outcome: 'Came with mood board. Confirmed products.', nextAction: 'Source SKUs', staffMember: 'Suresh Iyer' },
            { id: 'r09b', date: d(-1), method: 'WHATSAPP', outcome: 'Confirmed right products. Formal quote by Thursday.', nextAction: 'Send quotation', staffMember: 'Suresh Iyer' },
          ]},
        },
      }),
      prisma.followUp.create({
        data: {
          id: 'fu10', type: 'QUOTATION', customerName: 'Lodha Developers Ltd', customerPhone: '+91 98765 44321',
          customerType: 'BUILDER', brandsInterested: ['Kajaria'],
          productsNoted: 'Kajaria floor tiles + Jaguar mixers — 80 units bulk',
          projectName: 'Lodha Palava — Phase 7 Bathroom Package (80 Units)',
          quotationNumber: 'Q-2025-0045', quotationValue: 2180000,
          status: 'PENDING', nextFollowUpDate: d(3),
          notes: 'Draft quotation. Send to Priya Nair once approved.',
          assignedTo: 'Suresh Iyer', createdAt: d(0), updatedAt: d(0),
        },
      }),
    ])

    return NextResponse.json({ message: 'Seeded 10 follow-ups successfully' }, { status: 201 })
  })
}
