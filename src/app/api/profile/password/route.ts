import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { assertNotDemoUser, requireAuth } from '@/lib/server/context'
import { ApiError } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { passwordSchema } from '@/lib/server/schemas'
import { audit } from '@/lib/server/audit'

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordSchema,
})

/** Changes the password and signs out every other session (the client re-authenticates). */
export const POST = route(async (request) => {
  const user = await requireAuth()
  assertNotDemoUser(user)
  await enforceRateLimit(`password-change:${user.id}`, 5, 15 * 60)
  const data = await parseJson(request, schema)

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } })
  if (!record || !(await bcrypt.compare(data.currentPassword, record.password))) {
    throw new ApiError('VALIDATION_ERROR', 'Your current password is incorrect.', { details: { field: 'currentPassword' } })
  }
  if (data.currentPassword === data.newPassword) {
    throw new ApiError('VALIDATION_ERROR', 'Choose a password you have not used before.', { details: { field: 'newPassword' } })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(data.newPassword, 12), tokenVersion: { increment: 1 } },
  })
  await audit({ userId: user.id, organizationId: user.lastOrganizationId, action: 'user.password_changed', ipAddress: clientIp(request) })
  return { reauthenticate: true }
})
