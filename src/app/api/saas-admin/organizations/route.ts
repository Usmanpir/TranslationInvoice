import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parsePagination, paginated } from '@/lib/server/api'
import { requireSuperAdmin } from '@/lib/server/context'

export const GET = route(async (request) => {
  await requireSuperAdmin()
  const url = new URL(request.url)
  const p = parsePagination(url, { defaultLimit: 20 })
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100)
  const plan = url.searchParams.get('plan')
  const status = url.searchParams.get('status')

  const where: Prisma.OrganizationWhereInput = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { memberships: { some: { role: 'OWNER', user: { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } } } },
      ],
    }),
    ...(plan && { subscription: { plan } }),
    ...(status === 'SUSPENDED' && { status: 'SUSPENDED' }),
    ...(status && status !== 'SUSPENDED' && { subscription: { ...(plan && { plan }), status: status as any } }),
  }

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, trialEnd: true, currentPeriodEnd: true, provider: true, interval: true } },
        memberships: { where: { role: 'OWNER' }, take: 1, select: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { memberships: true, invoices: true } },
      },
    }),
    prisma.organization.count({ where }),
  ])

  return paginated(
    items.map(({ memberships, ...o }) => ({ ...o, owner: memberships[0]?.user ?? null })),
    total,
    p
  )
})
