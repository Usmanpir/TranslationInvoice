'use client'
import { useState } from 'react'
import { IntervalToggle, PricingCards } from '@/components/billing/PricingCards'
import { BILLING_CURRENCY, YEARLY_DISCOUNT, type Interval } from '@/lib/plans'

export function MarketingPricing() {
  const [interval, setInterval] = useState<Interval>('MONTH')
  return (
    <div>
      <div className="flex flex-col items-center gap-3 mb-10">
        <IntervalToggle value={interval} onChange={setInterval} />
        <p className="text-sm text-emerald-700 font-medium">Save {Math.round(YEARLY_DISCOUNT * 100)}% with annual billing.</p>
      </div>
      <PricingCards mode="marketing" interval={interval} />
      <p className="text-xs text-slate-400 mt-6 text-center">Prices in {BILLING_CURRENCY}. VAT may apply where required by law. Cancel any time.</p>
    </div>
  )
}
