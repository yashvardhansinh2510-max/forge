import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'

// Seed realistic follow-ups from Buildcon House mock data into Neon.
// Idempotent — only inserts if no follow-ups exist.
// Hit POST /api/follow-ups/seed once after setup.

export async function POST() {
  return withErrorHandling(async () => {
    const existing = await prisma.followUp.count()
    if (existing > 0) {
      return NextResponse.json({ message: `Already seeded (${existing} follow-ups exist)` })
    }

    const now = Date.now()
    const d = (days: number) => new Date(now + days * 86_400_000)

    await prisma.$transaction([
      // 1. Walk-in: Architect, Grohe + Axor, interested, overdue
      prisma.followUp.create({
        data: {
          id: 'fu01',
          type: 'WALK_IN',
          customerName: 'Ar. Anjali Sharma',
          customerPhone: '+91 98200 77345',
          customerType: 'ARCHITECT',
          brandsInterested: ['Grohe', 'Axor'],
          productsNoted: 'Grohe Rainshower 310, Axor Urquiola basin mixer, thermostatic systems',
          estimatedBudget: 480000,
          projectName: 'Hiranandani Fortune City — 3 premium bathrooms',
          status: 'INTERESTED',
          nextFollowUpDate: d(-2),
          lastContactedAt: d(-5),
          notes: 'Came in with client. Loved the Axor Urquiola display. Requested detailed spec sheet.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(-7),
          updatedAt: d(-3),
          responses: {
            create: [
              { id: 'r01a', date: d(-5), method: 'VISIT', outcome: 'Visited showroom with client. Very interested in Axor Urquiola range. Took catalog.', nextAction: 'Follow up with detailed quotation for 3 bathrooms', staffMember: 'Suresh Iyer' },
              { id: 'r01b', date: d(-3), method: 'WHATSAPP', outcome: 'Confirmed budget is ₹4–5L. Wants thermostatic shower for master bath.', nextAction: 'Send revised spec sheet with Grohe Grohtherm 3000 option', staffMember: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 2. Walk-in: Interior Designer, Hansgrohe + Vitra, negotiating
      prisma.followUp.create({
        data: {
          id: 'fu02',
          type: 'WALK_IN',
          customerName: 'Priya Nambiar',
          customerPhone: '+91 70456 88123',
          customerType: 'INTERIOR_DESIGNER',
          brandsInterested: ['Hansgrohe', 'Vitra'],
          productsNoted: 'Hansgrohe Metropol faucets, Vitra S50 wall-hung WC, Vitra Sento basin',
          estimatedBudget: 320000,
          projectName: 'Bandra West 4BHK renovation — 2 bathrooms',
          status: 'NEGOTIATING',
          nextFollowUpDate: d(1),
          lastContactedAt: d(-1),
          notes: 'Price-sensitive client. Has competing quote from Kohler dealer in Andheri.',
          assignedTo: 'Ramesh Pawar',
          createdAt: d(-6),
          updatedAt: d(-1),
          responses: {
            create: [
              { id: 'r02a', date: d(-4), method: 'VISIT', outcome: 'Walked in, knew what she wanted. Comparing us with another dealer.', nextAction: 'Prepare best-price offer for Hansgrohe Metropol + Vitra S50 combo', staffMember: 'Ramesh Pawar' },
              { id: 'r02b', date: d(-1), method: 'CALL', outcome: 'Reviewed our quote. Wants 15% discount. We offered 12%.', nextAction: 'Check if 13% is possible with manager approval. Call back tomorrow.', staffMember: 'Ramesh Pawar' },
            ],
          },
        },
      }),

      // 3. Walk-in: Builder, Kajaria + Vitra, pending (new today)
      prisma.followUp.create({
        data: {
          id: 'fu03',
          type: 'WALK_IN',
          customerName: 'Mahesh Thakur',
          customerPhone: '+91 99204 33567',
          customerType: 'BUILDER',
          brandsInterested: ['Kajaria', 'Vitra'],
          productsNoted: 'Kajaria 600×600 floor tiles, Vitra S20 WC for affordable segment',
          estimatedBudget: 1200000,
          projectName: 'Mulund East residential complex — 24 units',
          status: 'PENDING',
          nextFollowUpDate: d(2),
          notes: 'Large builder project. Budget-conscious. Needs bulk pricing sheet.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(0),
          updatedAt: d(0),
          responses: {
            create: [
              { id: 'r03a', date: d(0), method: 'VISIT', outcome: 'Walked in this morning. Interested in bulk pricing. Took Kajaria catalogue.', nextAction: 'Prepare bulk pricing sheet and share by tomorrow EOD', staffMember: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 4. Walk-in: Retail, Grohe, contacted (overdue)
      prisma.followUp.create({
        data: {
          id: 'fu04',
          type: 'WALK_IN',
          customerName: 'Deepak Sawant',
          customerPhone: '+91 87654 12098',
          customerType: 'RETAIL',
          brandsInterested: ['Grohe'],
          productsNoted: 'Grohe Euphoria shower set for home renovation',
          estimatedBudget: 85000,
          projectName: 'Chembur home bathroom upgrade',
          status: 'CONTACTED',
          nextFollowUpDate: d(-3),
          lastContactedAt: d(-6),
          notes: 'Single bathroom renovation. Was comparing online prices.',
          assignedTo: 'Ramesh Pawar',
          createdAt: d(-10),
          updatedAt: d(-6),
          responses: {
            create: [
              { id: 'r04a', date: d(-8), method: 'VISIT', outcome: 'Retail customer. Wanted to see Grohe Euphoria in action. Quoted ₹82,500.', nextAction: 'Call in 2 days to confirm', staffMember: 'Ramesh Pawar' },
              { id: 'r04b', date: d(-6), method: 'CALL', outcome: 'Said he is still deciding. Will call back.', nextAction: 'Follow up again in 3 days', staffMember: 'Ramesh Pawar' },
            ],
          },
        },
      }),

      // 5. Quotation-linked: Rajesh, pending follow-up
      prisma.followUp.create({
        data: {
          id: 'fu05',
          type: 'QUOTATION',
          customerName: 'Rajesh Constructions Pvt Ltd',
          customerPhone: '+91 98200 11234',
          customerType: 'BUILDER',
          brandsInterested: ['Kajaria'],
          productsNoted: 'Hindware WC, Jaguar Lyric Basin Mixer, Kajaria floor tiles — 12 units',
          projectName: 'Rajesh Heights — Bathroom Package (12 Units)',
          quotationId: 'q01',
          quotationNumber: 'Q-2025-0048',
          quotationValue: 298000,
          status: 'PENDING',
          nextFollowUpDate: d(1),
          notes: 'Quotation was sent 2 days ago. Waiting for response from Rajesh Mehta.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(-2),
          updatedAt: d(-2),
          responses: {
            create: [
              { id: 'r05a', date: d(-2), method: 'WHATSAPP', outcome: 'Sent quotation via WhatsApp. Rajesh acknowledged receipt.', nextAction: 'Follow up call by Thursday', staffMember: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 6. Quotation-linked: Prestige, contacted
      prisma.followUp.create({
        data: {
          id: 'fu06',
          type: 'QUOTATION',
          customerName: 'Prestige Group (Mumbai)',
          customerPhone: '+91 87654 99001',
          customerType: 'BUILDER',
          brandsInterested: ['Grohe'],
          productsNoted: 'Luxury package — bathtubs, thermostatic showers, vanity units — 4 penthouse units',
          projectName: 'Prestige Windsor — Luxury Bathroom Package (Penthouse 4 Units)',
          quotationId: 'q02',
          quotationNumber: 'Q-2025-0047',
          quotationValue: 1724000,
          status: 'CONTACTED',
          nextFollowUpDate: d(2),
          lastContactedAt: d(-1),
          notes: 'Client viewed the quotation yesterday. Needs board approval.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(-4),
          updatedAt: d(-1),
          responses: {
            create: [
              { id: 'r06a', date: d(-4), method: 'WHATSAPP', outcome: 'Sent Q-2025-0047 to Anand Krishnan. He confirmed receipt.', nextAction: 'Follow up once viewed', staffMember: 'Suresh Iyer' },
              { id: 'r06b', date: d(-1), method: 'CALL', outcome: 'Quotation viewed. Anand said price is within budget but needs board sign-off.', nextAction: 'Wait till Thursday, then follow up', staffMember: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 7. Quotation-linked: Sanjay Patil, won
      prisma.followUp.create({
        data: {
          id: 'fu07',
          type: 'QUOTATION',
          customerName: 'Sanjay Patil Interior Works',
          customerPhone: '+91 99204 56789',
          customerType: 'INTERIOR_DESIGNER',
          brandsInterested: ['Vitra', 'Grohe'],
          productsNoted: 'Vitra S50 WC, Vitra Sento basin, Grohe Rainshower 310 — 2 bathrooms',
          projectName: 'Runwal Greens — 2BHK Bathroom Renovation',
          quotationId: 'q03',
          quotationNumber: 'Q-2025-0046',
          quotationValue: 176000,
          status: 'WON',
          nextFollowUpDate: d(7),
          lastContactedAt: d(-2),
          notes: 'Order confirmed! Advance paid. Delivery scheduled.',
          assignedTo: 'Ramesh Pawar',
          createdAt: d(-7),
          updatedAt: d(-2),
          responses: {
            create: [
              { id: 'r07a', date: d(-6), method: 'WHATSAPP', outcome: 'Sent quotation to Sanjay. He said he will show to client.', nextAction: 'Follow up in 2 days', staffMember: 'Ramesh Pawar' },
              { id: 'r07b', date: d(-4), method: 'CALL', outcome: 'Client approved! Sanjay confirmed order. Will pay advance today.', nextAction: 'Issue sales order and coordinate delivery', staffMember: 'Ramesh Pawar' },
              { id: 'r07c', date: d(-2), method: 'CALL', outcome: 'Advance payment received. Delivery confirmed for next week.', nextAction: 'Coordinate with dispatch team for Mulund delivery', staffMember: 'Ramesh Pawar' },
            ],
          },
        },
      }),

      // 8. Quotation-linked: Green Earth, lost
      prisma.followUp.create({
        data: {
          id: 'fu08',
          type: 'QUOTATION',
          customerName: 'Green Earth Homes LLP',
          customerPhone: '+91 70456 12345',
          customerType: 'BUILDER',
          brandsInterested: ['Grohe'],
          productsNoted: 'Wall-Hung WC — 8 units',
          projectName: 'Eco Park Block C — Green Bathroom Package',
          quotationId: 'q05',
          quotationNumber: 'Q-2025-0044',
          quotationValue: 329400,
          status: 'LOST',
          nextFollowUpDate: d(30),
          lastContactedAt: d(-7),
          notes: 'Customer chose a competitor. Will circle back in 30 days for next project.',
          assignedTo: 'Ramesh Pawar',
          createdAt: d(-12),
          updatedAt: d(-7),
          responses: {
            create: [
              { id: 'r08a', date: d(-10), method: 'WHATSAPP', outcome: 'Sent quotation. Meera said she is comparing with 2 other vendors.', nextAction: 'Follow up in 3 days', staffMember: 'Ramesh Pawar' },
              { id: 'r08b', date: d(-7), method: 'CALL', outcome: 'They went with a competitor who offered 20% lower price. Cannot match.', nextAction: 'Add to re-engage list in 30 days', staffMember: 'Ramesh Pawar' },
            ],
          },
        },
      }),

      // 9. Walk-in: Architect, Axor + Hansgrohe, interested
      prisma.followUp.create({
        data: {
          id: 'fu09',
          type: 'WALK_IN',
          customerName: 'Ar. Neha Joshi',
          customerPhone: '+91 90000 44231',
          customerType: 'ARCHITECT',
          brandsInterested: ['Axor', 'Hansgrohe'],
          productsNoted: 'Axor Citterio E floor-mount tub faucet, Hansgrohe Raindance shower head',
          estimatedBudget: 650000,
          projectName: 'Juhu villa — master bathroom + guest bath',
          status: 'INTERESTED',
          nextFollowUpDate: d(3),
          lastContactedAt: d(-1),
          notes: 'High-end residential project in Juhu. Wants only German brands.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(-5),
          updatedAt: d(-1),
          responses: {
            create: [
              { id: 'r09a', date: d(-3), method: 'VISIT', outcome: 'Came in with mood board. Very specific about Axor Citterio E + Hansgrohe Raindance.', nextAction: 'Source exact SKUs and prepare detailed quote', staffMember: 'Suresh Iyer' },
              { id: 'r09b', date: d(-1), method: 'WHATSAPP', outcome: 'Sent product links and preliminary pricing. She confirmed these are the right products.', nextAction: 'Formal quotation by Thursday', staffMember: 'Suresh Iyer' },
            ],
          },
        },
      }),

      // 10. Quotation-linked: Lodha, draft pending
      prisma.followUp.create({
        data: {
          id: 'fu10',
          type: 'QUOTATION',
          customerName: 'Lodha Developers Ltd',
          customerPhone: '+91 98765 44321',
          customerType: 'BUILDER',
          brandsInterested: ['Kajaria'],
          productsNoted: 'Hindware WC + Kajaria floor tiles + Jaguar mixers — 80 units bulk project',
          projectName: 'Lodha Palava — Phase 7 Bathroom Package (80 Units)',
          quotationId: 'q04',
          quotationNumber: 'Q-2025-0045',
          quotationValue: 2180000,
          status: 'PENDING',
          nextFollowUpDate: d(3),
          notes: 'Draft quotation. Will be sent to Priya Nair once approved internally.',
          assignedTo: 'Suresh Iyer',
          createdAt: d(0),
          updatedAt: d(0),
        },
      }),
    ])

    return NextResponse.json({ message: 'Seeded 10 follow-ups successfully' }, { status: 201 })
  })
}
