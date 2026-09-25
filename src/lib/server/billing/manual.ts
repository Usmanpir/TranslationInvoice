import 'server-only'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { BILLING_CURRENCY, PLANS, planPrice } from '@/lib/plans'
import { badRequest } from '../errors'
import { audit } from '../audit'
import { applySubscriptionChange } from './service'
import type { BillingProvider } from './types'

const DEFAULT_INSTRUCTIONS =
  'Transfer the amount to our bank account and include the reference below. Your plan is activated as soon as we confirm the payment (usually within one business day).'

/**
 * Manual / bank-transfer billing. A request creates a PENDING billing payment;
 * a SaaS administrator confirms it in /saas-admin, which activates the plan.
 */
export const manualProvider: BillingProvider = {
  id: 'MANUAL',
  label: 'Bank transfer',

  isConfigured: () => process.env.MANUAL_BILLING_ENABLED !== 'false',

  async checkout(actor, plan, interval) {
    if (plan === 'free') throw badRequest('The Free plan does not need payment.')
    // Replace any older unpaid request so there is one open request per workspace.
    await prisma.billingPayment.updateMany({
      where: { organizationId: actor.organization.id, provider: 'MANUAL', status: 'PENDING' },
      data: { status: 'FAILED', description: 'Superseded by a newer request' },
    })
    const reference = `IF-${actor.organization.slug.slice(0, 12).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    await prisma.billingPayment.create({
      data: {
        organizationId: actor.organization.id,
        provider: 'MANUAL',
        providerRef: reference,
        plan,
        interval,
        amount: planPrice(plan, interval),
        currency: BILLING_CURRENCY,
        status: 'PENDING',
        description: `${PLANS[plan].name} (${interval === 'YEAR' ? 'yearly' : 'monthly'}) — awaiting bank transfer`,
      },
    })
    await audit({
      organizationId: actor.organization.id,
      userId: actor.user.id,
      action: 'subscription.changed',
      entityType: 'billingPayment',
      entityId: reference,
      metadata: { requested: { plan, interval }, provider: 'MANUAL' },
    })
    const bank = process.env.MANUAL_BILLING_INSTRUCTIONS || DEFAULT_INSTRUCTIONS
    return { kind: 'pending', instructions: bank, reference }
  },

  async cancel(actor) {
    const sub = actor.subscription
    if (!sub) throw badRequest('There is no subscription to cancel.')
    await applySubscriptionChange({
      organizationId: actor.organization.id,
      cancelAtPeriodEnd: true,
      actorUserId: actor.user.id,
      source: 'manual.cancel',
    })
  },

  async resume(actor) {
    await applySubscriptionChange({
      organizationId: actor.organization.id,
      cancelAtPeriodEnd: false,
      actorUserId: actor.user.id,
      source: 'manual.resume',
    })
  },
}
