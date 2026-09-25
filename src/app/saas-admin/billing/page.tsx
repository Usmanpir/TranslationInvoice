'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Landmark } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/States'
import { useDialog } from '@/components/ui/Dialog'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api } from '@/lib/api-client'
import { PLANS, type PlanId } from '@/lib/plans'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

const PAY_TONE: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function SaasBillingPage() {
  const dialog = useDialog()
  const { handleError, toast } = useFeedback()
  const [data, setData] = useState<any>(null)

  const load = useCallback(async () => {
    try {
      setData(await api('/api/saas-admin/billing'))
    } catch (e) {
      handleError(e)
    }
  }, [handleError])

  useEffect(() => {
    load()
  }, [load])

  const confirm = async (p: any) => {
    const ok = await dialog.confirm({
      title: 'Confirm bank transfer?',
      message: `${p.organization.name}: ${formatCurrency(p.amount, p.currency)} (${p.providerRef}). This activates ${PLANS[p.plan as PlanId]?.name}.`,
      confirmLabel: 'Confirm & activate',
    })
    if (!ok) return
    try {
      await api(`/api/saas-admin/organizations/${p.organization.id}`, { body: { action: 'confirm_payment', paymentId: p.id } })
      toast.success('Payment confirmed and plan activated.')
      load()
    } catch (e) {
      handleError(e)
    }
  }

  if (!data) return <PageLoader label="Loading billing…" />

  return (
    <div>
      <PageHeader title="Billing" description="Bank transfers awaiting confirmation, payments and provider events" />
      <div className="p-4 sm:p-6 lg:p-10 space-y-6">
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Pending bank transfers ({data.pending.length})</h2>
              <p className="section-desc">Confirm once the money has arrived</p>
            </div>
            <Landmark className="w-5 h-5 text-slate-300" />
          </div>
          {data.pending.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">Nothing waiting.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.pending.map((p: any) => (
                <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/saas-admin/organizations/${p.organization.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600">
                      {p.organization.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{p.providerRef}</span> · {PLANS[p.plan as PlanId]?.name} {p.interval === 'YEAR' ? 'yearly' : 'monthly'} · requested {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount, p.currency)}</span>
                  <button onClick={() => confirm(p)} className="btn-primary btn-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="section-title">Recent payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Organization</th>
                  <th className="text-left hidden md:table-cell">Plan</th>
                  <th className="text-left hidden md:table-cell">Provider</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="text-sm text-slate-600 whitespace-nowrap">{formatDate(p.paidAt ?? p.createdAt)}</td>
                    <td className="text-sm">{p.organization.name}</td>
                    <td className="text-sm text-slate-600 hidden md:table-cell">{PLANS[p.plan as PlanId]?.name ?? p.plan}</td>
                    <td className="text-sm text-slate-600 hidden md:table-cell">{p.provider.toLowerCase()}</td>
                    <td>
                      <span className={cn('badge', PAY_TONE[p.status])}>{p.status.toLowerCase()}</span>
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums">{formatCurrency(p.amount, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Provider events</h2>
              <p className="section-desc">Webhooks received (deduplicated by event id)</p>
            </div>
          </div>
          {data.events.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">No webhook events received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Received</th>
                    <th className="text-left">Type</th>
                    <th className="text-left hidden md:table-cell">Organization</th>
                    <th className="text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((e: any) => (
                    <tr key={e.id}>
                      <td className="text-sm text-slate-600 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="text-sm font-mono">{e.type}</td>
                      <td className="text-sm hidden md:table-cell">{e.organization?.name ?? '—'}</td>
                      <td className="text-sm">
                        {e.error ? <span className="text-red-600">{e.error}</span> : e.processedAt ? <span className="text-emerald-700">processed</span> : <span className="text-slate-400">pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
