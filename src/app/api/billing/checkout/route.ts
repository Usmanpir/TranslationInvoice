import { z } from 'zod'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { applySubscriptionChange, assertFitsPlan, getProvider } from '@/lib/server/billing'
import { PLAN_ORDER, FALLBACK_PLAN } from '@/lib/plans'

const schema = z.object({
  plan: z.enum(PLAN_ORDER as ['free', 'starter', 'professional', 'business']),
  interval: z.enum(['MONTH', 'YEAR']).default('MONTH'),
  provider: z.enum(['STRIPE', 'MANUAL']).default('STRIPE'),
})

/**
 * Starts a plan change. Prices, plan validity and the organization are all resolved
 * on the server; the client only names the plan it wants.
 */
export const POST = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'billing.manage', write: true })
  await enforceRateLimit(`checkout:${ctx.organization.id}`, 20, 60 * 60)
  const { plan, interval, provider: providerId } = await parseJson(request, schema)
  const sub = ctx.subscription
  const actor = { organization: ctx.organization, subscription: sub, user: ctx.user }

  await assertFitsPlan(ctx.organization.id, plan)

  // Moving to Free.
  if (plan === FALLBACK_PLAN) {
    if (sub?.provider === 'STRIPE' && sub.providerSubscriptionId && ['ACTIVE', 'PAST_DUE'].includes(sub.status)) {
      await getProvider('STRIPE').cancel(actor)
      return { kind: 'updated', message: 'Your plan will switch to Free at the end of the current billing period.' }
    }
    await applySubscriptionChange({
      organizationId: ctx.organization.id,
      plan: FALLBACK_PLAN,
      status: 'ACTIVE',
      provider: 'NONE',
      cancelAtPeriodEnd: false,
      trialEnd: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      actorUserId: ctx.user.id,
      source: 'user.downgrade_free',
    })
    return { kind: 'updated', message: "You're now on the Free plan." }
  }

  const provider = getProvider(providerId)
  if (!provider.isConfigured()) throw badRequest(`${provider.label} is not available right now.`)
  // A card subscription must be changed through Stripe, not by starting a bank transfer.
  if (providerId === 'MANUAL' && sub?.provider === 'STRIPE' && sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd) {
    throw badRequest('You are billed by card. Change your plan here or cancel the card subscription first.')
  }
  return provider.checkout(actor, plan, interval)
})
