import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { requireSuperAdmin } from '@/lib/server/context'
import { ApiError, badRequest, notFound } from '@/lib/server/errors'
import { getUsage } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { addInterval, applySubscriptionChange } from '@/lib/server/billing'
import { PLAN_ORDER } from '@/lib/plans'

type Params = { id: string }

export const GET = route<Params>(async (_request, { params }) => {
  await requireSuperAdmin()
  const { id } = await params
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: true,
      memberships: { include: { user: { select: { id: true, name: true, email: true, createdAt: true } } }, orderBy: { createdAt: 'asc' } },
      _count: { select: { customers: true, invoices: true, quotations: true, payments: true } },
    },
  })
  if (!org) throw notFound('Organization')

  const [usage, billingPayments, billingEvents, activity] = await Promise.all([
    getUsage(id),
    prisma.billingPayment.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.billingEvent.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, type: true, provider: true, processedAt: true, error: true, createdAt: true } }),
    prisma.auditLog.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 25, include: { user: { select: { id: true, name: true, email: true } } } }),
  ])
  return { organization: org, usage, billingPayments, billingEvents, activity }
})

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend'), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal('activate') }),
  z.object({
    action: z.literal('change_plan'),
    plan: z.enum(PLAN_ORDER as ['free', 'starter', 'professional', 'business']),
    interval: z.enum(['MONTH', 'YEAR']).default('MONTH'),
    months: z.number().int().min(1).max(36).optional(),
  }),
  z.object({ action: z.literal('extend_trial'), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal('confirm_payment'), paymentId: z.string().min(1) }),
  z.object({ action: z.literal('delete'), confirm: z.string() }),
])

/** Administrative actions on a tenant. Every action is audited with the admin's identity. */
export const POST = route<Params>(async (request, { params }) => {
  const admin = await requireSuperAdmin()
  const { id } = await params
  const org = await prisma.organization.findUnique({ where: { id }, include: { subscription: true } })
  if (!org) throw notFound('Organization')
  const body = await parseJson(request, actionSchema)
  const ip = clientIp(request)
  const base = { organizationId: id, userId: admin.id, entityType: 'organization', entityId: id, ipAddress: ip }

  switch (body.action) {
    case 'suspend': {
      await prisma.organization.update({ where: { id }, data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendedReason: body.reason ?? null } })
      await audit({ ...base, action: 'organization.suspended', metadata: { reason: body.reason ?? null, by: admin.email } })
      return { status: 'SUSPENDED' }
    }
    case 'activate': {
      await prisma.organization.update({ where: { id }, data: { status: 'ACTIVE', suspendedAt: null, suspendedReason: null } })
      await audit({ ...base, action: 'organization.activated', metadata: { by: admin.email } })
      return { status: 'ACTIVE' }
    }
    case 'change_plan': {
      if (org.subscription?.provider === 'STRIPE' && org.subscription.status === 'ACTIVE') {
        throw badRequest('This workspace pays by card. Change the plan in Stripe (or cancel it there) so billing stays in sync.')
      }
      const now = new Date()
      const periodEnd = body.plan === 'free' ? null : body.months ? new Date(new Date(now).setMonth(now.getMonth() + body.months)) : addInterval(now, body.interval)
      await applySubscriptionChange({
        organizationId: id,
        plan: body.plan,
        interval: body.interval,
        status: 'ACTIVE',
        provider: body.plan === 'free' ? 'NONE' : 'MANUAL',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        // Manual plans simply lapse at currentPeriodEnd (see resolveEntitlements).
        cancelAtPeriodEnd: false,
        trialEnd: null,
        actorUserId: admin.id,
        source: 'saas_admin.change_plan',
      })
      await audit({ ...base, action: 'organization.plan_changed', metadata: { plan: body.plan, interval: body.interval, until: periodEnd, by: admin.email } })
      return { plan: body.plan, currentPeriodEnd: periodEnd }
    }
    case 'extend_trial': {
      const sub = org.subscription
      if (sub && !['TRIALING', 'EXPIRED'].includes(sub.status)) throw badRequest('Only trials (active or expired) can be extended.')
      const start = sub?.trialEnd && sub.trialEnd > new Date() ? sub.trialEnd : new Date()
      const trialEnd = new Date(start.getTime() + body.days * 24 * 60 * 60 * 1000)
      await applySubscriptionChange({
        organizationId: id,
        status: 'TRIALING',
        trialEnd,
        currentPeriodEnd: trialEnd,
        ...(!sub || sub.plan === 'free' ? { plan: 'professional' } : {}),
        actorUserId: admin.id,
        source: 'saas_admin.extend_trial',
      })
      await audit({ ...base, action: 'organization.trial_extended', metadata: { days: body.days, trialEnd, by: admin.email } })
      return { trialEnd }
    }
    case 'confirm_payment': {
      const payment = await prisma.billingPayment.findFirst({ where: { id: body.paymentId, organizationId: id, provider: 'MANUAL', status: 'PENDING' } })
      if (!payment) throw notFound('Pending bank transfer')
      const now = new Date()
      const interval = payment.interval
      const periodEnd = addInterval(now, interval)
      await prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: now, periodStart: now, periodEnd, description: payment.description?.replace(' — awaiting bank transfer', '') ?? null },
      })
      await applySubscriptionChange({
        organizationId: id,
        plan: payment.plan,
        interval,
        status: 'ACTIVE',
        provider: 'MANUAL',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        actorUserId: admin.id,
        source: 'saas_admin.confirm_bank_transfer',
      })
      await audit({ ...base, action: 'subscription.changed', metadata: { confirmedPayment: payment.providerRef, amount: payment.amount, by: admin.email } })
      return { plan: payment.plan, currentPeriodEnd: periodEnd }
    }
    case 'delete': {
      if (body.confirm !== org.name) throw new ApiError('VALIDATION_ERROR', 'Type the organization name exactly to confirm deletion.')
      if (org.subscription?.provider === 'STRIPE' && org.subscription.status === 'ACTIVE') {
        throw badRequest('Cancel the Stripe subscription first so the customer is not charged after deletion.')
      }
      // Platform-level audit entry (organizationId null) survives the cascade delete.
      await audit({ userId: admin.id, action: 'organization.deleted', entityType: 'organization', entityId: id, ipAddress: ip, metadata: { name: org.name, slug: org.slug, by: admin.email } })
      await prisma.$transaction([
        prisma.user.updateMany({ where: { lastOrganizationId: id }, data: { lastOrganizationId: null } }),
        prisma.organization.delete({ where: { id } }),
      ])
      return { deleted: true }
    }
  }
})
