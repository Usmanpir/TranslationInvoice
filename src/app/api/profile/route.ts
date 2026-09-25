import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { assertNotDemoUser, requireAuth } from '@/lib/server/context'

const DATE_FORMATS = ['MMM dd, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: z.string().trim().max(50).optional().nullable().transform((v) => v || null),
  locale: z.enum(['en', 'ar']).optional(),
  timezone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz })
        return true
      } catch {
        return false
      }
    }, 'Unknown timezone')
    .optional(),
  dateFormat: z.enum(DATE_FORMATS).optional(),
})

const select = {
  id: true,
  name: true,
  email: true,
  phone: true,
  locale: true,
  timezone: true,
  dateFormat: true,
  createdAt: true,
} as const

export const GET = route(async () => {
  const user = await requireAuth()
  return prisma.user.findUnique({ where: { id: user.id }, select })
})

export const PUT = route(async (request) => {
  const user = await requireAuth()
  assertNotDemoUser(user)
  const data = await parseJson(request, profileSchema)
  return prisma.user.update({ where: { id: user.id }, data, select })
})
