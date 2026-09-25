import { describe, expect, it } from 'vitest'
import { PLANS, planPrice, suggestUpgrade, limitFor, YEARLY_DISCOUNT } from '@/lib/plans'
import { resolveEntitlements } from '@/lib/server/subscription'

const DAY = 86_400_000
const now = new Date('2026-09-25T10:00:00Z')
const active = { status: 'ACTIVE' as const }

describe('plan pricing', () => {
  it('uses the configured AED prices', () => {
    expect(planPrice('free', 'MONTH')).toBe(0)
    expect(planPrice('starter', 'MONTH')).toBe(49)
    expect(planPrice('professional', 'MONTH')).toBe(99)
    expect(planPrice('business', 'MONTH')).toBe(249)
  })

  it('applies the yearly discount', () => {
    expect(planPrice('professional', 'YEAR')).toBe(Math.round(99 * 12 * (1 - YEARLY_DISCOUNT)))
  })

  it('suggests the cheapest plan that lifts a limit', () => {
    expect(suggestUpgrade({ resource: 'invoices', needed: 11, current: 'free' })).toBe('starter')
    expect(suggestUpgrade({ resource: 'invoices', needed: 101, current: 'starter' })).toBe('professional')
    expect(suggestUpgrade({ resource: 'users', needed: 11, current: 'professional' })).toBe('business')
    expect(suggestUpgrade({ feature: 'multiCurrency', current: 'free' })).toBe('professional')
    expect(suggestUpgrade({ resource: 'users', needed: 5, current: 'business' })).toBeNull()
  })

  it('treats null limits as unlimited', () => {
    expect(limitFor(PLANS.business, 'users')).toBeNull()
    expect(limitFor(PLANS.free, 'invoices')).toBe(10)
  })
})

describe('entitlements', () => {
  const sub = (o: Partial<Parameters<typeof resolveEntitlements>[0] & object>) =>
    ({ plan: 'professional', status: 'ACTIVE', trialEnd: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, ...o }) as any

  it('an active trial grants the trial plan and counts down days', () => {
    const e = resolveEntitlements(sub({ status: 'TRIALING', trialEnd: new Date(now.getTime() + 3.5 * DAY) }), active, now)
    expect(e.plan.id).toBe('professional')
    expect(e.isTrial).toBe(true)
    expect(e.trialDaysLeft).toBe(4)
    expect(e.lapsed).toBe(false)
  })

  it('an expired trial falls back to Free without deleting access to data', () => {
    const e = resolveEntitlements(sub({ status: 'TRIALING', trialEnd: new Date(now.getTime() - DAY) }), active, now)
    expect(e.status).toBe('EXPIRED')
    expect(e.plan.id).toBe('free')
    expect(e.lapsed).toBe(true)
    expect(e.readOnly).toBe(false)
  })

  it('a canceled plan stays active until the paid period ends', () => {
    const before = resolveEntitlements(sub({ status: 'CANCELED', currentPeriodEnd: new Date(now.getTime() + DAY) }), active, now)
    expect(before.plan.id).toBe('professional')
    const after = resolveEntitlements(sub({ status: 'CANCELED', currentPeriodEnd: new Date(now.getTime() - DAY) }), active, now)
    expect(after.plan.id).toBe('free')
  })

  it('manual plans lapse at the end of the paid period', () => {
    const e = resolveEntitlements(sub({ provider: 'MANUAL', currentPeriodEnd: new Date(now.getTime() - DAY) }), active, now)
    expect(e.status).toBe('EXPIRED')
    expect(e.plan.id).toBe('free')
  })

  it('past-due keeps the plan (grace period)', () => {
    const e = resolveEntitlements(sub({ status: 'PAST_DUE' }), active, now)
    expect(e.plan.id).toBe('professional')
  })

  it('a suspended organization is read-only', () => {
    const e = resolveEntitlements(sub({}), { status: 'SUSPENDED' }, now)
    expect(e.readOnly).toBe(true)
  })
})
