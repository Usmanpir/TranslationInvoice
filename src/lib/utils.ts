import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add a currency here (and nowhere else) to support it across forms, PDFs and validation.
export const CURRENCIES = {
  AED: { code: 'AED', symbol: 'AED', label: 'AED (Dirham)', locale: 'ar-AE' },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar (USD)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro (EUR)', locale: 'de-DE' },
} as const

export type CurrencyCode = keyof typeof CURRENCIES
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]]

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES
}

export function formatCurrency(amount: number, currency: string = 'AED'): string {
  const code = isCurrencyCode(currency) ? currency : 'AED'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string, pattern = 'MMM dd, yyyy'): string {
  return format(new Date(date), pattern)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Document totals.
 * - Exclusive (default): tax is added on top of the discounted subtotal.
 * - Inclusive: line prices already contain tax; the tax portion is extracted.
 * `subtotal` is always the plain sum of line totals.
 */
export function calculateInvoiceTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number = 0,
  discount: number = 0,
  taxInclusive: boolean = false
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const discountAmount = subtotal * (discount / 100)
  const afterDiscount = subtotal - discountAmount

  const taxAmount = taxInclusive ? afterDiscount - afterDiscount / (1 + taxRate / 100) : afterDiscount * (taxRate / 100)
  const total = taxInclusive ? afterDiscount : afterDiscount + taxAmount

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    total: round2(total),
  }
}

export const statusColors = {
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  CANCELLED: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  DRAFT: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  SENT: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  CONVERTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
}
