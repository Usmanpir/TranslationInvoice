import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { getUsage } from '@/lib/server/subscription'
import { availableProviders } from '@/lib/server/billing'
import { BILLING_CURRENCY, FEATURE_LABELS, PLAN_ORDER, PLANS, YEARLY_DISCOUNT, limitFor, planPrice } from '@/lib/plans'

/** Everything the billing page needs: current plan, usage vs limits, plans, providers, history. */
export const GET = route(async () => {
  const ctx = await requireOrganization({ permission: 'billing.view' })
  const orgId = ctx.organization.id
  const e = ctx.entitlements

  const [usage, payments] = await Promise.all([
    getUsage(orgId),
    prisma.billingPayment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        provider: true,
        providerRef: true,
        plan: true,
        interval: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        receiptUrl: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ])

  const plan = e.plan
  return {
    current: {
      planId: plan.id,
      planName: plan.name,
      subscribedPlanId: e.subscribedPlan.id,
      status: e.status,
      interval: ctx.subscription?.interval ?? 'MONTH',
      provider: ctx.subscription?.provider ?? 'NONE',
      isTrial: e.isTrial,
      trialEnd: e.trialEnd,
      trialDaysLeft: e.trialDaysLeft,
      currentPeriodStart: ctx.subscription?.currentPeriodStart ?? null,
      currentPeriodEnd: e.currentPeriodEnd,
      cancelAtPeriodEnd: e.cancelAtPeriodEnd,
      lapsed: e.lapsed,
      readOnly: e.readOnly,
      canManage: ctx.can('billing.manage'),
    },
    usage: [
      { resource: 'invoices', label: 'Invoices this month', used: usage.invoices, limit: limitFor(plan, 'invoices') },
      { resource: 'quotations', label: 'Quotations this month', used: usage.quotations, limit: limitFor(plan, 'quotations') },
      { resource: 'customers', label: 'Customers', used: usage.customers, limit: limitFor(plan, 'customers') },
      { resource: 'users', label: 'Team members', used: usage.users, limit: limitFor(plan, 'users') },
      { resource: 'storage', label: 'Storage (MB)', used: usage.storage, limit: limitFor(plan, 'storage') },
    ],
    plans: PLAN_ORDER.map((id) => ({
      ...PLANS[id],
      prices: { MONTH: planPrice(id, 'MONTH'), YEAR: planPrice(id, 'YEAR') },
      featureLabels: PLANS[id].features.map((f) => FEATURE_LABELS[f]),
    })),
    currency: BILLING_CURRENCY,
    yearlyDiscount: YEARLY_DISCOUNT,
    providers: availableProviders(),
    payments,
  }
})
