'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CalendarClock, CheckCircle2, Copy, CreditCard, ExternalLink, Landmark, Loader2, Receipt, RotateCcw, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert, PageLoader } from '@/components/ui/States'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/Dialog'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { IntervalToggle, PricingCards } from '@/components/billing/PricingCards'
import { UsageMeter } from '@/components/billing/UsageMeter'
import { api } from '@/lib/api-client'
import { PLANS, planPrice, type Interval, type PlanId } from '@/lib/plans'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface BillingData {
  current: {
    planId: PlanId
    planName: string
    subscribedPlanId: PlanId
    status: string
    interval: Interval
    provider: 'NONE' | 'STRIPE' | 'MANUAL'
    isTrial: boolean
    trialEnd: string | null
    trialDaysLeft: number | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    lapsed: boolean
    readOnly: boolean
    canManage: boolean
  }
  usage: { resource: string; label: string; used: number; limit: number | null }[]
  providers: { id: 'STRIPE' | 'MANUAL'; label: string }[]
  currency: string
  payments: {
    id: string
    provider: string
    providerRef: string | null
    plan: string
    interval: Interval
    amount: number
    currency: string
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
    description: string | null
    receiptUrl: string | null
    paidAt: string | null
    createdAt: string
  }[]
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  TRIALING: { label: 'Trial', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAST_DUE: { label: 'Past due', cls: 'bg-red-50 text-red-700 border-red-200' },
  CANCELED: { label: 'Canceled', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  EXPIRED: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUSPENDED: { label: 'Suspended', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const PAYMENT_STATUS: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading billing…" />}>
      <Billing />
    </Suspense>
  )
}

function Billing() {
  const router = useRouter()
  const search = useSearchParams()
  const dialog = useDialog()
  const { handleError, toast } = useFeedback()
  const [data, setData] = useState<BillingData | null>(null)
  const [interval, setInterval] = useState<Interval>('MONTH')
  const [busy, setBusy] = useState<PlanId | 'cancel' | 'resume' | 'portal' | null>(null)
  const [choosing, setChoosing] = useState<PlanId | null>(null)
  const [pending, setPending] = useState<{ instructions: string; reference: string; plan: PlanId } | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await api<BillingData>('/api/billing')
      setData(d)
      setInterval((iv) => (d.current.provider !== 'NONE' ? d.current.interval : iv))
    } catch (e) {
      handleError(e, 'Could not load billing.')
    }
  }, [handleError])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const result = search.get('checkout')
    if (result === 'success') toast.success('Payment received — your plan updates in a few seconds.')
    if (result === 'canceled') toast.info('Checkout canceled. No changes were made.')
    if (result) router.replace('/billing')
  }, [search, router, toast])

  if (!data) return <PageLoader label="Loading billing…" />
  const c = data.current
  const status = STATUS_LABEL[c.status] ?? STATUS_LABEL.ACTIVE
  const hasCard = data.providers.some((p) => p.id === 'STRIPE')
  const hasManual = data.providers.some((p) => p.id === 'MANUAL')
  const pendingManual = data.payments.find((p) => p.provider === 'MANUAL' && p.status === 'PENDING')

  const runCheckout = async (plan: PlanId, provider: 'STRIPE' | 'MANUAL') => {
    setChoosing(null)
    setBusy(plan)
    try {
      const res = await api<{ kind: string; url?: string; message?: string; instructions?: string; reference?: string }>('/api/billing/checkout', {
        body: { plan, interval, provider },
      })
      if (res.kind === 'redirect' && res.url) {
        window.location.href = res.url
        return
      }
      if (res.kind === 'pending') setPending({ instructions: res.instructions!, reference: res.reference!, plan })
      else toast.success(res.message ?? `Plan updated to ${PLANS[plan].name}.`)
      await load()
      router.refresh()
    } catch (e) {
      handleError(e)
    } finally {
      setBusy(null)
    }
  }

  const select = async (plan: PlanId) => {
    if (plan === 'free') {
      const ok = await dialog.confirm({
        title: 'Switch to the Free plan?',
        message:
          c.provider === 'STRIPE'
            ? 'Your paid plan stays active until the end of the current billing period, then Free plan limits apply. Your data is kept.'
            : 'Free plan limits apply immediately. Your data is kept and you can upgrade again at any time.',
        confirmLabel: 'Switch to Free',
        variant: 'warning',
      })
      if (ok) runCheckout('free', 'STRIPE')
      return
    }
    // Existing card subscribers change plan in place; others choose how to pay.
    if (c.provider === 'STRIPE' && ['ACTIVE', 'PAST_DUE'].includes(c.status)) return runCheckout(plan, 'STRIPE')
    if (hasCard && hasManual) return setChoosing(plan)
    if (hasCard) return runCheckout(plan, 'STRIPE')
    if (hasManual) return runCheckout(plan, 'MANUAL')
    handleError(new Error('no provider'), 'Online payments are not configured yet. Please contact support.')
  }

  const cancel = async () => {
    const ok = await dialog.confirm({
      title: `Cancel your ${c.planName} plan?`,
      message: `You keep ${c.planName} until ${c.currentPeriodEnd ? formatDate(c.currentPeriodEnd) : 'the end of the period'}. After that the workspace moves to Free limits — no data is deleted.`,
      confirmLabel: 'Cancel subscription',
      variant: 'danger',
    })
    if (!ok) return
    setBusy('cancel')
    try {
      await api('/api/billing/cancel', { method: 'POST' })
      toast.success('Subscription canceled. It stays active until the end of the period.')
      await load()
      router.refresh()
    } catch (e) {
      handleError(e)
    } finally {
      setBusy(null)
    }
  }

  const resume = async () => {
    setBusy('resume')
    try {
      await api('/api/billing/resume', { method: 'POST' })
      toast.success('Subscription reactivated.')
      await load()
      router.refresh()
    } catch (e) {
      handleError(e)
    } finally {
      setBusy(null)
    }
  }

  const portal = async () => {
    setBusy('portal')
    try {
      const { url } = await api<{ url: string }>('/api/billing/portal', { method: 'POST' })
      window.location.href = url
    } catch (e) {
      handleError(e)
      setBusy(null)
    }
  }

  const paidPlan = c.subscribedPlanId !== 'free' && ['ACTIVE', 'PAST_DUE'].includes(c.status)

  return (
    <div>
      <PageHeader title="Billing" description="Your plan, usage and payment history" />
      <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl">
        {c.readOnly && <Alert>This workspace is suspended. Contact support to restore access.</Alert>}
        {!c.canManage && <Alert>Only workspace owners and admins can change the plan.</Alert>}

        {/* Current plan + usage */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-ink-950 text-white p-6 sm:p-7 animate-fade-up">
            <div aria-hidden className="absolute inset-0 bg-grid-dark mask-radial opacity-70" />
            <div aria-hidden className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.35),transparent)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Current plan</p>
                <span className={cn('badge', status.cls)}>{status.label}</span>
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">{PLANS[c.subscribedPlanId].name}</p>
              <p className="mt-1 text-sm text-ink-400">
                {c.subscribedPlanId === 'free'
                  ? 'Free forever'
                  : `${data.currency} ${planPrice(c.subscribedPlanId, c.interval).toLocaleString()} / ${c.interval === 'YEAR' ? 'year' : 'month'}`}
              </p>

              <dl className="mt-6 space-y-2.5 text-sm">
                {c.isTrial && c.trialEnd && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">Trial ends</dt>
                    <dd className="font-medium">
                      {formatDate(c.trialEnd)} ({c.trialDaysLeft} day{c.trialDaysLeft === 1 ? '' : 's'} left)
                    </dd>
                  </div>
                )}
                {!c.isTrial && c.currentPeriodEnd && paidPlan && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">{c.provider === 'MANUAL' ? 'Paid until' : c.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}</dt>
                    <dd className="font-medium">{formatDate(c.currentPeriodEnd)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Billing method</dt>
                  <dd className="font-medium">{c.provider === 'STRIPE' ? 'Card' : c.provider === 'MANUAL' ? 'Bank transfer' : '—'}</dd>
                </div>
                {c.lapsed && (
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30 text-fixed-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Free plan limits apply until you choose a plan. Your data is safe.
                  </div>
                )}
              </dl>

              {c.canManage && !c.readOnly && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {c.provider === 'STRIPE' && (
                    <button onClick={portal} disabled={busy !== null} className="btn h-9 px-3 text-sm bg-white/10 hover:bg-white/15 text-white ring-1 ring-inset ring-white/15">
                      {busy === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Payment methods
                    </button>
                  )}
                  {paidPlan && !c.cancelAtPeriodEnd && c.provider !== 'NONE' && (
                    <button onClick={cancel} disabled={busy !== null} className="btn h-9 px-3 text-sm text-red-300 hover:bg-red-500/10 ring-1 ring-inset ring-red-400/30">
                      {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Cancel subscription
                    </button>
                  )}
                  {c.cancelAtPeriodEnd && (
                    <button onClick={resume} disabled={busy !== null} className="btn-primary h-9 text-sm">
                      {busy === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Reactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-3 card p-6 sm:p-7 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="section-title">Usage</h2>
                <p className="section-desc">Against your {c.planName} plan limits · monthly counters reset on the 1st</p>
              </div>
              <CalendarClock className="w-5 h-5 text-slate-300" />
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              {data.usage.map((u) => (
                <UsageMeter key={u.resource} label={u.label} used={u.used} limit={u.limit} />
              ))}
            </div>
          </section>
        </div>

        {pendingManual && (
          <Alert>
            A bank-transfer request for {PLANS[pendingManual.plan as PlanId]?.name ?? pendingManual.plan} ({formatCurrency(pendingManual.amount, pendingManual.currency)}) is awaiting
            confirmation. Reference: <span className="font-mono font-semibold">{pendingManual.providerRef}</span>
          </Alert>
        )}

        {/* Plans */}
        <section id="plans" className="scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Plans</h2>
              <p className="text-sm text-slate-500 mt-0.5">Upgrade any time. Downgrades keep your data.</p>
            </div>
            <IntervalToggle value={interval} onChange={setInterval} />
          </div>
          <PricingCards
            mode="app"
            interval={interval}
            currentPlan={paidPlan || c.subscribedPlanId === 'free' ? c.subscribedPlanId : undefined}
            currentInterval={c.interval}
            busyPlan={typeof busy === 'string' && busy in PLANS ? (busy as PlanId) : null}
            disabled={!c.canManage || c.readOnly}
            onSelect={select}
          />
          <p className="text-xs text-slate-400 mt-4 text-center">Prices in {data.currency}. VAT may apply where required by law.</p>
        </section>

        {/* History */}
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Billing history</h2>
              <p className="section-desc">Subscription charges and bank-transfer requests</p>
            </div>
            <Receipt className="w-5 h-5 text-slate-300" />
          </div>
          {data.payments.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No billing activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Description</th>
                    <th className="text-left hidden md:table-cell">Method</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-sm text-slate-600 whitespace-nowrap">{formatDate(p.paidAt ?? p.createdAt)}</td>
                      <td className="text-sm text-slate-700">{p.description ?? PLANS[p.plan as PlanId]?.name ?? p.plan}</td>
                      <td className="text-sm text-slate-500 hidden md:table-cell">{p.provider === 'STRIPE' ? 'Card' : 'Bank transfer'}</td>
                      <td>
                        <span className={cn('badge', PAYMENT_STATUS[p.status])}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
                      </td>
                      <td className="text-right text-sm font-semibold tabular-nums">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="text-right">
                        {p.receiptUrl ? (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="icon-btn inline-flex hover:text-brand-600" title="View receipt">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Choose payment method */}
      {choosing && (
        <Modal title={`Upgrade to ${PLANS[choosing].name}`} description="How would you like to pay?" icon={CreditCard} onClose={() => setChoosing(null)}>
          <div className="px-6 pb-6 space-y-3">
            <button onClick={() => runCheckout(choosing, 'STRIPE')} className="w-full flex items-center gap-3 p-4 rounded-2xl ring-1 ring-slate-200 hover:ring-brand-300 hover:bg-brand-50/40 text-left transition">
              <CreditCard className="w-5 h-5 text-brand-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Pay by card</span>
                <span className="block text-xs text-slate-500">Instant activation · secure checkout by Stripe</span>
              </span>
            </button>
            <button onClick={() => runCheckout(choosing, 'MANUAL')} className="w-full flex items-center gap-3 p-4 rounded-2xl ring-1 ring-slate-200 hover:ring-brand-300 hover:bg-brand-50/40 text-left transition">
              <Landmark className="w-5 h-5 text-brand-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Bank transfer</span>
                <span className="block text-xs text-slate-500">Activated once we confirm your transfer</span>
              </span>
            </button>
          </div>
        </Modal>
      )}

      {pending && (
        <Modal title="Complete your bank transfer" description={`${PLANS[pending.plan].name} plan`} icon={Landmark} onClose={() => setPending(null)}>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-slate-600 whitespace-pre-line">{pending.instructions}</p>
            <div>
              <p className="label">Payment reference</p>
              <div className="flex gap-2">
                <input readOnly value={pending.reference} className="input font-mono" />
                <button onClick={() => navigator.clipboard.writeText(pending.reference).then(() => toast.success('Reference copied.'))} className="btn-secondary" aria-label="Copy reference">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <Alert variant="success">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Request recorded. We&apos;ll email you when your plan is active.
              </span>
            </Alert>
            <button onClick={() => setPending(null)} className="btn-primary w-full">
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
