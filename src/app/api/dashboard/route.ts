import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { syncOverdueInvoices } from '@/lib/server/invoices'

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'dashboard.view' })
  const orgId = ctx.organization.id
  await syncOverdueInvoices(orgId)

  const url = new URL(request.url)
  const from = parseDate(url.searchParams.get('from'))
  const to = parseDate(url.searchParams.get('to'), true)
  const range = from || to ? { ...(from && { gte: from }), ...(to && { lte: to }) } : undefined

  const invoiceWhere: Prisma.InvoiceWhereInput = { organizationId: orgId, ...(range && { issueDate: range }) }
  const quotationWhere: Prisma.QuotationWhereInput = { organizationId: orgId, ...(range && { issueDate: range }) }
  const currency = ctx.organization.defaultCurrency

  const [byStatus, customers, quotationsByStatus, recentInvoices, recentPayments, upcoming, monthly] = await Promise.all([
    prisma.invoice.groupBy({ by: ['status', 'currency'], where: invoiceWhere, _sum: { total: true }, _count: { _all: true } }),
    prisma.customer.count({ where: { organizationId: orgId, ...(range && { createdAt: range }) } }),
    prisma.quotation.groupBy({ by: ['status'], where: quotationWhere, _count: { _all: true } }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, ...(range && { paidAt: range }) },
      include: { invoice: { select: { id: true, invoiceNumber: true, customer: { select: { name: true } } } } },
      orderBy: { paidAt: 'desc' },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: { in: ['PENDING', 'OVERDUE'] } },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    // Paid revenue per calendar month for the last 12 months, in the workspace currency.
    prisma.$queryRaw<{ month: Date; total: number }[]>`
      SELECT date_trunc('month', p."paidAt") AS month, SUM(p."amount")::float AS total
      FROM "Payment" p
      WHERE p."organizationId" = ${orgId}
        AND p."currency" = ${currency}
        AND p."paidAt" >= date_trunc('month', NOW()) - INTERVAL '11 months'
      GROUP BY 1 ORDER BY 1
    `,
  ])

  // Money totals are reported in the workspace currency; other currencies are listed separately.
  const sum = (status: string, cur = currency) =>
    byStatus.filter((r) => r.status === status && r.currency === cur).reduce((s, r) => s + (r._sum.total ?? 0), 0)
  const count = (status: string) => byStatus.filter((r) => r.status === status).reduce((s, r) => s + r._count._all, 0)

  const totalInvoices = byStatus.reduce((s, r) => s + r._count._all, 0)
  const quotationTotal = quotationsByStatus.reduce((s, r) => s + r._count._all, 0)
  const converted = quotationsByStatus.find((r) => r.status === 'CONVERTED')?._count._all ?? 0
  const otherCurrencies = Array.from(new Set(byStatus.map((r) => r.currency))).filter((c) => c !== currency)

  const months: { month: string; total: number }[] = []
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const row = monthly.find((m) => {
      const md = new Date(m.month)
      return md.getUTCFullYear() === d.getFullYear() && md.getUTCMonth() === d.getMonth()
    })
    months.push({ month: key, total: row?.total ?? 0 })
  }

  return {
    currency,
    stats: {
      totalInvoices,
      paidInvoices: count('PAID'),
      pendingInvoices: count('PENDING'),
      overdueInvoices: count('OVERDUE'),
      totalRevenue: sum('PAID'),
      pendingRevenue: sum('PENDING'),
      overdueRevenue: sum('OVERDUE'),
      outstanding: sum('PENDING') + sum('OVERDUE'),
      customers,
      quotations: quotationTotal,
      conversionRate: quotationTotal > 0 ? Math.round((converted / quotationTotal) * 100) : 0,
    },
    otherCurrencies: otherCurrencies.map((c) => ({
      currency: c,
      paid: sum('PAID', c),
      outstanding: sum('PENDING', c) + sum('OVERDUE', c),
    })),
    monthlyRevenue: months,
    recentInvoices,
    recentPayments,
    upcoming,
  }
})
