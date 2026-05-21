import { describe, it, expect } from 'vitest'
import { mapToPOSProduct, type ProductApiItem } from '@/lib/pos-catalog'

const base: ProductApiItem = {
  id: 'p1',
  sku: 'GRO-001',
  articleNumber: '32854000',
  name: 'Grohtherm 800',
  description: 'Thermostatic shower mixer',
  brand: 'GROHE',
  category: 'THERMOSTAT',
  subcategory: null,
  seriesName: 'Grohtherm',
  finishName: 'Chrome',
  mrp: 25000,
  unit: 'pcs',
  gstRate: 28,
  tier: 'PREMIUM',
  isActive: true,
  variants: [],
  concealedPartId: null,
  imageUrl: null,
}

describe('mapToPOSProduct', () => {
  it('maps GROHE brand key to display name and color', () => {
    const p = mapToPOSProduct(base)
    expect(p.brand).toBe('Grohe')
    expect(p.brandColor).toBe('#009FE3')
  })

  it('maps THERMOSTAT category to label', () => {
    const p = mapToPOSProduct(base)
    expect(p.category).toBe('Thermostats')
  })

  it('maps PREMIUM tier', () => {
    const p = mapToPOSProduct(base)
    expect(p.tier).toBe('premium')
  })

  it('uses seriesName as subCategory', () => {
    const p = mapToPOSProduct(base)
    expect(p.subCategory).toBe('Grohtherm')
  })

  it('maps variant finishes from array', () => {
    const p = mapToPOSProduct({
      ...base,
      variants: [{ name: 'Chrome', code: 'CR', color: '#C8D0D8', priceAdj: 0 }],
    })
    expect(p.finishes).toHaveLength(1)
    expect(p.finishes[0].name).toBe('Chrome')
    expect(p.defaultFinish).toBe('Chrome')
  })

  it('handles non-array variants gracefully', () => {
    const p = mapToPOSProduct({ ...base, variants: null })
    expect(p.finishes).toHaveLength(0)
    expect(p.defaultFinish).toBe('')
  })

  it('sets requiresPartIds when concealedPartId present', () => {
    const p = mapToPOSProduct({ ...base, concealedPartId: 'PART-001' })
    expect(p.requiresPartIds).toEqual(['PART-001'])
  })

  it('falls back to brand key when unknown brand', () => {
    const p = mapToPOSProduct({ ...base, brand: 'UNKNOWN_BRAND' })
    expect(p.brand).toBe('UNKNOWN_BRAND')
    expect(p.brandColor).toBe('#6B7280')
  })

  it('defaults tier to mid when unknown', () => {
    const p = mapToPOSProduct({ ...base, tier: 'UNKNOWN' })
    expect(p.tier).toBe('mid')
  })
})
