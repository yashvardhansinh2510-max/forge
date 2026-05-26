import { describe, it, expect } from 'vitest'
import {
  createEmptyHeaderCounts,
  createEmptyBrandCounts,
  normalizeBrandTab,
  getBrandTabForBrand,
  getBrandSectionKey,
  getBrandsForTab,
  matchesBrandTab,
  countsFromDbLine,
  addCounts,
  computeHeaderCounts,
  computeBrandCounts,
  getStageQuantity,
  getActiveStages,
  getVisibleMoveStages,
  getOverflowStages,
  type PurchaseTrackerLine,
} from '@/lib/purchases-tracker'

function makeLine(overrides: Partial<PurchaseTrackerLine> = {}): PurchaseTrackerLine {
  return {
    id: 'l1',
    poId: 'po1',
    poNumber: 'PO-001',
    vendorName: null,
    projectId: null,
    customer: null,
    product: { id: 'p1', sku: 'GRO-001', name: 'Grohe Mixer', brand: 'GROHE', imageUrl: null },
    qtyOrdered: 10,
    qtyReceived: 0,
    stages: createEmptyHeaderCounts(),
    ...overrides,
  }
}

describe('createEmptyHeaderCounts', () => {
  it('returns zero for all stages', () => {
    const c = createEmptyHeaderCounts()
    expect(Object.values(c).every((v) => v === 0)).toBe(true)
  })
})

describe('createEmptyBrandCounts', () => {
  it('returns zero for ALL and each brand tab', () => {
    const c = createEmptyBrandCounts()
    expect(c.ALL).toBe(0)
    expect(c.GROHE).toBe(0)
    expect(c.HANSGROHE).toBe(0)
    expect(c.VITRA).toBe(0)
    expect(c.GEBERIT).toBe(0)
  })
})

describe('normalizeBrandTab', () => {
  it('returns ALL for null', () => expect(normalizeBrandTab(null)).toBe('ALL'))
  it('returns ALL for undefined', () => expect(normalizeBrandTab(undefined)).toBe('ALL'))
  it('returns ALL for empty string', () => expect(normalizeBrandTab('')).toBe('ALL'))
  it('returns ALL for unknown value', () => expect(normalizeBrandTab('UNKNOWN_XYZ')).toBe('ALL'))
  it('KAJARIA is now a known tab', () => expect(normalizeBrandTab('KAJARIA')).toBe('KAJARIA'))
  it('is case-insensitive', () => expect(normalizeBrandTab('grohe')).toBe('GROHE'))
  it('returns valid tab unchanged', () => expect(normalizeBrandTab('VITRA')).toBe('VITRA'))
})

describe('getBrandTabForBrand', () => {
  it('AXOR maps to HANSGROHE', () => expect(getBrandTabForBrand('AXOR')).toBe('HANSGROHE'))
  it('HANSGROHE maps to HANSGROHE', () => expect(getBrandTabForBrand('HANSGROHE')).toBe('HANSGROHE'))
  it('GROHE maps to GROHE', () => expect(getBrandTabForBrand('GROHE')).toBe('GROHE'))
  it('VITRA maps to VITRA', () => expect(getBrandTabForBrand('VITRA')).toBe('VITRA'))
  it('GEBERIT maps to GEBERIT', () => expect(getBrandTabForBrand('GEBERIT')).toBe('GEBERIT'))
  it('KAJARIA maps to KAJARIA', () => expect(getBrandTabForBrand('KAJARIA')).toBe('KAJARIA'))
  it('unknown brand returns null', () => expect(getBrandTabForBrand('UNKNOWN_XYZ')).toBeNull())
})

describe('getBrandSectionKey', () => {
  it('returns tab for known brand', () => expect(getBrandSectionKey('AXOR')).toBe('HANSGROHE'))
  it('returns brand itself for unknown', () => expect(getBrandSectionKey('UNKNOWN_XYZ')).toBe('UNKNOWN_XYZ'))
})

describe('getBrandsForTab', () => {
  it('returns null for ALL', () => expect(getBrandsForTab('ALL')).toBeNull())
  it('returns HANSGROHE and AXOR for HANSGROHE tab', () => {
    expect(getBrandsForTab('HANSGROHE')).toContain('HANSGROHE')
    expect(getBrandsForTab('HANSGROHE')).toContain('AXOR')
  })
  it('returns just GROHE for GROHE tab', () => expect(getBrandsForTab('GROHE')).toEqual(['GROHE']))
})

