import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { forbidden, notFound } from '@/lib/server/errors'
import { assertCanManageMember } from '@/lib/server/team'
import { audit } from '@/lib/server/audit'

type Params = { memberId: string }

const roleSchema = z.object({ role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER']) })

async function findMember(organizationId: string, id: string) {
  const member = await prisma.membership.findFirst({
    where: { id, organizationId },
    include: { user: { select: { id: true, name: true, email: true, lastOrganizationId: true } } },
  })
  if (!member) throw notFound('Team member')
  return member
}

export const PUT = route<Params>(async (request, { params }) => {
  const { memberId } = await params
  const ctx = await requireOrganization({ permission: 'team.manage', write: true })
  const member = await findMember(ctx.organization.id, memberId)
  const { role } = await parseJson(request, roleSchema)
  assertCanManageMember(ctx, member, role)

  const updated = await prisma.membership.update({ where: { id: memberId }, data: { role } })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'member.role_changed',
    entityType: 'membership',
    entityId: memberId,
    metadata: { email: member.user.email, from: member.role, to: role },
  })
  return updated
})

/** Removes a member. Members may also remove themselves ("leave workspace"), except the owner. */
export const DELETE = route<Params>(async (_request, { params }) => {
  const { memberId } = await params
  const ctx = await requireOrganization()
  const member = await findMember(ctx.organization.id, memberId)
  const leaving = member.userId === ctx.user.id

  if (leaving) {
    if (member.role === 'OWNER') throw forbidden('The owner cannot leave the workspace.')
  } else {
    if (!ctx.can('team.manage')) throw forbidden("You don't have permission to remove team members.")
    assertCanManageMember(ctx, member)
  }

  await prisma.$transaction([
    prisma.membership.delete({ where: { id: memberId } }),
    ...(member.user.lastOrganizationId === ctx.organization.id
      ? [prisma.user.update({ where: { id: member.userId }, data: { lastOrganizationId: null } })]
      : []),
  ])
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'member.removed',
    entityType: 'membership',
    entityId: memberId,
    metadata: { email: member.user.email, role: member.role, leftVoluntarily: leaving },
  })
  return { id: memberId }
})
