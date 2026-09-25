import { prisma } from '@/lib/prisma'
import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'

/** Marks onboarding finished (steps are optional; details can be completed later in Settings). */
export const POST = route(async () => {
  const ctx = await requireOrganization({ permission: 'settings.manage' })
  if (ctx.organization.onboardingCompletedAt) return { completed: true }
  await prisma.organization.update({
    where: { id: ctx.organization.id },
    data: { onboardingCompletedAt: new Date() },
  })
  return { completed: true }
})
