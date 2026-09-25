import 'server-only'
import type { Organization, Subscription, SubscriptionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  FALLBACK_PLAN,
  FEATURE_LABELS,
  PLANS,
  RESOURCE_LABELS,
  getPlan,
  limitFor,
  suggestUpgrade,
  type Feature,
  type LimitedResource,
  type Plan,
} from '@/lib/plans'
import { ApiError } from './errors'

export interface Entitlements {
  /** Plan whose limits/features apply right now (falls back to Free when lapsed). */
  plan: Plan
  /** Plan the subscription row is on (what the customer picked / trial plan). */
  subscribedPlan: Plan
  status: SubscriptionStatus
  isTrial: boolean
  trialEnd: Date | null
  trialDaysLeft: number | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  /** True when the plan lapsed and premium features fell back to the free plan. */
  lapsed: boolean
  /** Organization or subscription suspended: data is readable, nothing can be changed. */
  readOnly: boolean
}

const DAY = 24 * 60 * 60 * 1000

export function resolveEntitlements(
  sub: (Pick<Subscription, 'plan' | 'status' | 'trialEnd' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'> & Partial<Pick<Subscription, 'provider'>>) | null,
  org: Pick<Organization, 'status'>,
  now = new Date()
): Entitlements {
  const subscribedPlan = getPlan(sub?.plan ?? FALLBACK_PLAN)
  let status: SubscriptionStatus = sub?.status ?? 'EXPIRED'

  // A trial past its end date is expired even if the row has not been updated yet.
  if (status === 'TRIALING' && sub?.trialEnd && sub.trialEnd <= now) status = 'EXPIRED'
  // Manual (bank transfer) plans have no provider to expire them: they lapse when the paid period ends.
  if (status === 'ACTIVE' && sub?.provider === 'MANUAL' && sub.currentPeriodEnd && sub.currentPeriodEnd <= now) status = 'EXPIRED'
  // A canceled subscription keeps access until the paid period ends.
  const canceledButPaid = status === 'CANCELED' && !!sub?.currentPeriodEnd && sub.currentPeriodEnd > now

  const active = status === 'TRIALING' || status === 'ACTIVE' || status === 'PAST_DUE' || canceledButPaid
  const readOnly = org.status === 'SUSPENDED' || status === 'SUSPENDED'
  const plan = active ? subscribedPlan : PLANS[FALLBACK_PLAN]

  const trialEnd = sub?.trialEnd ?? null
  const isTrial = status === 'TRIALING'
  const trialDaysLeft = isTrial && trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / DAY)) : null

  return {
    plan,
    subscribedPlan,
    status,
    isTrial,
    trialEnd,
    trialDaysLeft,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    lapsed: !active && !readOnly,
    readOnly,
  }
}

/** Persists the TRIALING → EXPIRED transition the first time it is observed. */
export async function syncExpiredTrial(organizationId: string, sub: Subscription | null, now = new Date()) {
  if (!sub || sub.status !== 'TRIALING' || !sub.trialEnd || sub.trialEnd > now) return sub
  const updated = await prisma.subscription.updateMany({
    where: { id: sub.id, status: 'TRIALING' },
    data: { status: 'EXPIRED' },
  })
  if (updated.count > 0) {
    await prisma.notification.create({
      data: {
        organizationId,
        type: 'subscription.trial_expired',
        title: 'Your free trial has ended',
        body: 'Your data is safe. Upgrade to keep using premium features and higher limits.',
        link: '/billing',
      },
    })
  }
  return { ...sub, status: 'EXPIRED' as const }
}

function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export type Usage = Record<LimitedResource, number>

export async function getUsage(organizationId: string): Promise<Usage> {
  const monthStart = startOfMonthUtc()
  const [members, pendingInvites, customers, invoices, quotations, storage] = await Promise.all([
    prisma.membership.count({ where: { organizationId } }),
    prisma.invitation.count({
      where: { organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.customer.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
    prisma.quotation.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
    prisma.upload.aggregate({ where: { organizationId }, _sum: { size: true } }),
  ])
  return {
    users: members + pendingInvites,
    customers,
    invoices,
    quotations,
    storage: Math.ceil((storage._sum.size ?? 0) / (1024 * 1024)),
  }
}

async function usageFor(organizationId: string, resource: LimitedResource): Promise<number> {
  // Only compute the counter we need on hot paths.
  const monthStart = startOfMonthUtc()
  switch (resource) {
    case 'users': {
      const [m, i] = await Promise.all([
        prisma.membership.count({ where: { organizationId } }),
        prisma.invitation.count({
          where: { organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        }),
      ])
      return m + i
    }
    case 'customers':
      return prisma.customer.count({ where: { organizationId } })
    case 'invoices':
      return prisma.invoice.count({ where: { organizationId, createdAt: { gte: monthStart } } })
    case 'quotations':
      return prisma.quotation.count({ where: { organizationId, createdAt: { gte: monthStart } } })
    case 'storage': {
      const agg = await prisma.upload.aggregate({ where: { organizationId }, _sum: { size: true } })
      return (agg._sum.size ?? 0) / (1024 * 1024)
    }
  }
}

interface EntitledContext {
  organization: { id: string }
  entitlements: Entitlements
}

/** Throws LIMIT_REACHED (with upgrade details) if creating `amount` more would exceed the plan. */
export async function checkUsageLimit(ctx: EntitledContext, resource: LimitedResource, amount = 1) {
  const plan = ctx.entitlements.plan
  const limit = limitFor(plan, resource)
  if (limit === null) return

  const used = await usageFor(ctx.organization.id, resource)
  if (used + amount <= limit) return

  const label = RESOURCE_LABELS[resource]
  const suggested = suggestUpgrade({ resource, needed: used + amount, current: plan.id })
  const period = label.perMonth ? ' this month' : ''
  throw new ApiError(
    'LIMIT_REACHED',
    resource === 'storage'
      ? `You've used your ${limit} MB of storage on the ${plan.name} plan.`
      : `You've used ${Math.round(used)} of ${limit} ${label.plural}${period} included in your ${plan.name} plan.`,
    {
      details: {
        resource,
        used: Math.round(used),
        limit,
        plan: plan.id,
        planName: plan.name,
        suggestedPlan: suggested,
        suggestedPlanName: suggested ? PLANS[suggested].name : null,
        lapsed: ctx.entitlements.lapsed,
      },
    }
  )
}

export function hasFeature(ctx: EntitledContext, feature: Feature) {
  return ctx.entitlements.plan.features.includes(feature)
}

export function requireFeature(ctx: EntitledContext, feature: Feature) {
  if (hasFeature(ctx, feature)) return
  const plan = ctx.entitlements.plan
  const suggested = suggestUpgrade({ feature, current: plan.id })
  throw new ApiError(
    'FEATURE_UNAVAILABLE',
    `${FEATURE_LABELS[feature].label} isn't included in your ${plan.name} plan.`,
    {
      details: {
        feature,
        featureLabel: FEATURE_LABELS[feature].label,
        plan: plan.id,
        planName: plan.name,
        suggestedPlan: suggested,
        suggestedPlanName: suggested ? PLANS[suggested].name : null,
        lapsed: ctx.entitlements.lapsed,
      },
    }
  )
}
