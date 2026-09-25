import 'server-only'
import Stripe from 'stripe'
import { Prisma, type BillingInterval, type SubscriptionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BILLING_CURRENCY, PLANS, isPlanId, planPrice, type Interval, type PlanId } from '@/lib/plans'
import { ApiError, badRequest } from '../errors'
import { appUrl } from '../email'
import { applySubscriptionChange } from './service'
import type { BillingActor, BillingProvider, CheckoutResult } from './types'

let client: Stripe | null = null
function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new ApiError('BILLING_NOT_CONFIGURED', 'Card payments are not available right now. Please use bank transfer or contact support.')
  client ??= new Stripe(key, { appInfo: { name: 'InvoiceFlow' } })
  return client
}

const STATUS: Record<Stripe.Subscription.Status, SubscriptionStatus | null> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  paused: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete_expired: 'EXPIRED',
  // Payment not completed yet — keep whatever the workspace had until Stripe confirms.
  incomplete: null,
}

const lookupKey = (plan: PlanId, interval: Interval) =>
  `invoiceflow_${plan}_${interval.toLowerCase()}_${BILLING_CURRENCY.toLowerCase()}_${planPrice(plan, interval)}`

/** Finds (or creates) the Stripe price for a plan. Prices come from src/lib/plans.ts, never the client. */
async function ensurePrice(plan: PlanId, interval: Interval) {
  const key = lookupKey(plan, interval)
  const existing = await stripe().prices.list({ lookup_keys: [key], active: true, limit: 1 })
  if (existing.data[0]) return existing.data[0].id
  const price = await stripe().prices.create({
    currency: BILLING_CURRENCY.toLowerCase(),
    unit_amount: Math.round(planPrice(plan, interval) * 100),
    recurring: { interval: interval === 'YEAR' ? 'year' : 'month' },
    lookup_key: key,
    metadata: { plan, interval },
    product_data: { name: `InvoiceFlow ${PLANS[plan].name}`, metadata: { plan } },
  })
  return price.id
}

async function ensureCustomer(actor: BillingActor) {
  if (actor.subscription?.providerCustomerId) return actor.subscription.providerCustomerId
  const customer = await stripe().customers.create({
    email: actor.organization.email || actor.user.email,
    name: actor.organization.name,
    metadata: { organizationId: actor.organization.id },
  })
  await prisma.subscription.update({
    where: { organizationId: actor.organization.id },
    data: { providerCustomerId: customer.id },
  })
  return customer.id
}

function planFromSubscription(sub: Stripe.Subscription): { plan: PlanId | null; interval: BillingInterval } {
  const price = sub.items.data[0]?.price
  const plan = (price?.metadata?.plan as string | undefined) ?? (sub.metadata?.plan as string | undefined)
  return {
    plan: plan && isPlanId(plan) ? plan : null,
    interval: price?.recurring?.interval === 'year' ? 'YEAR' : 'MONTH',
  }
}

async function organizationFor(sub: Stripe.Subscription) {
  const fromMeta = sub.metadata?.organizationId
  if (fromMeta) return fromMeta
  const row = await prisma.subscription.findFirst({
    where: { OR: [{ providerSubscriptionId: sub.id }, { providerCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id }] },
    select: { organizationId: true },
  })
  return row?.organizationId ?? null
}

/** Mirrors a Stripe subscription onto our Subscription row. */
async function syncSubscription(sub: Stripe.Subscription, source: string) {
  const organizationId = await organizationFor(sub)
  if (!organizationId) return null
  const status = STATUS[sub.status]
  if (!status) return organizationId
  const { plan, interval } = planFromSubscription(sub)
  const s = sub as Stripe.Subscription & { current_period_start?: number; current_period_end?: number }
  await applySubscriptionChange({
    organizationId,
    ...(plan && { plan }),
    interval,
    status,
    provider: 'STRIPE',
    providerSubscriptionId: sub.id,
    providerCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    currentPeriodStart: s.current_period_start ? new Date(s.current_period_start * 1000) : undefined,
    currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    ...(status !== 'TRIALING' && { trialEnd: null }),
    source,
  })
  return organizationId
}

async function recordInvoice(invoice: Stripe.Invoice, paid: boolean) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subId) return null
  const sub = await stripe().subscriptions.retrieve(subId)
  const organizationId = await syncSubscription(sub, paid ? 'stripe.invoice.paid' : 'stripe.invoice.payment_failed')
  if (!organizationId) return null
  const { plan, interval } = planFromSubscription(sub)
  const line = invoice.lines?.data?.[0]
  await prisma.billingPayment.upsert({
    where: { providerRef: invoice.id },
    update: { status: paid ? 'PAID' : 'FAILED', paidAt: paid ? new Date() : null, receiptUrl: invoice.hosted_invoice_url ?? null },
    create: {
      organizationId,
      provider: 'STRIPE',
      providerRef: invoice.id,
      plan: plan ?? 'unknown',
      interval,
      amount: (paid ? invoice.amount_paid : invoice.amount_due) / 100,
      currency: invoice.currency.toUpperCase(),
      status: paid ? 'PAID' : 'FAILED',
      description: line?.description ?? `InvoiceFlow ${plan ?? ''}`.trim(),
      receiptUrl: invoice.hosted_invoice_url ?? null,
      periodStart: line?.period?.start ? new Date(line.period.start * 1000) : null,
      periodEnd: line?.period?.end ? new Date(line.period.end * 1000) : null,
      paidAt: paid ? new Date() : null,
    },
  })
  return organizationId
}

