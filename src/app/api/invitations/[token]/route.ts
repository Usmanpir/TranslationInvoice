import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { getCurrentUser } from '@/lib/server/context'
import { ApiError, forbidden, notFound } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { hashToken } from '@/lib/server/team'
import { passwordSchema } from '@/lib/server/schemas'
import { resolveEntitlements } from '@/lib/server/subscription'
import { limitFor } from '@/lib/plans'
import { audit } from '@/lib/server/audit'
import { notify } from '@/lib/server/notifications'
import { ROLE_LABELS } from '@/lib/permissions'

type Params = { token: string }

async function loadInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      organization: { include: { subscription: true } },
      invitedBy: { select: { name: true } },
    },
  })
  if (!invitation || invitation.revokedAt) throw notFound('Invitation')
  return invitation
}

/** Public preview used by the /invite/[token] page. */
export const GET = route<Params>(async (request, { params }) => {
  const { token } = await params
  await enforceRateLimit(`invite-view:${clientIp(request)}`, 60, 60)
  const invitation = await loadInvitation(token)
  const [user, account] = await Promise.all([
    getCurrentUser(),
    prisma.user.findFirst({ where: { email: { equals: invitation.email, mode: 'insensitive' } }, select: { id: true } }),
  ])
  return {
    email: invitation.email,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role].label,
    organizationName: invitation.organization.name,
    invitedBy: invitation.invitedBy?.name ?? null,
    expired: invitation.expiresAt < new Date(),
    accepted: Boolean(invitation.acceptedAt),
    hasAccount: Boolean(account),
    signedInAs: user?.email ?? null,
  }
})

const acceptSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120).optional(),
  password: passwordSchema.optional(),
})

/**
 * Accepts an invitation.
 * - Signed in: the session email must match the invited email.
 * - Signed out: creates an account for the invited email (it must not exist yet).
 */
export const POST = route<Params>(async (request, { params }) => {
  const { token } = await params
  await enforceRateLimit(`invite-accept:${clientIp(request)}`, 20, 15 * 60)
  const invitation = await loadInvitation(token)
  if (invitation.acceptedAt) throw new ApiError('CONFLICT', 'This invitation has already been accepted.')
  if (invitation.expiresAt < new Date()) throw new ApiError('BAD_REQUEST', 'This invitation has expired. Ask for a new one.')
  if (invitation.organization.status === 'SUSPENDED') throw forbidden('This workspace is currently unavailable.')

  const org = invitation.organization
  const seatLimit = limitFor(resolveEntitlements(org.subscription, org).plan, 'users')
  if (seatLimit !== null) {
    // The pending invitation itself already holds a seat; only block if members alone fill the plan.
    const members = await prisma.membership.count({ where: { organizationId: org.id } })
    if (members >= seatLimit) {
      throw new ApiError('LIMIT_REACHED', 'This workspace has no free seats left. Ask the admin to upgrade the plan.')
    }
  }

  const body = await parseJson(request, acceptSchema)
  const current = await getCurrentUser()
  let userId: string

  if (current) {
    if (current.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw forbidden(`This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`)
    }
    userId = current.id
  } else {
    const exists = await prisma.user.findFirst({
      where: { email: { equals: invitation.email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (exists) throw new ApiError('CONFLICT', 'An account with this email already exists. Sign in to accept the invitation.')
    if (!body.name || !body.password) {
      throw new ApiError('VALIDATION_ERROR', 'Enter your name and a password to create your account.')
    }
    const created = await prisma.user.create({
      data: { name: body.name, email: invitation.email, password: await bcrypt.hash(body.password, 12), emailVerified: new Date() },
      select: { id: true },
    })
    userId = created.id
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    })
    if (claimed.count === 0) throw new ApiError('CONFLICT', 'This invitation has already been used.')
    await tx.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: org.id } },
      update: {},
      create: { userId, organizationId: org.id, role: invitation.role },
    })
    await tx.user.update({ where: { id: userId }, data: { lastOrganizationId: org.id } })
  })

  await audit({
    organizationId: org.id,
    userId,
    action: 'member.joined',
    entityType: 'invitation',
    entityId: invitation.id,
    metadata: { email: invitation.email, role: invitation.role },
  })
  await notify({
    organizationId: org.id,
    type: 'team.invitation',
    permission: 'team.view',
    title: `${invitation.email} joined the workspace`,
    body: `Role: ${ROLE_LABELS[invitation.role].label}`,
    link: '/team',
  })

  return { organizationId: org.id, email: invitation.email, createdAccount: !current }
})
