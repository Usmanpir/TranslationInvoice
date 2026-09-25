import 'server-only'
import { prisma } from '@/lib/prisma'
import { ApiError } from './errors'

/**
 * Fixed-window rate limiter backed by Postgres, so limits hold across serverless instances.
 * Returns whether the call is allowed; use `enforceRateLimit` to throw instead.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000)

  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END
    RETURNING "count", "expiresAt"
  `
  const row = rows[0]
  const retryAfter = Math.max(1, Math.ceil((new Date(row.expiresAt).getTime() - now.getTime()) / 1000))
  return { allowed: row.count <= limit, retryAfter }
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const { allowed, retryAfter } = await rateLimit(key, limit, windowSeconds)
  if (!allowed) {
    throw new ApiError('RATE_LIMITED', 'Too many attempts. Please wait a moment and try again.', {
      details: { retryAfter },
    })
  }
}

/** Opportunistic cleanup; cheap enough to call from time to time. */
export async function purgeExpiredRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