export const stripeProvider: BillingProvider = {
  id: 'STRIPE',
  label: 'Card (Stripe)',

  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),

  async checkout(actor, plan, interval): Promise<CheckoutResult> {
    if (plan === 'free') throw badRequest('The Free plan does not need checkout.')
    const price = await ensurePrice(plan, interval)
    const current = actor.subscription

    // Existing card subscription: switch the price in place (Stripe prorates).
    if (current?.provider === 'STRIPE' && current.providerSubscriptionId && ['ACTIVE', 'PAST_DUE', 'TRIALING'].includes(current.status)) {
      const sub = await stripe().subscriptions.retrieve(current.providerSubscriptionId)
      if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
        const updated = await stripe().subscriptions.update(sub.id, {
          items: [{ id: sub.items.data[0].id, price }],
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false,
          metadata: { organizationId: actor.organization.id, plan, interval },
        })
        await syncSubscription(updated, 'stripe.plan_change')
        return { kind: 'updated' }
      }
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: await ensureCustomer(actor),
      client_reference_id: actor.organization.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: appUrl('/billing?checkout=success'),
      cancel_url: appUrl('/billing?checkout=canceled'),
      metadata: { organizationId: actor.organization.id, plan, interval },
      subscription_data: { metadata: { organizationId: actor.organization.id, plan, interval } },
    })
    if (!session.url) throw new ApiError('INTERNAL_ERROR', 'Could not start checkout. Please try again.')
    return { kind: 'redirect', url: session.url }
  },

  async cancel(actor) {
    const id = actor.subscription?.providerSubscriptionId
    if (!id) throw badRequest('There is no card subscription to cancel.')
    const sub = await stripe().subscriptions.update(id, { cancel_at_period_end: true })
    await syncSubscription(sub, 'stripe.cancel')
  },

  async resume(actor) {
    const id = actor.subscription?.providerSubscriptionId
    if (!id) throw badRequest('There is no card subscription to resume.')
    const sub = await stripe().subscriptions.update(id, { cancel_at_period_end: false })
    await syncSubscription(sub, 'stripe.resume')
  },

  async portal(actor, returnUrl) {
    const customer = actor.subscription?.providerCustomerId
    if (!customer) throw badRequest('No billing account exists yet. Subscribe to a plan first.')
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: returnUrl })
    return session.url
  },

  async handleWebhook(request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    const signature = request.headers.get('stripe-signature')
    if (!secret || !signature) throw badRequest('Missing webhook signature.')

    const payload = await request.text()
    let event: Stripe.Event
    try {
      event = stripe().webhooks.constructEvent(payload, signature, secret)
    } catch {
      throw badRequest('Invalid webhook signature.')
    }

    // Idempotency: each Stripe event is processed once.
    try {
      await prisma.billingEvent.create({
        data: { provider: 'STRIPE', eventId: event.id, type: event.type, payload: JSON.parse(payload) },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { received: true }
      throw error
    }

    let organizationId: string | null = null
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          if (session.subscription) {
            const sub = await stripe().subscriptions.retrieve(typeof session.subscription === 'string' ? session.subscription : session.subscription.id)
            organizationId = await syncSubscription(sub, 'stripe.checkout.completed')
          }
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          organizationId = await syncSubscription(event.data.object as Stripe.Subscription, `stripe.${event.type}`)
          break
        case 'invoice.paid':
          organizationId = await recordInvoice(event.data.object as Stripe.Invoice, true)
          break
        case 'invoice.payment_failed':
          organizationId = await recordInvoice(event.data.object as Stripe.Invoice, false)
          break
        default:
          break
      }
      await prisma.billingEvent.update({ where: { eventId: event.id }, data: { processedAt: new Date(), organizationId } })
    } catch (error) {
      await prisma.billingEvent.update({
        where: { eventId: event.id },
        data: { error: error instanceof Error ? error.message.slice(0, 500) : 'unknown error' },
      })
      // Let Stripe retry: remove the idempotency marker so the retry is processed.
      await prisma.billingEvent.delete({ where: { eventId: event.id } }).catch(() => {})
      throw error
    }
    return { received: true }
  },
}
