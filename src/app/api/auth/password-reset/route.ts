import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson, clientIp } from '@/lib/server/api'
import { ApiError } from '@/lib/server/errors'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { passwordSchema } from '@/lib/server/schemas'
import { hashToken, newInvitationToken } from '@/lib/server/team'
import { sendEmail, appUrl } from '@/lib/server/email'
import { audit } from '@/lib/server/audit'

const TTL_MS = 60 * 60 * 1000 // 1 hour

const requestSchema = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email') })

/** Step 1: request a reset link. Always answers the same way so emails can't be enumerated. */
export const POST = route(async (request) => {
  await enforceRateLimit(`pw-reset:${clientIp(request)}`, 5, 15 * 60)
  const { email } = await parseJson(request, requestSchema)
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, name: true, email: true } })

  if (user) {
    await enforceRateLimit(`pw-reset:user:${user.id}`, 3, 60 * 60)
    const { token, tokenHash } = newInvitationToken()
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TTL_MS) } })
    await sendEmail(user.email, 'passwordReset', { name: user.name, url: appUrl(`/reset-password/${token}`) })
  }
  return { sent: true }
})

const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema })

/** Step 2: set a new password with a valid, unused token. Signs out every existing session. */
export const PUT = route(async (request) => {
  await enforceRateLimit(`pw-reset-confirm:${clientIp(request)}`, 10, 15 * 60)
  const { token, password } = await parseJson(request, resetSchema)
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError('BAD_REQUEST', 'This reset link is invalid or has expired. Please request a new one.')
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { password: await bcrypt.hash(password, 12), tokenVersion: { increment: 1 } } }),
  ])
  await audit({ userId: record.userId, action: 'user.password_changed', metadata: { via: 'reset_link' }, ipAddress: clientIp(request) })
  return { reset: true }
})
