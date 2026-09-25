import { describe, expect, it } from 'vitest'
import { calculateInvoiceTotals, formatCurrency } from '@/lib/utils'
import { formatDocumentNumber } from '@/lib/server/numbering'
import { toCsv } from '@/lib/server/csv'

describe('invoice totals', () => {
  const items = [
    { quantity: 2, unitPrice: 100 },
    { quantity: 1, unitPrice: 50 },
  ]

  it('adds VAT on top when prices exclude tax', () => {
    expect(calculateInvoiceTotals(items, 5)).toEqual({ subtotal: 250, discountAmount: 0, taxAmount: 12.5, total: 262.5 })
  })

  it('applies the discount before tax', () => {
    expect(calculateInvoiceTotals(items, 5, 10)).toEqual({ subtotal: 250, discountAmount: 25, taxAmount: 11.25, total: 236.25 })
  })

  it('extracts VAT when prices include tax', () => {
    const t = calculateInvoiceTotals([{ quantity: 1, unitPrice: 105 }], 5, 0, true)
    expect(t.total).toBe(105)
    expect(t.taxAmount).toBe(5)
  })

  it('rounds to 2 decimals', () => {
    expect(calculateInvoiceTotals([{ quantity: 3, unitPrice: 0.335 }], 5).total).toBe(1.06)
  })

  it('formats currencies', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatCurrency(10, 'AED')).toContain('10.00')
  })
})

describe('document numbers', () => {
  it('pads the sequence per organization settings', () => {
    expect(formatDocumentNumber('INV', 1, 4, new Date('2026-01-02'))).toBe('INV-2026-0001')
    expect(formatDocumentNumber('QUO', 42, 6, new Date('2027-06-01'))).toBe('QUO-2027-000042')
  })
})

describe('CSV export', () => {
  it('escapes quotes, commas and newlines', () => {
    const csv = toCsv([{ a: 'x, "y"\nz' }], [{ header: 'A', value: (r) => r.a }])
    expect(csv).toBe('﻿A\r\n"x, ""y""\nz"')
  })

  it('neutralizes spreadsheet formula injection', () => {
    const csv = toCsv([{ a: '=HYPERLINK("http://evil")' }], [{ header: 'A', value: (r) => r.a }])
    expect(csv.split('\r\n')[1].startsWith(`"'=`)).toBe(true)
  })
})
