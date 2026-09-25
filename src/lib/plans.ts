// Single source of truth for plans, prices, limits and features.
// Nothing else in the codebase may hardcode a limit or a price — read it from here.

export type PlanId = 'free' | 'starter' | 'professional' | 'business'
export type Interval = 'MONTH' | 'YEAR'

export type Feature =
  | 'paymentProofs'
  | 'customBranding'
  | 'advancedReports'
  | 'dataExport'
  | 'multiCurrency'
  | 'auditLog'
  | 'prioritySupport'
  | 'apiAccess'
  | 'multipleBranches'

export type LimitedResource = 'users' | 'customers' | 'invoices' | 'quotations' | 'storage'

export interface PlanLimits {
  /** null = unlimited */
  users: number | null
  customers: number | null
  invoicesPerMonth: number | null
  quotationsPerMonth: number | null
  storageMb: number | null
}

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** Prices in BILLING_CURRENCY, per month. Yearly is derived from YEARLY_DISCOUNT. */
  monthlyPrice: number
  limits: PlanLimits
  features: Feature[]
  highlighted?: boolean
}

export const BILLING_CURRENCY = 'AED'
export const YEARLY_DISCOUNT = 0.2
export const TRIAL = { days: 14, plan: 'professional' as PlanId }
/** Plan used when a subscription is expired/canceled — data stays, premium features lock. */
export const FALLBACK_PLAN: PlanId = 'free'

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For freelancers getting started',
    monthlyPrice: 0,
    limits: { users: 1, customers: 25, invoicesPerMonth: 10, quotationsPerMonth: 5, storageMb: 50 },
    features: [],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small teams sending regular invoices',
    monthlyPrice: 49,
    limits: { users: 3, customers: 100, invoicesPerMonth: 100, quotationsPerMonth: 100, storageMb: 1024 },
    features: ['paymentProofs', 'customBranding', 'advancedReports', 'dataExport'],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    tagline: 'For growing businesses and agencies',
    monthlyPrice: 99,
    limits: { users: 10, customers: null, invoicesPerMonth: null, quotationsPerMonth: null, storageMb: 5120 },
    features: ['paymentProofs', 'customBranding', 'advancedReports', 'dataExport', 'multiCurrency', 'auditLog', 'prioritySupport'],
    highlighted: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'For established companies with larger teams',
    monthlyPrice: 249,
    limits: { users: null, customers: null, invoicesPerMonth: null, quotationsPerMonth: null, storageMb: 20480 },
    features: [
      'paymentProofs',
      'customBranding',
      'advancedReports',
      'dataExport',
      'multiCurrency',
      'auditLog',
      'prioritySupport',
      'apiAccess',
      'multipleBranches',
    ],
  },
}

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'professional', 'business']

export const FEATURE_LABELS: Record<Feature, { label: string; comingSoon?: boolean }> = {
  paymentProofs: { label: 'Payment proof uploads' },
  customBranding: { label: 'Custom branding on invoices' },
  advancedReports: { label: 'Revenue, outstanding & VAT reports' },
  dataExport: { label: 'CSV exports' },
  multiCurrency: { label: 'Multiple currencies (AED, USD, EUR)' },
  auditLog: { label: 'Audit log' },
  prioritySupport: { label: 'Priority support' },
  apiAccess: { label: 'API access', comingSoon: true },
  multipleBranches: { label: 'Multiple branches', comingSoon: true },
}

export const RESOURCE_LABELS: Record<LimitedResource, { singular: string; plural: string; perMonth?: boolean }> = {
  users: { singular: 'team member', plural: 'team members' },
  customers: { singular: 'customer', plural: 'customers' },
  invoices: { singular: 'invoice', plural: 'invoices', perMonth: true },
  quotations: { singular: 'quotation', plural: 'quotations', perMonth: true },
  storage: { singular: 'MB of storage', plural: 'MB of storage' },
}

export function isPlanId(value: string): value is PlanId {
  return value in PLANS
}

export function getPlan(id: string): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS[FALLBACK_PLAN]
}

export function planPrice(id: PlanId, interval: Interval): number {
  const monthly = PLANS[id].monthlyPrice
  if (interval === 'MONTH') return monthly
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT))
}

export function limitFor(plan: Plan, resource: LimitedResource): number | null {
  switch (resource) {
    case 'users':
      return plan.limits.users
    case 'customers':
      return plan.limits.customers
    case 'invoices':
      return plan.limits.invoicesPerMonth
    case 'quotations':
      return plan.limits.quotationsPerMonth
    case 'storage':
      return plan.limits.storageMb
  }
}

/** Cheapest plan that lifts the given limit above `needed` (or includes a feature). */
export function suggestUpgrade(opts: { resource?: LimitedResource; needed?: number; feature?: Feature; current: PlanId }): PlanId | null {
  const start = PLAN_ORDER.indexOf(opts.current) + 1
  for (const id of PLAN_ORDER.slice(start)) {
    const plan = PLANS[id]
    if (opts.feature && !plan.features.includes(opts.feature)) continue
    if (opts.resource) {
      const limit = limitFor(plan, opts.resource)
      if (limit !== null && limit < (opts.needed ?? 0)) continue
    }
    return id
  }
  return null
}
