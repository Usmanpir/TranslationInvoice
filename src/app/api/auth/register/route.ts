import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { ApiError } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { provisionOrganization } from '@/lib/server/organizations'
import { passwordSchema } from '@/lib/server/schemas'
import { audit } from '@/lib/server/audit'
import { sendEmail } from '@/lib/server/email'
import { CURRENCY_CODES } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(200),
  password: passwordSchema,
  companyName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(160),
  country: z.string().trim().length(2).toUpperCase().default('AE'),
  phone: z.string().trim().max(50).optional().transform((v) => v || undefined),
  currency: z.enum(CURRENCY_CODES).default('AED'),
  taxNumber: z.string().trim().max(50).optional().transform((v) => v || undefined),
  address: z.string().trim().max(1000).optional().transform((v) => v || undefined),
})

export const POST = route(async (request) => {
  await enforceRateLimit(`register:${clientIp(request)}`, 5, 60 * 60)
  const data = await parseJson(request, registerSchema)

  const existing = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) {
    throw new ApiError('CONFLICT', 'An account with this email already exists. Try signing in instead.', {
      details: { field: 'email' },
    })
  }

  const password = await bcrypt.hash(data.password, 12)

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, password, phone: data.phone },
      select: { id: true, name: true, email: true },
    })
    const organization = await provisionOrganization(tx, {
      ownerId: user.id,
      name: data.companyName,
      country: data.country,
      phone: data.phone,
      email: data.email,
      address: data.address,
      taxNumber: data.taxNumber,
      defaultCurrency: data.currency,
    })
    return { user, organization }
  })

  await audit({
    organizationId: organization.id,
    userId: user.id,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { name: organization.name },
    ipAddress: clientIp(request),
  })
  await sendEmail(user.email, 'welcome', { name: user.name, organizationName: organization.name })

  return { user, organization: { id: organization.id, name: organization.name } }
})
