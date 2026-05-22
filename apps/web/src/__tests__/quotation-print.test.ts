import { describe, it, expect } from 'vitest'
import { generateQuotationPrintHTML } from '@/lib/quotation-print'
import type { LineItem } from '@/lib/mock/sales-data'

// Minimal LineItem fixture
function makeItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: '1',
    sku: 'TEST-001',
    productName: 'Test Product',
    unitPrice: 1000,
    qty: 1,
    discount: 0,
    gstRate: 18,
    section: 'Bath',
    description: '',
    imageUrl: null,
    selectedColor: null,
    ...overrides,
  } as LineItem
}

function makeData(overrides: Partial<Parameters<typeof generateQuotationPrintHTML>[0]> = {}) {
  return {
    number: 'Q-2026-0001',
    customerName: 'Test Customer',
    customerPhone: '9999999999',
    createdBy: 'Sales Rep',
    createdAt: new Date('2026-01-01'),
    lineItems: [makeItem()],
    brandLabel: 'GROHE',
    ...overrides,
  }
}

// ── XSS regression tests (stored XSS fix: esc() applied to all user fields) ──

describe('generateQuotationPrintHTML — XSS escaping', () => {
  it('escapes < > in customerName', () => {
    const html = generateQuotationPrintHTML(makeData({ customerName: '<script>alert(1)</script>' }))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes < > in brandLabel', () => {
    const html = generateQuotationPrintHTML(makeData({ brandLabel: '<img src=x onerror=alert(1)>' }))
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;IMG')
  })

  it('escapes " in customerName (attribute injection)', () => {
    const html = generateQuotationPrintHTML(makeData({ customerName: '" onload="alert(1)' }))
    expect(html).toContain('&quot;')
    expect(html).not.toContain('" onload="')
  })

  it('escapes & in customerName', () => {
    const html = generateQuotationPrintHTML(makeData({ customerName: 'A & B Corp' }))
    expect(html).toContain('A &amp; B Corp')
  })

  it('escapes section name from line item', () => {
    const html = generateQuotationPrintHTML(makeData({
      lineItems: [makeItem({ section: '<script>bad</script>' })],
    }))
    expect(html).not.toContain('<script>bad</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes productName in detail rows', () => {
    const html = generateQuotationPrintHTML(makeData({
      lineItems: [makeItem({ productName: '<b>XSS</b>' })],
    }))
    expect(html).not.toContain('<b>XSS</b>')
    expect(html).toContain('&lt;b&gt;XSS&lt;/b&gt;')
  })

  it('safe input passes through unchanged (no double-escaping)', () => {
    const html = generateQuotationPrintHTML(makeData({ customerName: 'John Doe' }))
    expect(html).toContain('John Doe')
    expect(html).not.toContain('John &amp; Doe')
  })
})

// ── Structural sanity tests ──

describe('generateQuotationPrintHTML — structure', () => {
  it('returns valid HTML document', () => {
    const html = generateQuotationPrintHTML(makeData())
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })

  it('includes quotation number in title', () => {
    const html = generateQuotationPrintHTML(makeData({ number: 'Q-2026-0042' }))
    expect(html).toContain('Q-2026-0042')
  })

  it('groups line items by section', () => {
    const html = generateQuotationPrintHTML(makeData({
      lineItems: [
        makeItem({ section: 'Kitchen', productName: 'Faucet' }),
        makeItem({ section: 'Bath', productName: 'Shower' }),
      ],
    }))
    expect(html).toContain('Kitchen')
    expect(html).toContain('Bath')
  })
})
