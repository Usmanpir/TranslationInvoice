'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format, startOfYear } from 'date-fns'
import { BarChart3, Lock, Percent, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/ui/DatePicker'
import { ExportButton } from '@/components/ui/ExportButton'
import { PageLoader } from '@/components/ui/States'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api } from '@/lib/api-client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type Tab = 'revenue' | 'outstanding' | 'vat'

interface ReportData {
  defaultCurrency: string
  taxLabel: string
  taxNumber: string | null
  revenue: { month: string; currency: string; total: number; count: number }[]
  aging: { buckets: string[]; byCurrency: Record<string, Record<string, { amount: number; count: number }>> }
  overdue: { id: string; invoiceNumber: string; dueDate: string; total: number; currency: string; customer: { name: string } }[]
  vat: { currency: string; taxRate: number; taxable: number; tax: number; invoices: number }[]
  topCustomers: { id: string; name: string; currency: string; total: number }[]
}

function monthsBetween(from: Date, to: Date) {
  const out: string[] = []
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  while (d <= to && out.length < 36) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

export default function ReportsPage() {
  const { hasFeature } = useWorkspace()
  const { handleError } = useFeedback()
  const [tab, setTab] = useState<Tab>('revenue')
  const [from, setFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const unlocked = hasFeature('advancedReports')

  const load = useCallback(async () => {
    if (!unlocked) return
    setLoading(true)
    try {
      setData(await api<ReportData>(`/api/reports?from=${from}&to=${to}`))
    } catch (e) {
      handleError(e, 'Could not load reports.')
    } finally {
      setLoading(false)
    }
  }, [from, to, unlocked, handleError])

  useEffect(() => {
    load()
  }, [load])

  if (!unlocked) {
    return (
      <div>
        <PageHeader title="Reports" description="Revenue, outstanding balances and VAT" />
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="relative overflow-hidden card max-w-3xl p-8 sm:p-12 text-center">
            <div aria-hidden className="absolute inset-0 bg-grid mask-radial opacity-60" />
            <div className="relative">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-slate-900">Unlock advanced reports</h2>
              <p className="mt-2 text-slate-600 max-w-md mx-auto">
                See revenue trends, aged receivables and a ready-to-file VAT summary for any period. Included in Starter and above.
              </p>
              <div className="mt-6 grid sm:grid-cols-3 gap-3 text-left">
                {[
                  { icon: TrendingUp, t: 'Revenue', d: 'Monthly revenue & top customers' },
                  { icon: Clock, t: 'Outstanding', d: 'Aging: current to 90+ days' },
                  { icon: Percent, t: 'VAT summary', d: 'Taxable amount and output VAT by rate' },
                ].map((x) => (
                  <div key={x.t} className="rounded-xl bg-card ring-1 ring-slate-200 p-4">
                    <x.icon className="w-4 h-4 text-brand-600" />
                    <p className="mt-2 text-sm font-semibold text-slate-900">{x.t}</p>
                    <p className="text-xs text-slate-500">{x.d}</p>
                  </div>
                ))}
              </div>
              <Link href="/billing#plans" className="btn-primary mt-8">
                <Sparkles className="w-4 h-4" /> View plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cur = data?.defaultCurrency ?? 'AED'
  const months = monthsBetween(new Date(from), new Date(to))
  const series = months.map((m) => ({
    month: m,
    total: data?.revenue.filter((r) => r.currency === cur && format(new Date(r.month), 'yyyy-MM') === m).reduce((s, r) => s + r.total, 0) ?? 0,
  }))
  const totalRevenue = series.reduce((s, x) => s + x.total, 0)

  return (
    <div>
      <PageHeader title="Reports" description="Revenue, outstanding balances and VAT">
        <ExportButton type="revenue" label="Export revenue" />
      </PageHeader>
      <div className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 w-fit" role="tablist">
            {(
              [
                { id: 'revenue', label: 'Revenue', icon: TrendingUp },
                { id: 'outstanding', label: 'Outstanding', icon: Clock },
                { id: 'vat', label: `${data?.taxLabel ?? 'VAT'} summary`, icon: Percent },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 h-9 text-sm font-medium rounded-lg transition-all',
                  tab === t.id ? 'bg-card text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
          {tab !== 'outstanding' && (
            <div className="flex items-center gap-2 lg:ml-auto">
              <div className="w-40">
                <DatePicker value={from} onChange={setFrom} max={to} ariaLabel="From" />
              </div>
              <span className="text-slate-400">–</span>
              <div className="w-40">
                <DatePicker value={to} onChange={setTo} min={from} ariaLabel="To" />
              </div>
            </div>
          )}
        </div>

        {!data ? (
          <PageLoader label="Building reports…" />
        ) : (
          <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
            {tab === 'revenue' && (
              <>
                <section className="card p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="section-title">Revenue received</h2>
                      <p className="section-desc">
                        {formatDate(from)} – {formatDate(to)} · {cur}
                      </p>
                    </div>
                    <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(totalRevenue, cur)}</p>
                  </div>
                  <RevenueChart data={series} currency={cur} />
                </section>
                <section className="card overflow-hidden">
                  <div className="card-header">
                    <h2 className="section-title">Top customers</h2>
                  </div>
                  {data.topCustomers.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-500">No payments in this period.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.topCustomers.map((c, i) => {
                        const max = data.topCustomers[0].total || 1
                        return (
                          <li key={`${c.id}-${c.currency}`} className="px-5 sm:px-6 py-3.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <Link href={`/customers/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                                <span className="text-slate-400 tabular-nums mr-2">{i + 1}.</span>
                                {c.name}
                              </Link>
                              <span className="font-semibold tabular-nums">{formatCurrency(c.total, c.currency)}</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-chart" style={{ width: `${(c.total / max) * 100}%` }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}

            {tab === 'outstanding' && (
              <>
                {Object.keys(data.aging.byCurrency).length === 0 ? (
                  <div className="card px-6 py-12 text-center text-sm text-slate-500">Nothing outstanding — every invoice is paid.</div>
                ) : (
                  Object.entries(data.aging.byCurrency).map(([currency, buckets]) => {
                    const total = Object.values(buckets).reduce((s, b) => s + b.amount, 0)
                    const max = Math.max(...Object.values(buckets).map((b) => b.amount), 1)
                    return (
                      <section key={currency} className="card p-5 sm:p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <h2 className="section-title">Aged receivables</h2>
                            <p className="section-desc">Unpaid invoices by days past due · {currency}</p>
                          </div>
                          <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(total, currency)}</p>
                        </div>
                        <div className="space-y-3">
                          {data.aging.buckets.map((b, i) => (
                            <div key={b} className="grid grid-cols-[110px_1fr_140px] items-center gap-3 text-sm">
                              <span className="text-slate-600">{b}</span>
                              <div className="h-6 rounded-md bg-slate-50 overflow-hidden">
                                <div
                                  className="h-full rounded-r-[4px]"
                                  style={{ width: `${(buckets[b].amount / max) * 100}%`, backgroundColor: i === 0 ? 'rgb(var(--c-chart-1))' : i < 3 ? '#d97706' : '#dc2626' }}
                                />
                              </div>
                              <span className="text-right tabular-nums">
                                <span className="font-semibold text-slate-900">{formatCurrency(buckets[b].amount, currency)}</span>
                                <span className="text-xs text-slate-400 ml-1.5">({buckets[b].count})</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })
                )}
                {data.overdue.length > 0 && (
                  <section className="card overflow-hidden">
                    <div className="card-header">
                      <h2 className="section-title">Most overdue</h2>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {data.overdue.map((inv) => (
                        <li key={inv.id}>
                          <Link href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-slate-50/80">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold font-mono text-slate-900">{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-500">
                                {inv.customer.name} · Due {formatDate(inv.dueDate)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-red-700">{formatCurrency(inv.total, inv.currency)}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            {tab === 'vat' && (
              <section className="card overflow-hidden">
                <div className="card-header">
                  <div>
                    <h2 className="section-title">{data.taxLabel} summary (output tax)</h2>
                    <p className="section-desc">
                      Invoices issued {formatDate(from)} – {formatDate(to)}, excluding cancelled
                      {data.taxNumber ? ` · TRN ${data.taxNumber}` : ''}
                    </p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-slate-300" />
                </div>
                {data.vat.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-slate-500">No invoices issued in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th className="text-left">Currency</th>
                          <th className="text-right">Rate</th>
                          <th className="text-right">Invoices</th>
                          <th className="text-right">Taxable amount</th>
                          <th className="text-right">{data.taxLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.vat.map((v) => (
                          <tr key={`${v.currency}-${v.taxRate}`}>
                            <td className="text-sm font-medium">{v.currency}</td>
                            <td className="text-right text-sm tabular-nums">{v.taxRate}%</td>
                            <td className="text-right text-sm tabular-nums">{v.invoices}</td>
                            <td className="text-right text-sm tabular-nums">{formatCurrency(v.taxable, v.currency)}</td>
                            <td className="text-right text-sm font-semibold tabular-nums">{formatCurrency(v.tax, v.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="px-6 py-4 text-xs text-slate-400 border-t border-slate-100">
                  This summary helps you prepare your return. Confirm figures with your accountant before filing with the Federal Tax Authority.
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
