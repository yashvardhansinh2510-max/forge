import { describe, it, expect, beforeEach } from 'vitest'
import {
  getFallbackLines,
  getFallbackCustomersForProduct,
  moveFallbackLine,
  shouldUseFallback,
  resetFallbackOrders,
} from '@/lib/purchases-fallback'
import { AppError } from '@/lib/errors'

beforeEach(() => {
  resetFallbackOrders()
})

describe('getFallbackLines', () => {
  it('returns empty response when no mock orders exist', () => {
    const result = getFallbackLines('ALL')
    expect(result.lines).toHaveLength(0)
    expect(result.headerCounts.ORDER_IN_CO).toBe(0)
    expect(result.brandCounts.ALL).toBe(0)
  })

  it('filters by brand when not ALL', () => {
    const result = getFallbackLines('GROHE')
    expect(result.lines.every((l) => ['GROHE'].includes(l.product.brand))).toBe(true)
  })
})

describe('getFallbackCustomersForProduct', () => {
  it('returns empty array when no orders exist', () => {
    expect(getFallbackCustomersForProduct('any-product-id')).toEqual([])
  })
})

describe('moveFallbackLine', () => {
  it('throws NOT_FOUND for unknown lineId', () => {
    expect(() =>
      moveFallbackLine({ lineId: 'ghost', fromStage: 'ORDER_IN_CO', toStage: 'CO_BILLING', qty: 1, brand: 'ALL' })
    ).toThrow(AppError)

    try {
      moveFallbackLine({ lineId: 'ghost', fromStage: 'ORDER_IN_CO', toStage: 'CO_BILLING', qty: 1, brand: 'ALL' })
    } catch (e) {
      expect((e as AppError).code).toBe('NOT_FOUND')
      expect((e as AppError).statusCode).toBe(404)
    }
  })
})

describe('shouldUseFallback', () => {
  it('returns true when error message matches database unreachable', () => {
    expect(shouldUseFallback(new Error("Can't reach database server"))).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(shouldUseFallback(new Error("CAN'T REACH DATABASE SERVER"))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(shouldUseFallback(new Error('Connection timeout'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(shouldUseFallback('string error')).toBe(false)
    expect(shouldUseFallback(null)).toBe(false)
    expect(shouldUseFallback(42)).toBe(false)
  })
})

describe('resetFallbackOrders', () => {
  it('can be called multiple times without error', () => {
    expect(() => {
      resetFallbackOrders()
      resetFallbackOrders()
    }).not.toThrow()
  })
})
