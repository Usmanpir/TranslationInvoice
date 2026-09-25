import 'server-only'
import type { BillingInterval, Prisma, SubscriptionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PLANS, getPlan, limitFor, type PlanId } from '@/lib/plans'
import { ApiError } from '../errors'
import { audit } from '../audit'
import { notify } from '../notifications'
import { sendEmail } from '../email'

/** Blocks a downgrade that would leave the workspace over the new plan's hard limits. */
export async function assertFitsPlan(organizationId: string, plan: PlanId) {
  const target = PLANS[plan]
  const [members, customers] = await Promise.all([
    prisma.membership.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
  ])
  const userLimit = limitFor(target, 'users')
  if (userLimit !== null && members > userLimit) {
    throw new ApiError('CONFLICT', `${target.name} includes ${userLimit} team member${userLimit === 1 ? '' : 's'}. Remove ${members - userLimit} member(s) before switching.`)
  }
  const customerLimit = limitFor(target, 'customers')
  if (customerLimit !== null && customers > customerLimit) {
    throw new ApiError('CONFLICT', `${target.name} includes ${customerLimit} customers and you have ${customers}. Choose a larger plan.`)
  }
}

interface ApplyInput {
  organizationId: string
  plan?: string
  interval?: BillingInterval
  status?: SubscriptionStatus
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: Date | null
  provider?: 'NONE' | 'STRIPE' | 'MANUAL'
  providerCustomerId?: string | null
  providerSubscriptionId?: string | null
  trialEnd?: Date | null
  actorUserId?: string | null
  source: string
}

/**
 * The single place subscription rows change. Records an audit entry and notifies
 * the workspace's billing managers when the plan or status changes.
 */
export async function applySubscriptionChange(input: ApplyInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const before = await tx.subscription.findUnique({ where: { organizationId: input.organizationId } })
  const data = {
    ...(input.plan !== undefined && { plan: input.plan }),
    ...(input.interval !== undefined && { interval: input.interval }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.currentPeriodStart !== undefined && { currentPeriodStart: input.currentPeriodStart }),
    ...(input.currentPeriodEnd !== undefined && { currentPeriodEnd: input.currentPeriodEnd }),
    ...(input.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: input.cancelAtPeriodEnd }),
    ...(input.canceledAt !== undefined && { canceledAt: input.canceledAt }),
    ...(input.provider !== undefined && { provider: input.provider }),
    ...(input.providerCustomerId !== undefined && { providerCustomerId: input.providerCustomerId }),
    ...(input.providerSubscriptionId !== undefined && { providerSubscriptionId: input.providerSubscriptionId }),
    ...(input.trialEnd !== undefined && { trialEnd: input.trialEnd }),
  }

  const after = await tx.subscription.upsert({
    where: { organizationId: input.organizationId },
    update: data,
    create: { organizationId: input.organizationId, plan: input.plan ?? 'free', status: input.status ?? 'ACTIVE', ...data },
  })

  const planChanged = before?.plan !== after.plan
  const statusChanged = before?.status !== after.status
  const cancelChanged = before?.cancelAtPeriodEnd !== after.cancelAtPeriodEnd

  if (planChanged || statusChanged || cancelChanged) {
    await audit(
      {
        organizationId: input.organizationId,
        userId: input.actorUserId ?? null,
        action: cancelChanged && after.cancelAtPeriodEnd ? 'subscription.canceled' : cancelChanged ? 'subscription.resumed' : 'subscription.changed',
        entityType: 'subscription',
        entityId: after.id,
        metadata: {
          source: input.source,
          from: { plan: before?.plan, status: before?.status },
          to: { plan: after.plan, status: after.status, cancelAtPeriodEnd: after.cancelAtPeriodEnd },
        },
      },
      tx
    )
  }

  // Notifications run outside any transaction on purpose (best effort).
  if (tx === prisma) void announce(input.organizationId, before?.status, after.status, after.plan, planChanged, after.cancelAtPeriodEnd && cancelChanged, after.currentPeriodEnd)
  return after
}

async function announce(
  organizationId: string,
  fromStatus: SubscriptionStatus | undefined,
  toStatus: SubscriptionStatus,
  plan: string,
  planChanged: boolean,
  scheduledCancel: boolean,
  periodEnd: Date | null
) {
  const planName = getPlan(plan).name
  let type: 'subscription.activated' | 'subscription.payment_failed' | 'subscription.expired' | null = null
  let title = ''
  if (toStatus === 'ACTIVE' && (fromStatus !== 'ACTIVE' || planChanged)) {
    type = 'subscription.activated'
    title = `You're now on the ${planName} plan`
  } else if (toStatus === 'PAST_DUE' && fromStatus !== 'PAST_DUE') {
    type = 'subscription.payment_failed'
    title = 'Subscription payment failed'
  } else if ((toStatus === 'CANCELED' || toStatus === 'EXPIRED') && fromStatus !== toStatus) {
    type = 'subscription.expired'
    title = 'Your subscription has ended'
  }
  if (type) {
    const emailTo = await notify({ organizationId, type, permission: 'billing.view', title, link: '/billing' })
    const to = emailTo.map((r) => r.email)
    if (to.length) {
      if (type === 'subscription.activated') await sendEmail(to, 'subscriptionActivated', { planName })
      if (type === 'subscription.payment_failed') await sendEmail(to, 'paymentFailed', { planName })
    }
  }
  if (scheduledCancel) {
    const emailTo = await notify({
      organizationId,
      type: 'subscription.expired',
      permission: 'billing.view',
      title: `${planName} will end ${periodEnd ? `on ${periodEnd.toLocaleDateString()}` : 'soon'}`,
      link: '/billing',
    })
    if (emailTo.length) await sendEmail(emailTo.map((r) => r.email), 'subscriptionCanceled', { planName, endsAt: periodEnd?.toDateString() ?? null })
  }
}

export function addInterval(from: Date, interval: BillingInterval) {
  const d = new Date(from)
  if (interval === 'YEAR') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}
