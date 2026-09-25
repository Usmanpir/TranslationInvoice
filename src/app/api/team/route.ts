import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { getUsage } from '@/lib/server/subscription'
import { limitFor } from '@/lib/plans'

/** Members and pending invitations of the active workspace. */
export const GET = route(async () => {
  const ctx = await requireOrganization({ permission: 'team.view' })
  const orgId = ctx.organization.id

  const [members, invitations, usage] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invitation.findMany({
      where: { organizationId: orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true, invitedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    getUsage(orgId),
  ])

  return {
    members,
    invitations,
    seats: { used: usage.users, limit: limitFor(ctx.entitlements.plan, 'users') },
    currentUserId: ctx.user.id,
    currentRole: ctx.role,
  }
})
