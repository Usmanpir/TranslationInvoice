import 'server-only'
import crypto from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { FALLBACK_PLAN, TRIAL } from '@/lib/plans'

type Db = Prisma.TransactionClient | PrismaClient

export function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace'
  )
}

async function uniqueSlug(db: Db, name: string) {
  const base = slugify(name)
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${crypto.randomBytes(3).toString('hex')}`
    const exists = await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`
}

export interface NewOrganizationInput {
  ownerId: string
  name: string
  country?: string
  phone?: string
  email?: string
  address?: string
  taxNumber?: string
  defaultCurrency?: string
  /** Start a free trial (only a user's first workspace gets one). Otherwise starts on Free. */
  trial?: boolean
}

/**
 * Creates an organization with its owner membership and a trial subscription.
 * Must run inside a transaction together with the user creation.
 */
export async function provisionOrganization(db: Db, input: NewOrganizationInput) {
  const now = new Date()
  const trialEnd = new Date(now.getTime() + TRIAL.days * 24 * 60 * 60 * 1000)

  const organization = await db.organization.create({
    data: {
      name: input.name.trim(),
      slug: await uniqueSlug(db, input.name),
      country: input.country || 'AE',
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      taxNumber: input.taxNumber || null,
      defaultCurrency: input.defaultCurrency || 'AED',
      // Non-UAE businesses start without a default VAT rate; they can set theirs during onboarding.
      defaultTaxRate: !input.country || input.country === 'AE' ? 5 : 0,
      memberships: { create: { userId: input.ownerId, role: 'OWNER' } },
      subscription: {
        create:
          input.trial === false
            ? { plan: FALLBACK_PLAN, status: 'ACTIVE', currentPeriodStart: now }
            : {
                plan: TRIAL.plan,
                status: 'TRIALING',
                trialStart: now,
                trialEnd,
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
              },
      },
    },
  })

  await db.user.update({ where: { id: input.ownerId }, data: { lastOrganizationId: organization.id } })
  return organization
}
