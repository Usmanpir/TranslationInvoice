import 'server-only'
import { prisma } from '@/lib/prisma'
import { prefFor, type NotificationPrefs, type NotificationType } from '@/lib/notification-types'
import type { Permission } from '@/lib/permissions'
import { hasPermission } from '@/lib/permissions'

interface NotifyInput {
  organizationId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  /** Target a single member; otherwise every member who passes `permission` (if given). */
  userId?: string
  permission?: Permission
}

/**
 * Creates in-app notifications respecting each member's preferences.
 * Returns the members who opted into email for this type, so callers can send emails.
 */
export async function notify(input: NotifyInput): Promise<{ email: string; name: string }[]> {
  try {
    const members = await prisma.membership.findMany({
      where: { organizationId: input.organizationId, ...(input.userId && { userId: input.userId }) },
      select: { userId: true, role: true, notificationPrefs: true, user: { select: { email: true, name: true } } },
    })

    const recipients = members.filter((m) => !input.permission || hasPermission(m.role, input.permission))
    const inApp = recipients.filter((m) => prefFor(m.notificationPrefs as NotificationPrefs, input.type).inApp)

    if (inApp.length > 0) {
      await prisma.notification.createMany({
        data: inApp.map((m) => ({
          organizationId: input.organizationId,
          userId: m.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
        })),
      })
    }

    return recipients
      .filter((m) => prefFor(m.notificationPrefs as NotificationPrefs, input.type).email)
      .map((m) => ({ email: m.user.email, name: m.user.name }))
  } catch (error) {
    console.error('[notify] failed', input.type, error)
    return []
  }
}
