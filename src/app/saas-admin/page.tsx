'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Building2, Clock, CreditCard, FileQuestion, Receipt, TrendingUp, Users, AlertTriangle, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/States'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api } from '@/lib/api-client'
import { BILLING_CURRENCY, PLANS, type PlanId } from '@/lib/plans'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

export default function SaasOverviewPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api('/api/saas-admin/overview').then(setData).catch((e) => handleError(e))
  }, [handleError])

  if (!data) return <PageLoader label="Loading platform metrics…" />
  const t = data.totals

  const tiles = [
    { label: 'Monthly recurring revenue', value: formatCurrency(t.mrr, BILLING_CURRENCY), sub: `ARR ${formatCurrency(t.arr, BILLING_CURRENCY)}`, icon: TrendingUp, g: 'from-emerald-400 to-emerald-600' },
    { label: 'Organizations', value: t.organizations, sub: `${t.activeOrganizations} active · ${t.newOrganizations} new (30d)`, icon: Building2, g: 'from-brand-400 to-brand-600' },
    { label: 'Paying subscriptions', value: t.activeSubscriptions, sub: `${t.trialing} trialing`, icon: CreditCard, g: 'from-violet-400 to-purple-600' },
    { label: 'Expired trials', value: t.expiredTrials, sub: 'Upgrade opportunities', icon: AlertTriangle, g: 'from-amber-400 to-orange-500' },
    { label: 'Users', value: t.users, sub: 'Across all workspaces', icon: Users, g: 'from-sky-400 to-indigo-600' },
    { label: 'Invoices', value: t.invoices, sub: 'All time', icon: Receipt, g: 'from-slate-500 to-slate-700' },
    { label: 'Quotations', value: t.quotations, sub: 'All time', icon: FileQuestion, g: 'from-slate-500 to-slate-700' },
    { label: 'Trialing', value: t.trialing, sub: 'Active trials', icon: Clock, g: 'from-brand-400 to-indigo-600' },
  ]

  return (
    <div>
      <PageHeader title="Platform overview" description="Health of the InvoiceFlow business" />
      <div className="p-4 sm:p-6 lg:p-10 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiles.map((x) => (
            <div key={x.label} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-500">{x.label}</p>
                  <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums truncate">{x.value}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{x.sub}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', x.g)}>
                  <x.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="card overflow-hidden xl:col-span-2">
            <div className="card-header">
              <div>
                <h2 className="section-title">Newest organizations</h2>
                <p className="section-desc">Latest signups</p>
              </div>
              <Link href="/saas-admin/organizations" className="btn-ghost text-brand-600 text-xs">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.recent.map((o: any) => (
                <li key={o.id}>
                  <Link href={`/saas-admin/organizations/${o.id}`} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-slate-50/80">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{o.name[0]?.toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{o.name}</p>
                      <p className="text-xs text-slate-500">Joined {formatDate(o.createdAt)}</p>
                    </div>
                    <span className="badge bg-slate-50 text-slate-600 border-slate-200">{PLANS[o.subscription?.plan as PlanId]?.name ?? o.subscription?.plan ?? '—'}</span>
                    <span className={cn('badge', o.status === 'SUSPENDED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                      {o.status === 'SUSPENDED' ? 'Suspended' : (o.subscription?.status ?? 'ACTIVE').toLowerCase()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Paying customers by plan</h2>
              <Sparkles className="w-4 h-4 text-slate-300" />
            </div>
            {Object.keys(data.byPlan).length === 0 ? (
              <p className="text-sm text-slate-500">No paying subscriptions yet.</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(data.byPlan).map(([plan, count]: any) => {
                  const max = Math.max(...(Object.values(data.byPlan) as number[]))
                  return (
                    <li key={plan}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{PLANS[plan as PlanId]?.name ?? plan}</span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-chart" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Signups per month
              </p>
              <ul className="space-y-1 text-sm">
                {data.signups.length === 0 ? (
                  <li className="text-slate-500">No signups in the last 12 months.</li>
                ) : (
                  data.signups.map((s: any) => (
                    <li key={s.month} className="flex justify-between">
                      <span className="text-slate-600">{new Date(s.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
                      <span className="font-semibold tabular-nums">{s.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
