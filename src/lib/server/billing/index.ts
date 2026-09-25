import 'server-only'
import { manualProvider } from './manual'
import { stripeProvider } from './stripe'
import type { BillingProvider } from './types'

export type { BillingActor, BillingProvider, CheckoutResult } from './types'
export { applySubscriptionChange, assertFitsPlan, addInterval } from './service'

// Register new providers (Telr, Network International, Tap, …) here.
const PROVIDERS: Record<BillingProvider['id'], BillingProvider> = {
  STRIPE: stripeProvider,
  MANUAL: manualProvider,
}

export function getProvider(id: BillingProvider['id']): BillingProvider {
  return PROVIDERS[id]
}

export function availableProviders() {
  return Object.values(PROVIDERS)
    .filter((p) => p.isConfigured())
    .map((p) => ({ id: p.id, label: p.label }))
}
