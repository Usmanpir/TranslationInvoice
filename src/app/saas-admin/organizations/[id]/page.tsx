'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Ban, CalendarPlus, CheckCircle2, Layers, Loader2, PlayCircle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert, PageLoader } from '@/components/ui/States'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/Dialog'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { UsageMeter } from '@/components/billing/UsageMeter'
import { AuditTable } from '@/components/audit/AuditTable'
import { api } from '@/lib/api-client'
import { PLAN_ORDER, PLANS, limitFor, getPlan, type PlanId } from '@/lib/plans'
import { ROLE_LABELS } from '@/lib/permissions'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { SUB_TONE } from '@/components/saas-admin/tones'

export default function SaasOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const dialog = useDialog()
  const { handleError, toast } = useFeedback()
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<'plan' | 'trial' | 'delete' | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/saas-admin/organizations/${id}`))
    } catch (e) {
      handleError(e)
    }
  }, [id, handleError])

  useEffect(() => {
    load()
  }, [load])

  const act = async (body: Record<string, unknown>, success: string) => {
    setBusy(true)
    try {
      const res = await api<any>(`/api/saas-admin/organizations/${id}`, { body })
      toast.success(success)
      setModal(null)
      if (res?.deleted) return router.push('/saas-admin/organizations')
      await load()
    } catch (e) {
      handleError(e)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <PageLoader label="Loading organization…" />
  const o = data.organization
  const sub = o.subscription
  const suspended = o.status === 'SUSPENDED'
  const plan = getPlan(sub?.plan ?? 'free')
  const st = suspended ? 'SUSPENDED' : sub?.status ?? 'ACTIVE'

  const suspend = async () => {
    const ok = await dialog.confirm({
      title: `Suspend ${o.name}?`,
      message: 'Members keep read access to their data but cannot make changes until the workspace is reactivated.',
      confirmLabel: 'Suspend workspace',
      variant: 'danger',
    })
    if (ok) act({ action: 'suspend' }, 'Workspace suspended.')
  }

  return (
    <div>
      <PageHeader title={o.name} description={`${o.slug} · created ${formatDate(o.createdAt)}`}>
        <Link href="/saas-admin/organizations" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        {suspended ? (
          <button onClick={() => act({ action: 'activate' }, 'Workspace reactivated.')} disabled={busy} className="btn-secondary text-emerald-700">
            <PlayCircle className="w-4 h-4" /> Activate
          </button>
        ) : (
          <button onClick={suspend} disabled={busy} className="btn-secondary text-amber-700">
            <Ban className="w-4 h-4" /> Suspend
          </button>
        )}
        <button onClick={() => setModal('plan')} className="btn-secondary">
          <Layers className="w-4 h-4" /> Change plan
        </button>
        {(sub?.status === 'TRIALING' || sub?.status === 'EXPIRED') && (
          <button onClick={() => setModal('trial')} className="btn-secondary">
            <CalendarPlus className="w-4 h-4" /> Extend trial
          </button>
        )}
        <button onClick={() => setModal('delete')} className="btn-danger" title="Delete organization">
          <Trash2 className="w-4 h-4" />
        </button>
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-7xl">
        {suspended && <Alert>Suspended {o.suspendedAt ? formatDate(o.suspendedAt) : ''}{o.suspendedReason ? ` — ${o.suspendedReason}` : ''}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="card p-6">
            <h2 className="section-title mb-4">Subscription</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ['Plan', plan.name],
                ['Status', <span key="s" className={cn('badge', SUB_TONE[st])}>{st.replace('_', ' ').toLowerCase()}</span>],
                ['Billing', sub?.provider === 'STRIPE' ? 'Stripe (card)' : sub?.provider === 'MANUAL' ? 'Manual / bank transfer' : '—'],
                ['Interval', sub?.interval === 'YEAR' ? 'Yearly' : 'Monthly'],
                ['Trial ends', sub?.trialEnd ? formatDate(sub.trialEnd) : '—'],
                ['Period ends', sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '—'],
                ['Cancel at period end', sub?.cancelAtPeriodEnd ? 'Yes' : 'No'],
                ['Stripe customer', sub?.providerCustomerId ?? '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900 text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-6 lg:col-span-2">
            <h2 className="section-title mb-4">Usage against {plan.name} limits</h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <UsageMeter label="Invoices this month" used={data.usage.invoices} limit={limitFor(plan, 'invoices')} />
              <UsageMeter label="Quotations this month" used={data.usage.quotations} limit={limitFor(plan, 'quotations')} />
              <UsageMeter label="Customers" used={data.usage.customers} limit={limitFor(plan, 'customers')} />
              <UsageMeter label="Team members (incl. invites)" used={data.usage.users} limit={limitFor(plan, 'users')} />
              <UsageMeter label="Storage (MB)" used={data.usage.storage} limit={limitFor(plan, 'storage')} />
            </div>
            <p className="text-xs text-slate-400 mt-4">
              All time: {o._count.invoices} invoices · {o._count.quotations} quotations · {o._count.customers} customers · {o._count.payments} payments
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card overflow-hidden">
            <div className="card-header">
              <h2 className="section-title">Members ({o.memberships.length})</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {o.memberships.map((m: any) => (
                <li key={m.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                  </div>
                  <span className="badge bg-slate-50 text-slate-600 border-slate-200">{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS].label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="card-header">
              <h2 className="section-title">Billing payments</h2>
            </div>
            {data.billingPayments.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">No billing payments.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.billingPayments.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 truncate">{p.description ?? PLANS[p.plan as PlanId]?.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {p.providerRef} · {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount, p.currency)}</span>
                    {p.status === 'PENDING' && p.provider === 'MANUAL' ? (
                      <button
                        onClick={async () => {
                          const ok = await dialog.confirm({
                            title: 'Confirm bank transfer?',
                            message: `Mark ${formatCurrency(p.amount, p.currency)} (${p.providerRef}) as received and activate ${PLANS[p.plan as PlanId]?.name}.`,
                            confirmLabel: 'Confirm & activate',
                          })
                          if (ok) act({ action: 'confirm_payment', paymentId: p.id }, 'Payment confirmed and plan activated.')
                        }}
                        className="btn-primary btn-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                      </button>
                    ) : (
                      <span className="badge bg-slate-50 text-slate-600 border-slate-200">{p.status.toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="section-title">Recent activity</h2>
          </div>
          <AuditTable rows={data.activity} />
        </section>
      </div>

      {modal === 'plan' && <PlanModal busy={busy} current={(sub?.plan as PlanId) ?? 'free'} onClose={() => setModal(null)} onSubmit={(b) => act({ action: 'change_plan', ...b }, 'Plan updated.')} />}
      {modal === 'trial' && <TrialModal busy={busy} onClose={() => setModal(null)} onSubmit={(days) => act({ action: 'extend_trial', days }, `Trial extended by ${days} days.`)} />}
      {modal === 'delete' && <DeleteModal busy={busy} name={o.name} onClose={() => setModal(null)} onSubmit={(confirm) => act({ action: 'delete', confirm }, 'Organization deleted.')} />}
    </div>
  )
}

function PlanModal({ current, busy, onClose, onSubmit }: { current: PlanId; busy: boolean; onClose: () => void; onSubmit: (b: { plan: PlanId; interval: 'MONTH' | 'YEAR'; months?: number }) => void }) {
  const [plan, setPlan] = useState<PlanId>(current)
  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>('MONTH')
  const [months, setMonths] = useState<number | ''>('')
  return (
    <Modal title="Change plan" description="Grant a plan manually (no card charge)" icon={Layers} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ plan, interval, ...(months ? { months: Number(months) } : {}) }) }} className="px-6 pb-6 space-y-4">
        <div>
          <label className="label" htmlFor="m-plan">Plan</label>
          <select id="m-plan" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)} className="input">
            {PLAN_ORDER.map((p) => (
              <option key={p} value={p}>{PLANS[p].name}</option>
            ))}
          </select>
        </div>
        {plan !== 'free' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="m-int">Interval</label>
              <select id="m-int" value={interval} onChange={(e) => setInterval(e.target.value as 'MONTH' | 'YEAR')} className="input">
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="m-months">Duration (months)</label>
              <input id="m-months" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : '')} className="input" placeholder="One interval" />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex-1">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Apply</button>
        </div>
      </form>
    </Modal>
  )
}

function TrialModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (days: number) => void }) {
  const [days, setDays] = useState(7)
  return (
    <Modal title="Extend trial" icon={CalendarPlus} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(days) }} className="px-6 pb-6 space-y-4">
        <div>
          <label className="label" htmlFor="m-days">Additional days</label>
          <input id="m-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="input" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex-1">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Extend</button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteModal({ name, busy, onClose, onSubmit }: { name: string; busy: boolean; onClose: () => void; onSubmit: (confirm: string) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal title="Delete organization" description="This permanently deletes all of its data" icon={Trash2} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (text !== name) return setError('The name does not match.')
          onSubmit(text)
        }}
        className="px-6 pb-6 space-y-4"
      >
        <Alert>All customers, invoices, quotations, payments, files and members of this workspace will be deleted. This cannot be undone.</Alert>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="label" htmlFor="m-confirm">
            Type <span className="font-semibold text-slate-900">{name}</span> to confirm
          </label>
          <input id="m-confirm" value={text} onChange={(e) => setText(e.target.value)} className="input" autoComplete="off" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={busy || text !== name} className="btn-danger flex-1">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Delete forever</button>
        </div>
      </form>
    </Modal>
  )
}
