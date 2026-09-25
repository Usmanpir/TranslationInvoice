import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { route, parsePagination, paginated } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { requireFeature } from '@/lib/server/subscription'

/** Workspace audit trail (admins, plans with the audit log feature). */
export const GET = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'audit.view' })
  requireFeature(ctx, 'auditLog')
  const url = new URL(request.url)
  const p = parsePagination(url, { defaultLimit: 25 })
  const action = url.searchParams.get('action')
  const entity = url.searchParams.get('entityType')

  const where: Prisma.AuditLogWhereInput = {
    organizationId: ctx.organization.id,
    ...(action && { action: { startsWith: action } }),
    ...(entity && { entityType: entity }),
  }
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.limit,
    }),
    prisma.auditLog.count({ where }),
  ])
  return paginated(items, total, p)
})
