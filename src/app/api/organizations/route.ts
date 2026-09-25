import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireAuth } from '@/lib/server/context'
import { notFound } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { provisionOrganization } from '@/lib/server/organizations'
import { audit } from '@/lib/server/audit'
import { CURRENCY_CODES } from '@/lib/utils'

/** Workspaces the signed-in user belongs to (for the workspace switcher). */
export const GET = route(async () => {
  const user = await requireAuth()
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: { select: { id: true, name: true, logoUploadId: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
    status: m.organization.status,
    logoUrl: m.organization.logoUploadId ? `/api/files/${m.organization.logoUploadId}` : null,
    active: m.organization.id === user.lastOrganizationId,
  }))
})

const createSchema = z.object({
  name: z.string().trim().min(2, 'Business name must be at least 2 characters').max(160),
  country: z.string().trim().length(2).toUpperCase().default('AE'),
  currency: z.enum(CURRENCY_CODES).default('AED'),
})

/** Creates an additional workspace owned by the signed-in user and switches to it. */
export const POST = route(async (request) => {
  const user = await requireAuth()
  await enforceRateLimit(`create-org:${user.id}`, 5, 24 * 60 * 60)
  const data = await parseJson(request, createSchema)

  const ownsAnother = await prisma.membership.count({ where: { userId: user.id, role: 'OWNER' } })
  const organization = await prisma.$transaction((tx) =>
    provisionOrganization(tx, {
      ownerId: user.id,
      name: data.name,
      country: data.country,
      email: user.email,
      defaultCurrency: data.currency,
      // One free trial per person: extra workspaces start on the Free plan.
      trial: ownsAnother === 0,
    })
  )
  await audit({
    organizationId: organization.id,
    userId: user.id,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { name: organization.name, trial: ownsAnother === 0 },
  })
  return { id: organization.id, name: organization.name }
})

const switchSchema = z.object({ organizationId: z.string().min(1) })

/** Switches the active workspace. Only organizations the user is a member of are accepted. */
export const PUT = route(async (request) => {
  const user = await requireAuth()
  const { organizationId } = await parseJson(request, switchSchema)
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    select: { id: true },
  })
  if (!membership) throw notFound('Workspace')
  await prisma.user.update({ where: { id: user.id }, data: { lastOrganizationId: organizationId } })
  return { organizationId }
})
