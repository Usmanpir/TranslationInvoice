import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'

export const GET = route(async () => {
  const ctx = await requireOrganization()
  const where = {
    organizationId: ctx.organization.id,
    OR: [{ userId: ctx.user.id }, { userId: null }],
  }
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ])
  return { items, unread }
})

const readSchema = z.object({ ids: z.array(z.string()).max(100).optional() })

/** Marks the given notifications (or all) as read for the current user. */
export const POST = route(async (request) => {
  const ctx = await requireOrganization()
  const { ids } = await parseJson(request, readSchema)
  const { count } = await prisma.notification.updateMany({
    where: {
      organizationId: ctx.organization.id,
      OR: [{ userId: ctx.user.id }, { userId: null }],
      readAt: null,
      ...(ids && { id: { in: ids } }),
    },
    data: { readAt: new Date() },
  })
  return { updated: count }
})
