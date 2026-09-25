import { route } from '@/lib/server/api'
import { requireOrganization } from '@/lib/server/context'
import { badRequest, notFound } from '@/lib/server/errors'
import { getProvider } from '@/lib/server/billing'
import { appUrl } from '@/lib/server/email'

type Params = { action: string }

/** POST /api/billing/cancel | resume | portal */
export const POST = route<Params>(async (_request, { params }) => {
  const { action } = await params
  const ctx = await requireOrganization({ permission: 'billing.manage', write: action !== 'portal' })
  const sub = ctx.subscription
  const actor = { organization: ctx.organization, subscription: sub, user: ctx.user }

  if (action === 'portal') {
    if (sub?.provider !== 'STRIPE') throw badRequest('Card billing is not set up for this workspace.')
    return { url: await getProvider('STRIPE').portal!(actor, appUrl('/billing')) }
  }

  if (!sub || sub.provider === 'NONE') {
    throw badRequest(ctx.entitlements.isTrial ? 'Your trial ends automatically — there is nothing to cancel.' : 'There is no paid subscription to change.')
  }
  const provider = getProvider(sub.provider)

  if (action === 'cancel') {
    await provider.cancel(actor)
    return { canceled: true }
  }
  if (action === 'resume') {
    await provider.resume(actor)
    return { resumed: true }
  }
  throw notFound('Billing action')
})
