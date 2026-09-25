import 'server-only'
import { z } from 'zod'
import type { Organization } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CURRENCY_CODES, calculateInvoiceTotals } from '@/lib/utils'
import { ApiError, notFound } from './errors'
import { hasFeature } from './subscription'
import type { OrgContext } from './context'

// ───────────────────────────── Validation ─────────────────────────────

export const dateString = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null))

export const itemSchema = z.object({
  code: z.string().trim().max(50).nullish().transform((v) => v || null),
  description: z.string().trim().min(1, 'Every line item needs a description').max(500),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).positive('Quantity must be greater than 0').max(1_000_000_000),
  unitPrice: z.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative').max(1_000_000_000_000),
})

export const documentFieldsSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  notes: optionalText(5000),
  currency: z.enum(CURRENCY_CODES),
  salesperson: optionalText(120),
  completionDays: optionalText(60),
  taxRate: z.number().min(0).max(100),
  taxInclusive: z.boolean().optional(),
  discount: z.number().min(0).max(100),
  items: z.array(itemSchema).min(1, 'Add at least one line item').max(200, 'Too many line items'),
})

export type DocumentFields = z.infer<typeof documentFieldsSchema>
export type DocumentItem = z.infer<typeof itemSchema>

// ───────────────────────────── Helpers ─────────────────────────────

export async function assertCustomerInOrg(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true },
  })
  if (!customer) throw notFound('Customer')
}

/** Currencies other than the workspace default require the multi-currency feature. */
export function assertCurrencyAllowed(ctx: OrgContext, currency: string, previous?: string) {
  if (currency === ctx.organization.defaultCurrency || currency === previous) return
  if (hasFeature(ctx, 'multiCurrency')) return
  throw new ApiError('FEATURE_UNAVAILABLE', `Billing in ${currency} requires a plan with multiple currencies.`, {
    details: {
      feature: 'multiCurrency',
      featureLabel: 'Multiple currencies',
      plan: ctx.entitlements.plan.id,
      planName: ctx.entitlements.plan.name,
      suggestedPlan: 'professional',
      suggestedPlanName: 'Professional',
      lapsed: ctx.entitlements.lapsed,
    },
  })
}

export function buildLineItems(items: DocumentItem[]) {
  return items.map((item) => ({
    code: item.code,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }))
}

export function computeTotals(fields: Pick<DocumentFields, 'items' | 'taxRate' | 'discount' | 'taxInclusive'>) {
  return calculateInvoiceTotals(fields.items, fields.taxRate, fields.discount, fields.taxInclusive ?? false)
}

/**
 * The "From" block printed on documents. Custom logo/colour only apply on plans
 * with custom branding; everything else is always the workspace's own details.
 */
export function issuerFor(org: Organization, branded: boolean) {
  return {
    name: org.name,
    email: org.email,
    phone: org.phone,
    website: org.website,
    address: org.address,
    taxNumber: org.taxNumber,
    taxLabel: org.taxLabel,
    bankName: org.bankName,
    bankBranch: org.bankBranch,
    bankAccountName: org.bankAccountName,
    bankAccountNumber: org.bankAccountNumber,
    iban: org.iban,
    swiftCode: org.swiftCode,
    paypalEmail: org.paypalEmail,
    paymentInstructions: org.paymentInstructions,
    invoiceFooter: org.invoiceFooter,
    logoUrl: branded && org.logoUploadId ? `/api/files/${org.logoUploadId}` : null,
    primaryColor: branded ? org.primaryColor : '#0070c7',
  }
}

export type Issuer = ReturnType<typeof issuerFor>
