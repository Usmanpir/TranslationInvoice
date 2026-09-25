import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { unauthorized } from '@/lib/server/errors'
import { syncExpiredTrial, getUsage } from '@/lib/server/subscription'
import { syncOverdueInvoices } from '@/lib/server/invoices'
import { purgeExpiredRateLimits } from '@/lib/server/rate-limit'
import { notify } from '@/lib/server/notifications'
import { sendEmail } from '@/lib/server/email'
import { getPlan, limitFor, type LimitedResource } from '@/lib/plans'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  return header.length === expected.length && crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

/** Daily maintenance (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export const GET = route(async (request) => {
  if (!authorized(request)) throw unauthorized('Invalid cron secret.')
  const now = new Date()
  const summary = { trialReminders: 0, trialsExpired: 0, orgsChecked: 0, limitWarnings: 0 }

  // Trial ending in 3 days → one reminder.
  const ending = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEnd: { gt: new Date(now.getTime() + 2 * DAY), lte: new Date(now.getTime() + 3 * DAY) } },
    include: { organization: { select: { id: true, name: true } } },
  })
  for (const sub of ending) {
    const already = await prisma.notification.count({ where: { organizationId: sub.organizationId, type: 'subscription.trial_ending' } })
    if (already) continue
    const recipients = await notify({
      organizationId: sub.organizationId,
      type: 'subscription.trial_ending',
      permission: 'billing.view',
      title: 'Your trial ends in 3 days',
      body: 'Choose a plan to keep premium features. Your data stays safe either way.',
      link: '/billing',
    })
    for (const r of recipients) await sendEmail(r.email, 'trialEnding', { name: r.name, daysLeft: 3 })
    summary.trialReminders++
  }

  // Trials past their end date.
  const expired = await prisma.subscription.findMany({ where: { status: 'TRIALING', trialEnd: { lte: now } } })
  for (const sub of expired) {
    await syncExpiredTrial(sub.organizationId, sub, now)
    summary.trialsExpired++
  }

  // Overdue invoices + "limit approaching" warnings, per active organization.
  const orgs = await prisma.organization.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, subscription: { select: { plan: true, status: true, trialEnd: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } } },
    take: 5000,
  })
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  for (const org of orgs) {
    summary.orgsChecked++
    await syncOverdueInvoices(org.id)
    const plan = getPlan(org.subscription?.plan ?? 'free')
    const usage = await getUsage(org.id)
    for (const resource of ['invoices', 'quotations', 'customers'] as LimitedResource[]) {
      const limit = limitFor(plan, resource)
      if (limit === null || usage[resource] < Math.ceil(limit * 0.8) || usage[resource] >= limit) continue
      // One warning per resource per calendar month.
      const sent = await prisma.notification.count({
        where: { organizationId: org.id, type: 'usage.limit_approaching', title: { endsWith: ` ${resource}` }, createdAt: { gte: monthStart } },
      })
      if (sent) continue
      await notify({
        organizationId: org.id,
        type: 'usage.limit_approaching',
        permission: 'billing.view',
        title: `You've used ${usage[resource]} of ${limit} ${resource}`,
        body: 'Upgrade your plan to avoid interruptions.',
        link: '/billing#plans',
      })
      summary.limitWarnings++
    }
  }

  await purgeExpiredRateLimits()
  return summary
})
