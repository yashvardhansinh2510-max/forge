/**
 * API route tests — mocks @forge/db (Prisma) and @clerk/nextjs/server (auth).
 * Tests: auth guards, empty-state paths, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mock @forge/db ────────────────────────────────────────────────────────────

const mockPrisma = {
  followUp: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  quotation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  quotationRevision: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
  pOLineItem: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  salesOrder: {
    findMany: vi.fn(),
  },
  activity: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
}

vi.mock('@forge/db', () => ({ prisma: mockPrisma }))

// ─── Mock Clerk auth ───────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }))

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(method = 'GET', body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

// ─── Follow-ups route ─────────────────────────────────────────────────────────

describe('GET /api/follow-ups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty state when no follow-ups exist', async () => {
    mockPrisma.followUp.findMany.mockResolvedValue([])
    const { GET } = await import('@/app/api/follow-ups/route')
    const req = makeReq('GET')
    const res = await GET(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.followUps).toHaveLength(0)
    expect(json.kpis.active).toBe(0)
    expect(json.kpis.overdue).toBe(0)
  })

  it('computes KPIs correctly from follow-up data', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 86400_000)
    const future = new Date(now.getTime() + 86400_000)
    mockPrisma.followUp.findMany.mockResolvedValue([
      {
        id: '1',
        type: 'WALK_IN',
        customerName: 'Test A',
        customerPhone: '9999999999',
        customerType: 'RETAIL',
        brandsInterested: ['Grohe'],
        productsNoted: null,
        estimatedBudget: null,
        projectName: null,
        quotationId: null,
        quotationNumber: null,
        quotationValue: null,
        status: 'PENDING',
        nextFollowUpDate: past,
        lastContactedAt: null,
        notes: null,
        assignedTo: null,
        createdAt: now,
        updatedAt: now,
        responses: [],
      },
      {
        id: '2',
        type: 'WALK_IN',
        customerName: 'Test B',
        customerPhone: '8888888888',
        customerType: 'RETAIL',
        brandsInterested: [],
        productsNoted: null,
        estimatedBudget: 50000,
        projectName: null,
        quotationId: null,
        quotationNumber: null,
        quotationValue: 50000,
        status: 'WON',
        nextFollowUpDate: future,
        lastContactedAt: null,
        notes: null,
        assignedTo: null,
        createdAt: now,
        updatedAt: now,
        responses: [],
      },
    ])
    const { GET } = await import('@/app/api/follow-ups/route')
    const res = await GET(makeReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.followUps).toHaveLength(2)
    // active = only PENDING (not WON/LOST)
    expect(json.kpis.active).toBe(1)
    // overdue = PENDING with past date
    expect(json.kpis.overdue).toBe(1)
  })
})

describe('POST /api/follow-ups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 422 for invalid body', async () => {
    const { POST } = await import('@/app/api/follow-ups/route')
    const req = makeReq('POST', { customerName: '' }) // fails min(1) validation
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('creates follow-up and returns 201', async () => {
    const now = new Date()
    mockPrisma.followUp.findFirst.mockResolvedValue(null)
    mockPrisma.followUp.create.mockResolvedValue({
      id: 'fu-1',
      type: 'WALK_IN',
      customerName: 'Alice',
      customerPhone: '9123456789',
      customerType: 'RETAIL',
      brandsInterested: ['Grohe'],
      status: 'PENDING',
      nextFollowUpDate: now,
      createdAt: now,
      updatedAt: now,
      responses: [],
    })
    const { POST } = await import('@/app/api/follow-ups/route')
    const req = makeReq('POST', {
      customerName: 'Alice',
      customerPhone: '9123456789',
      nextFollowUpDate: now.toISOString(),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.followUp.id).toBe('fu-1')
  })

  it('returns existing follow-up if quotationId already exists', async () => {
    const existing = { id: 'existing-fu', responses: [] }
    mockPrisma.followUp.findFirst.mockResolvedValue(existing)
    const { POST } = await import('@/app/api/follow-ups/route')
    const req = makeReq('POST', {
      customerName: 'Bob',
      customerPhone: '9000000000',
      nextFollowUpDate: new Date().toISOString(),
      quotationId: 'q-123',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.followUp.id).toBe('existing-fu')
    expect(mockPrisma.followUp.create).not.toHaveBeenCalled()
  })
})

// ─── Quotations route (auth guard) ────────────────────────────────────────────

describe('GET /api/quotations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })
    const { GET } = await import('@/app/api/quotations/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns quotation list when authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.quotationRevision.findMany.mockResolvedValue([])
    const { GET } = await import('@/app/api/quotations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    // Route returns the list directly (an array), not wrapped in { quotations: [] }
    expect(Array.isArray(json)).toBe(true)
  })
})

// ─── Dashboard route ──────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty mock when all DB queries return empty', async () => {
    mockPrisma.followUp.count.mockResolvedValue(0)
    mockPrisma.quotation.findMany.mockResolvedValue([])
    mockPrisma.pOLineItem.aggregate.mockResolvedValue({ _sum: {} })
    mockPrisma.salesOrder.findMany.mockResolvedValue([])
    mockPrisma.activity.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.$queryRaw.mockResolvedValue([])
    const { GET } = await import('@/app/api/dashboard/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.kpis).toBeDefined()
    expect(json.kpis.activeFollowUps).toBe(0)
  })
})

// ─── Products route ───────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with empty product list when DB is empty', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    const { GET } = await import('@/app/api/products/route')
    const req = makeReq('GET')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('returns 500 on DB error', async () => {
    mockPrisma.product.findMany.mockRejectedValue(new Error('DB connection failed'))
    const { GET } = await import('@/app/api/products/route')
    const req = makeReq('GET')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal error')
  })
})
