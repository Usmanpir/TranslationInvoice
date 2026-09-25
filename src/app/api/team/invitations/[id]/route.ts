import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { notFound } from '@/lib/server/errors'
import { audit } from '@/lib/server/audit'

type Params = { id: string }

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  const ctx = await requireOrganization({ permission: 'team.manage', write: true })
  const invitation = await prisma.invitation.findFirst({
    where: { id, organizationId: ctx.organization.id, acceptedAt: null, revokedAt: null },
  })
  if (!invitation) throw notFound('Invitation')

  await prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } })
  await audit({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: 'invitation.revoked',
    entityType: 'invitation',
    entityId: id,
    metadata: { email: invitation.email },
  })
  return { id }
})
