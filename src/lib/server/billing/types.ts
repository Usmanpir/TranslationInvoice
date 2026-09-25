import 'server-only'
import type { Organization, Subscription } from '@prisma/client'
import type { Interval, PlanId } from '@/lib/plans'

export interface BillingActor {
  organization: Organization
  subscription: Subscription | null
  user: { id: string; email: string; name: string }
}

export type CheckoutResult =
  /** Redirect the browser to a hosted checkout / portal page. */
  | { kind: 'redirect'; url: string }
  /** Change applied immediately (e.g. plan switch on an existing card subscription). */
  | { kind: 'updated' }
  /** Waiting on an offline step (manual bank transfer). */
  | { kind: 'pending'; instructions: string; reference: string }

/**
 * A payment provider. Implementations must never trust client-side state:
 * subscription status changes arrive through `handleWebhook` (or a SaaS admin action).
 */
export interface BillingProvider {
  readonly id: 'STRIPE' | 'MANUAL'
  readonly label: string
  isConfigured(): boolean
  /** Start or change a paid subscription. */
  checkout(actor: BillingActor, plan: PlanId, interval: Interval): Promise<CheckoutResult>
  /** Cancel at the end of the current period. */
  cancel(actor: BillingActor): Promise<void>
  /** Undo a scheduled cancellation. */
  resume(actor: BillingActor): Promise<void>
  /** Hosted page for payment methods and receipts, if the provider has one. */
  portal?(actor: BillingActor, returnUrl: string): Promise<string>
  /** Verify and apply a provider webhook. Must be idempotent. */
  handleWebhook?(request: Request): Promise<{ received: true }>
}
