import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { requireFeature } from '@/lib/server/subscription'
import { syncOverdueInvoices } from '@/lib/server/invoices'

function range(url: URL) {
  const now = new Date()
  const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : new Date(now.getFullYear(), 0, 1)
  const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : now
  to.setHours(23, 59, 59, 999)
  return { from: Number.isNaN(from.getTime()) ? new Date(now.getFullYear(), 0, 1) : from, to: Number.isNaN(to.getTime()) ? now : to }
}

/** Revenue, outstanding (aging) and VAT reports for a date range. */
export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'report.view' })
  requireFeature(ctx, 'advancedReports')
  const orgId = ctx.organization.id
  await syncOverdueInvoices(orgId)
  const { from, to } = range(new URL(request.url))

  const [revenue, outstanding, vat, topCustomers] = await Promise.all([
    prisma.$queryRaw<{ month: Date; currency: string; total: number; count: bigint }[]>`
      SELECT date_trunc('month', "paidAt") AS month, "currency", SUM("amount")::float AS total, COUNT(*) AS count
      FROM "Payment"
      WHERE "organizationId" = ${orgId} AND "paidAt" BETWEEN ${from} AND ${to}
      GROUP BY 1, 2 ORDER BY 1
    `,
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: { in: ['PENDING', 'OVERDUE'] } },
      select: { id: true, invoiceNumber: true, dueDate: true, total: true, currency: true, status: true, customer: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.$queryRaw<{ currency: string; taxRate: number; taxable: number; tax: number; invoices: bigint }[]>`
      SELECT "currency", "taxRate",
             SUM("total" - "taxAmount")::float AS taxable,
             SUM("taxAmount")::float AS tax,
             COUNT(*) AS invoices
      FROM "Invoice"
      WHERE "organizationId" = ${orgId} AND "status" <> 'CANCELLED' AND "issueDate" BETWEEN ${from} AND ${to}
      GROUP BY 1, 2 ORDER BY 1, 2
    `,
    prisma.$queryRaw<{ id: string; name: string; currency: string; total: number }[]>`
      SELECT c."id", c."name", p."currency", SUM(p."amount")::float AS total
      FROM "Payment" p JOIN "Invoice" i ON i."id" = p."invoiceId" JOIN "Customer" c ON c."id" = i."customerId"
      WHERE p."organizationId" = ${orgId} AND p."paidAt" BETWEEN ${from} AND ${to}
      GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 10
    `,
  ])

  // Aging buckets by days past due (not yet due = "current").
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days'] as const
  const aging: Record<string, Record<string, { amount: number; count: number }>> = {}
  for (const inv of outstanding) {
    const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000)
    const b = days <= 0 ? buckets[0] : days <= 30 ? buckets[1] : days <= 60 ? buckets[2] : days <= 90 ? buckets[3] : buckets[4]
    aging[inv.currency] ??= Object.fromEntries(buckets.map((k) => [k, { amount: 0, count: 0 }]))
    aging[inv.currency][b].amount += inv.total
    aging[inv.currency][b].count += 1
  }

  return {
    range: { from, to },
    defaultCurrency: ctx.organization.defaultCurrency,
    taxLabel: ctx.organization.taxLabel,
    taxNumber: ctx.organization.taxNumber,
    revenue: revenue.map((r) => ({ month: r.month, currency: r.currency, total: r.total, count: Number(r.count) })),
    aging: { buckets, byCurrency: aging },
    overdue: outstanding.filter((i) => i.status === 'OVERDUE').slice(0, 20),
    vat: vat.map((v) => ({ currency: v.currency, taxRate: v.taxRate, taxable: v.taxable, tax: v.tax, invoices: Number(v.invoices) })),
    topCustomers,
  }
})
