import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireSuperAdmin } from '@/lib/server/context'
import { getPlan, planPrice, isPlanId } from '@/lib/plans'

/** Platform KPIs for the SaaS owner. */
export const GET = route(async () => {
  await requireSuperAdmin()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalOrgs, activeOrgs, newOrgs, subs, users, invoices, quotations, recent, signups] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.subscription.findMany({ select: { plan: true, status: true, interval: true, trialEnd: true, provider: true } }),
    prisma.user.count(),
    prisma.invoice.count(),
    prisma.quotation.count(),
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, createdAt: true, status: true, subscription: { select: { plan: true, status: true } } },
    }),
    prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*) AS count
      FROM "Organization" WHERE "createdAt" >= date_trunc('month', NOW()) - INTERVAL '11 months'
      GROUP BY 1 ORDER BY 1
    `,
  ])

  // MRR counts only paying subscriptions (active or past-due), normalized to a month.
  let mrr = 0
  const byPlan: Record<string, number> = {}
  let trialing = 0
  let expiredTrials = 0
  let activePaid = 0
  for (const s of subs) {
    const trialOver = s.status === 'TRIALING' && s.trialEnd && s.trialEnd <= now
    if (s.status === 'TRIALING' && !trialOver) trialing++
    if (s.status === 'EXPIRED' || trialOver) expiredTrials++
    if ((s.status === 'ACTIVE' || s.status === 'PAST_DUE') && isPlanId(s.plan) && getPlan(s.plan).monthlyPrice > 0) {
      activePaid++
      mrr += s.interval === 'YEAR' ? planPrice(s.plan, 'YEAR') / 12 : planPrice(s.plan, 'MONTH')
      byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1
    }
  }

  return {
    totals: {
      organizations: totalOrgs,
      activeOrganizations: activeOrgs,
      newOrganizations: newOrgs,
      activeSubscriptions: activePaid,
      trialing,
      expiredTrials,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      users,
      invoices,
      quotations,
    },
    byPlan,
    recent,
    signups: signups.map((s) => ({ month: s.month, count: Number(s.count) })),
  }
})
