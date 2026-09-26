'use client'
import Link from 'next/link'
import { Check, Loader2, Sparkles } from 'lucide-react'
import {
  BILLING_CURRENCY,
  FEATURE_LABELS,
  PLAN_ORDER,
  PLANS,
  YEARLY_DISCOUNT,
  planPrice,
  type Interval,
  type PlanId,
} from '@/lib/plans'
import { cn } from '@/lib/utils'

const fmtLimit = (n: number | null, unit: string) => (n === null ? `Unlimited ${unit}` : `${n.toLocaleString()} ${unit}`)
const fmtStorage = (mb: number | null) => (mb === null ? 'Unlimited storage' : mb >= 1024 ? `${mb / 1024} GB storage` : `${mb} MB storage`)

export function planHighlights(id: PlanId): string[] {
  const p = PLANS[id]
  return [
    fmtLimit(p.limits.users, p.limits.users === 1 ? 'user' : 'users'),
    fmtLimit(p.limits.customers, 'customers'),
    p.limits.invoicesPerMonth === null ? 'Unlimited invoices' : `${p.limits.invoicesPerMonth} invoices / month`,
    p.limits.quotationsPerMonth === null ? 'Unlimited quotations' : `${p.limits.quotationsPerMonth} quotations / month`,
    fmtStorage(p.limits.storageMb),
    'PDF invoices & quotations',
    ...p.features.map((f) => FEATURE_LABELS[f].label + (FEATURE_LABELS[f].comingSoon ? ' (coming soon)' : '')),
  ]
}

export function IntervalToggle({ value, onChange }: { value: Interval; onChange: (v: Interval) => void }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70" role="radiogroup" aria-label="Billing interval">
      {(['MONTH', 'YEAR'] as const).map((iv) => (
        <button
          key={iv}
          role="radio"
          aria-checked={value === iv}
          onClick={() => onChange(iv)}
          className={cn(
            'px-4 h-9 text-sm font-semibold rounded-lg transition-all',
            value === iv ? 'bg-card text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
          )}
        >
          {iv === 'MONTH' ? 'Monthly' : 'Yearly'}
          {iv === 'YEAR' && <span className="ml-1.5 text-[11px] font-bold text-emerald-600">−{Math.round(YEARLY_DISCOUNT * 100)}%</span>}
        </button>
      ))}
    </div>
  )
}

interface PricingCardsProps {
  interval: Interval
  /** Marketing mode links to signup; app mode calls onSelect. */
  mode: 'marketing' | 'app'
  currentPlan?: PlanId
  currentInterval?: Interval
  busyPlan?: PlanId | null
  disabled?: boolean
  onSelect?: (plan: PlanId) => void
}

export function PricingCards({ interval, mode, currentPlan, currentInterval, busyPlan, disabled, onSelect }: PricingCardsProps) {
  const currentIndex = currentPlan ? PLAN_ORDER.indexOf(currentPlan) : -1

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
      {PLAN_ORDER.map((id, index) => {
        const plan = PLANS[id]
        const price = planPrice(id, interval)
        const perMonth = interval === 'YEAR' ? Math.round((price / 12) * 100) / 100 : price
        const isCurrent = mode === 'app' && currentPlan === id && (id === 'free' || currentInterval === interval)
        const highlighted = plan.highlighted

        let cta = 'Choose plan'
        if (mode === 'marketing') cta = id === 'free' ? 'Start free' : 'Start free trial'
        else if (isCurrent) cta = 'Current plan'
        else if (currentPlan === id) cta = interval === 'YEAR' ? 'Switch to yearly' : 'Switch to monthly'
        else cta = index > currentIndex ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`

        return (
          <div
            key={id}
            className={cn(
              'relative flex flex-col rounded-3xl p-6 transition-all duration-300',
              highlighted
                ? 'bg-ink-950 text-white shadow-glow ring-1 ring-brand-500/40 xl:-translate-y-2'
                : 'bg-card ring-1 ring-slate-200/80 shadow-card hover:shadow-card-hover hover:-translate-y-0.5',
              isCurrent && !highlighted && 'ring-2 ring-brand-500'
            )}
          >
            {highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 text-[11px] font-bold text-white shadow-lg whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> Most popular
              </span>
            )}
            {isCurrent && (
              <span className={cn('absolute top-5 right-5 badge', highlighted ? 'bg-white/10 text-white border-white/20' : 'bg-brand-50 text-brand-700 border-brand-200')}>
                Current plan
              </span>
            )}
            <h3 className={cn('font-display text-lg font-bold', highlighted ? 'text-white' : 'text-slate-900')}>{plan.name}</h3>
            <p className={cn('text-sm mt-1 min-h-[40px]', highlighted ? 'text-ink-400' : 'text-slate-500')}>{plan.tagline}</p>

            <div className="mt-5 flex items-baseline gap-1.5">
              <span className={cn('text-sm font-semibold', highlighted ? 'text-ink-300' : 'text-slate-500')}>{BILLING_CURRENCY}</span>
              <span className={cn('font-display text-4xl font-extrabold tracking-tight tabular-nums', highlighted ? 'text-white' : 'text-slate-900')}>
                {perMonth.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={cn('text-sm', highlighted ? 'text-ink-400' : 'text-slate-500')}>/ month</span>
            </div>
            <p className={cn('text-xs mt-1 h-4', highlighted ? 'text-ink-400' : 'text-slate-400')}>
              {price === 0 ? 'Free forever' : interval === 'YEAR' ? `${BILLING_CURRENCY} ${price.toLocaleString()} billed yearly` : 'Billed monthly'}
            </p>

            <div className="mt-6">
              {mode === 'marketing' ? (
                <Link href={`/register?plan=${id}`} className={cn('w-full', highlighted ? 'btn-primary' : 'btn-secondary')}>
                  {cta}
                </Link>
              ) : (
                <button
                  onClick={() => onSelect?.(id)}
                  disabled={disabled || isCurrent || busyPlan !== null}
                  className={cn('w-full', highlighted && !isCurrent ? 'btn-primary' : 'btn-secondary', highlighted && isCurrent && 'bg-white/10 text-white border-white/20')}
                >
                  {busyPlan === id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cta}
                </button>
              )}
            </div>

            <ul className="mt-6 space-y-2.5 text-sm flex-1">
              {planHighlights(id).map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className={cn('w-4 h-4 mt-0.5 flex-shrink-0', highlighted ? 'text-brand-300' : 'text-emerald-500')} />
                  <span className={highlighted ? 'text-ink-300' : 'text-slate-600'}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
