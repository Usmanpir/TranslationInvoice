import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parseJson, parsePagination, paginated } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { checkUsageLimit } from '@/lib/server/subscription'
import { audit } from '@/lib/server/audit'
import { customerSchema } from '@/lib/server/schemas'

export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'customer.view' })
  const url = new URL(request.url)
  const p = parsePagination(url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 100)

  const where: Prisma.CustomerWhereInput = {
    organizationId: ctx.organization.id,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.limit,
      include: { _count: { select: { invoices: true } } },
    }),
    prisma.customer.count({ where }),
  ])

  return paginated(customers, total, p)
})

export const POST = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'customer.manage', write: true })
  const data = await parseJson(request, customerSchema)
  await checkUsageLimit(ctx, 'customers')

  const customer = await prisma.customer.create({
    data: { ...data, organizationId: ctx.organization.id, userId: ctx.user.id },
  })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'customer.created',
    entityType: 'customer',
    entityId: customer.id,
    metadata: { name: customer.name },
  })
  return customer
})