describe('matchesBrandTab', () => {
  it('ALL tab matches any brand', () => expect(matchesBrandTab('KAJARIA', 'ALL')).toBe(true))
  it('HANSGROHE tab matches AXOR', () => expect(matchesBrandTab('AXOR', 'HANSGROHE')).toBe(true))
  it('GROHE tab does not match VITRA', () => expect(matchesBrandTab('VITRA', 'GROHE')).toBe(false))
})

describe('countsFromDbLine', () => {
  it('computes NEEDS_PO as max(0, ordered - staged)', () => {
    const c = countsFromDbLine({
      qtyOrdered:    10,
      qtyPendingCo:  3,
      qtyAtGodown:   2,
      qtyInBox:      1,
      qtyDispatched: 0,
    })
    expect(c.NEEDS_PO).toBe(4)
  })

  it('NEEDS_PO floors at 0 (never negative)', () => {
    const c = countsFromDbLine({
      qtyOrdered:    5,
      qtyPendingCo:  3,
      qtyAtGodown:   3,
      qtyInBox:      0,
      qtyDispatched: 0,
    })
    expect(c.NEEDS_PO).toBe(0)
  })

  it('passes staged quantities through directly', () => {
    const c = countsFromDbLine({
      qtyOrdered:    10,
      qtyPendingCo:  2,
      qtyAtGodown:   3,
      qtyInBox:      1,
      qtyDispatched: 2,
    })
    expect(c.ORDERED).toBe(2)
    expect(c.AT_GODOWN).toBe(3)
    expect(c.DISPATCHED).toBe(2)
  })
})

describe('addCounts', () => {
  it('adds each stage independently', () => {
    const a = { ...createEmptyHeaderCounts(), AT_GODOWN: 3, ORDERED: 1 }
    const b = { ...createEmptyHeaderCounts(), AT_GODOWN: 2, DISPATCHED: 5 }
    const result = addCounts(a, b)
    expect(result.AT_GODOWN).toBe(5)
    expect(result.ORDERED).toBe(1)
    expect(result.DISPATCHED).toBe(5)
  })
})

describe('computeHeaderCounts', () => {
  it('returns empty counts for empty array', () => {
    expect(computeHeaderCounts([])).toEqual(createEmptyHeaderCounts())
  })

  it('sums stages across multiple lines', () => {
    const l1 = makeLine({ stages: { ...createEmptyHeaderCounts(), AT_GODOWN: 2 } })
    const l2 = makeLine({ stages: { ...createEmptyHeaderCounts(), AT_GODOWN: 3, DISPATCHED: 1 } })
    const result = computeHeaderCounts([l1, l2])
    expect(result.AT_GODOWN).toBe(5)
    expect(result.DISPATCHED).toBe(1)
  })
})

describe('computeBrandCounts', () => {
  it('ALL increments for every line', () => {
    const l1 = makeLine({ product: { id: 'p1', sku: 's1', name: 'n', brand: 'GROHE', imageUrl: null } })
    const l2 = makeLine({ product: { id: 'p2', sku: 's2', name: 'n', brand: 'VITRA', imageUrl: null } })
    const c = computeBrandCounts([l1, l2])
    expect(c.ALL).toBe(2)
    expect(c.GROHE).toBe(1)
    expect(c.VITRA).toBe(1)
  })

  it('unknown brand increments ALL but not any specific tab', () => {
    const l = makeLine({ product: { id: 'p1', sku: 's1', name: 'n', brand: 'KAJARIA', imageUrl: null } })
    const c = computeBrandCounts([l])
    expect(c.ALL).toBe(1)
    expect(c.GROHE).toBe(0)
  })
})

describe('getStageQuantity', () => {
  it('returns stage value from line', () => {
    const l = makeLine({ stages: { ...createEmptyHeaderCounts(), AT_GODOWN: 7 } })
    expect(getStageQuantity(l, 'AT_GODOWN')).toBe(7)
  })
})

describe('getActiveStages / getVisibleMoveStages / getOverflowStages', () => {
  const l = makeLine({
    stages: {
      NEEDS_PO:   2,
      ORDERED:    1,
      AT_GODOWN:  3,
      IN_BOX:     0,
      DISPATCHED: 1,
    },
  })

  it('getActiveStages returns only non-zero stages in order', () => {
    expect(getActiveStages(l)).toEqual(['NEEDS_PO', 'ORDERED', 'AT_GODOWN', 'DISPATCHED'])
  })

  it('getVisibleMoveStages returns first two active stages', () => {
    expect(getVisibleMoveStages(l)).toEqual(['NEEDS_PO', 'ORDERED'])
  })

  it('getOverflowStages returns stages beyond the first two', () => {
    expect(getOverflowStages(l)).toEqual(['AT_GODOWN', 'DISPATCHED'])
  })
})
