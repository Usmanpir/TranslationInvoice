'use client'
import Link from 'next/link'
import { AlertTriangle, Clock, Lock, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { cn } from '@/lib/utils'

/** Trial countdown, lapsed-plan and suspension notices shown above every app page. */
export function SubscriptionBanner() {
  const { subscription: s, can } = useWorkspace()
  const canBill = can('billing.manage')

  let tone: 'info' | 'warning' | 'danger' | null = null
  let Icon = Sparkles
  let text = ''

  if (s.readOnly) {
    tone = 'danger'
    Icon = Lock
    text = 'This workspace is suspended. Your data is safe, but changes are disabled. Contact support to restore access.'
  } else if (s.status === 'PAST_DUE') {
    tone = 'danger'
    Icon = AlertTriangle
    text = 'Your last payment failed. Update your billing details to avoid losing premium features.'
  } else if (s.lapsed) {
    tone = 'warning'
    Icon = AlertTriangle
    text = `Your ${s.subscribedPlanName} ${s.status === 'EXPIRED' ? 'trial' : 'plan'} has ended — Free plan limits now apply. Your data is safe.`
  } else if (s.isTrial && s.trialDaysLeft !== null) {
    tone = s.trialDaysLeft <= 3 ? 'warning' : 'info'
    Icon = Clock
    text =
      s.trialDaysLeft === 0
        ? `Your ${s.subscribedPlanName} trial ends today.`
        : `${s.trialDaysLeft} day${s.trialDaysLeft === 1 ? '' : 's'} left in your ${s.subscribedPlanName} trial.`
  } else if (s.cancelAtPeriodEnd && s.currentPeriodEnd) {
    tone = 'info'
    Icon = Clock
    text = `Your ${s.planName} plan ends on ${new Date(s.currentPeriodEnd).toLocaleDateString()}.`
  }

  if (!tone) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm border-b',
        tone === 'info' && 'bg-brand-50/80 text-brand-800 border-brand-100',
        tone === 'warning' && 'bg-amber-50 text-amber-800 border-amber-200/70',
        tone === 'danger' && 'bg-red-50 text-red-800 border-red-200/70'
      )}
    >
      <span className="inline-flex items-center gap-2 text-center">
        <Icon className="w-4 h-4 flex-shrink-0" />
        {text}
      </span>
      {canBill && !s.readOnly && (
        <Link href="/billing#plans" className="font-semibold underline underline-offset-2 hover:no-underline">
          {s.status === 'PAST_DUE' ? 'Update billing' : 'Choose a plan'}
        </Link>
      )}
    </div>
  )
}
