import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parsePagination, paginated } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'

/** Payment history for the workspace. */
export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'payment.view' })
  const url = new URL(request.url)
  const p = parsePagination(url, { defaultLimit: 20 })
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100)
  const method = url.searchParams.get('method')

  const where: Prisma.PaymentWhereInput = {
    organizationId: ctx.organization.id,
    ...(method && { method: method as any }),
    ...(search && {
      OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { invoice: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ],
    }),
  }

  const [items, total, sums] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, customer: { select: { id: true, name: true } } } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paidAt: 'desc' },
      skip: p.skip,
      take: p.limit,
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({ by: ['currency'], where, _sum: { amount: true } }),
  ])

  return { ...paginated(items, total, p), totals: sums.map((s) => ({ currency: s.currency, amount: s._sum.amount ?? 0 })) }
})
