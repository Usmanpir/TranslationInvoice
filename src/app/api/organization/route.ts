import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest } from '@/lib/server/errors'
import { hasFeature, requireFeature } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { CURRENCY_CODES } from '@/lib/utils'

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

const settingsSchema = z
  .object({
    // Company
    name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(160),
    email: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable()
      .transform((v) => v || null)
      .refine((v) => !v || z.string().email().safeParse(v).success, 'Invalid email address'),
    phone: text(50),
    website: text(200).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), 'Website must start with http:// or https://'),
    address: text(1000),
    country: z.string().trim().length(2).toUpperCase(),
    // Tax
    taxNumber: text(50),
    taxLabel: z.string().trim().min(1).max(20),
    defaultTaxRate: z.number().min(0).max(100),
    taxInclusive: z.boolean(),
    // Banking
    bankName: text(120),
    bankBranch: text(120),
    bankAccountName: text(120),
    bankAccountNumber: text(60),
    iban: text(50).transform((v) => (v ? v.replace(/\s+/g, '').toUpperCase() : v)),
    swiftCode: text(20).transform((v) => (v ? v.toUpperCase() : v)),
    paypalEmail: text(200),
    paymentInstructions: text(2000),
    // Invoice preferences
    defaultCurrency: z.enum(CURRENCY_CODES),
    invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, 'Prefix: 1–10 letters or numbers').transform((v) => v.toUpperCase()),
    quotationPrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, 'Prefix: 1–10 letters or numbers').transform((v) => v.toUpperCase()),
    invoiceNextNumber: z.number().int().min(1).max(99_999_999),
    quotationNextNumber: z.number().int().min(1).max(99_999_999),
    numberPadding: z.number().int().min(1).max(8),
    paymentTermsDays: z.number().int().min(0).max(365),
    defaultNotes: text(5000),
    invoiceFooter: text(500),
    // Locale
    timezone: z.string().max(64),
    dateFormat: z.enum(['MMM dd, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
    // Branding (plan-gated)
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex value like #0070c7'),
    logoUploadId: z.string().max(40).nullable(),
  })
  .partial()

export const GET = route(async () => {
  const ctx = await requireOrganization({ permission: 'settings.view' })
  const o = ctx.organization
  return {
    ...o,
    logoUrl: o.logoUploadId ? `/api/files/${o.logoUploadId}` : null,
    canCustomizeBranding: hasFeature(ctx, 'customBranding'),
  }
})

export const PUT = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'settings.manage', write: true })
  const org = ctx.organization
  const data = await parseJson(request, settingsSchema)

  const brandingChanged =
    (data.primaryColor !== undefined && data.primaryColor !== org.primaryColor) ||
    (data.logoUploadId !== undefined && data.logoUploadId !== org.logoUploadId)
  if (brandingChanged) requireFeature(ctx, 'customBranding')

  if (data.logoUploadId) {
    const logo = await prisma.upload.findFirst({
      where: { id: data.logoUploadId, organizationId: org.id, purpose: 'LOGO' },
      select: { id: true },
    })
    if (!logo) throw badRequest('Logo not found. Please upload it again.')
  }

  if (data.timezone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: data.timezone })
    } catch {
      throw badRequest('Unknown timezone.')
    }
  }

  const updated = await prisma.organization.update({ where: { id: org.id }, data })
  await audit({
    organizationId: org.id,
    userId: ctx.user.id,
    action: brandingChanged ? 'branding.updated' : 'settings.updated',
    entityType: 'organization',
    entityId: org.id,
    metadata: { fields: Object.keys(data) },
  })
  return { ...updated, logoUrl: updated.logoUploadId ? `/api/files/${updated.logoUploadId}` : null }
})
