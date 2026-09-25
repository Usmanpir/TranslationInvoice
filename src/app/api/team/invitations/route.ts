import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { ApiError } from '@/lib/server/errors'
import { checkUsageLimit } from '@/lib/server/subscription'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { assertCanInviteRole, INVITATION_TTL_DAYS, newInvitationToken } from '@/lib/server/team'
import { audit } from '@/lib/server/audit'
import { sendEmail, appUrl } from '@/lib/server/email'
import { ROLE_LABELS } from '@/lib/permissions'

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(200),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER']),
})

export const POST = route(async (request) => {
  const ctx = await requireOrganization({ permission: 'team.manage', write: true })
  const orgId = ctx.organization.id
  await enforceRateLimit(`invite:${orgId}`, 30, 60 * 60)
  const { email, role } = await parseJson(request, inviteSchema)
  assertCanInviteRole(ctx, role)

  const existingMember = await prisma.membership.findFirst({
    where: { organizationId: orgId, user: { email: { equals: email, mode: 'insensitive' } } },
    select: { id: true },
  })
  if (existingMember) throw new ApiError('CONFLICT', `${email} is already a member of this workspace.`)

  // Re-inviting replaces any pending invitation, so it doesn't consume a second seat.
  await prisma.invitation.updateMany({
    where: { organizationId: orgId, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await checkUsageLimit(ctx, 'users')

  const { token, tokenHash } = newInvitationToken()
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: orgId,
      email,
      role,
      tokenHash,
      invitedById: ctx.user.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  })

  const inviteUrl = appUrl(`/invite/${token}`)
  await sendEmail(email, 'teamInvitation', {
    inviterName: ctx.user.name,
    organizationName: ctx.organization.name,
    roleLabel: ROLE_LABELS[role].label,
    url: inviteUrl,
  })
  await audit({
    organizationId: orgId,
    userId: ctx.user.id,
    action: 'member.invited',
    entityType: 'invitation',
    entityId: invitation.id,
    metadata: { email, role },
  })

  // The link is returned once so admins can share it directly if email isn't configured.
  return { invitation, inviteUrl }
})
