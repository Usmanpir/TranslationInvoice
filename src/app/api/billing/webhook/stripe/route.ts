import { route } from '@/lib/server/api'
import { getProvider } from '@/lib/server/billing'

// Stripe needs the raw body for signature verification; never cache this route.
export const dynamic = 'force-dynamic'

/** Stripe webhook endpoint. Authenticity is proven by the Stripe-Signature header. */
export const POST = route(async (request) => getProvider('STRIPE').handleWebhook!(request))
