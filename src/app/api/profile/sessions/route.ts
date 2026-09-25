import { prisma } from '@/lib/prisma'
import { route, clientIp } from '@/lib/server/api'
import { assertNotDemoUser, requireAuth } from '@/lib/server/context'
import { audit } from '@/lib/server/audit'

/** "Log out of all devices": every issued session token becomes invalid immediately. */
export const DELETE = route(async (request) => {
  const user = await requireAuth()
  assertNotDemoUser(user)
  await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } })
  await audit({ userId: user.id, organizationId: user.lastOrganizationId, action: 'user.sessions_revoked', ipAddress: clientIp(request) })
  return { signedOut: true }
})
