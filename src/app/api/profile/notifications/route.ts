import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { route, parseJson } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { NOTIFICATION_TYPES, prefFor, type NotificationPrefs, type NotificationType } from '@/lib/notification-types'

const types = Object.keys(NOTIFICATION_TYPES) as [NotificationType, ...NotificationType[]]

const prefsSchema = z.object({
  prefs: z.record(z.enum(types), z.object({ inApp: z.boolean(), email: z.boolean() })),
})

/** Notification preferences are per member, per workspace. */
export const GET = route(async () => {
  const ctx = await requireOrganization()
  const stored = ctx.membership.notificationPrefs as NotificationPrefs | null
  return types.map((type) => ({ type, ...NOTIFICATION_TYPES[type], ...prefFor(stored, type) }))
})

export const PUT = route(async (request) => {
  const ctx = await requireOrganization()
  const { prefs } = await parseJson(request, prefsSchema)
  const merged = { ...((ctx.membership.notificationPrefs as NotificationPrefs | null) ?? {}), ...prefs }
  await prisma.membership.update({ where: { id: ctx.membership.id }, data: { notificationPrefs: merged } })
  return { saved: true }
})
