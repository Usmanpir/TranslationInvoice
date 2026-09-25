'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarRange,
  Clock,
  FileQuestion,
  Loader2,
  Plus,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { endOfWeek, format, startOfMonth, startOfWeek, startOfYear, subMonths, endOfMonth } from 'date-fns'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/ui/DatePicker'
import { EmptyState } from '@/components/ui/States'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

interface DashboardData {
  currency: string
  stats: {
    totalInvoices: number
    paidInvoices: number
    pendingInvoices: number
    overdueInvoices: number
    totalRevenue: number
    pendingRevenue: number
    overdueRevenue: number
    outstanding: number
    customers: number
    quotations: number
    conversionRate: number
  }
  otherCurrencies: { currency: string; paid: number; outstanding: number }[]
  monthlyRevenue: { month: string; total: number }[]
  recentInvoices: any[]
  recentPayments: any[]
  upcoming: any[]
}

type Preset = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  switch (p) {
    case 'today':
      return { from: ymd(now), to: ymd(now) }
    case 'week':
      return { from: ymd(startOfWeek(now, { weekStartsOn: 1 })), to: ymd(endOfWeek(now, { weekStartsOn: 1 })) }
    case 'month':
      return { from: ymd(startOfMonth(now)), to: ymd(now) }
    case 'lastMonth': {
      const last = subMonths(now, 1)
      return { from: ymd(startOfMonth(last)), to: ymd(endOfMonth(last)) }
    }
    case 'year':
      return { from: ymd(startOfYear(now)), to: ymd(now) }
    default:
      return { from: '', to: '' }
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex justify-between">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-10 w-10 rounded-xl" />
            </div>
            <div className="skeleton h-7 w-32" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card p-6 xl:col-span-2">
          <div className="skeleton h-4 w-40 mb-6" />
          <div className="skeleton h-52 rounded-xl" />
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, organization, can } = useWorkspace()
  const { handleError } = useFeedback()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<Preset>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(
    async (f: string, t: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (f) params.set('from', f)
        if (t) params.set('to', t)
        const qs = params.toString()
        setData(await api<DashboardData>(`/api/dashboard${qs ? `?${qs}` : ''}`))
      } catch (e) {
        handleError(e, 'Could not load the dashboard.')
      } finally {
        setLoading(false)
      }
    },
    [handleError]
  )

  useEffect(() => {
    load('', '')
  }, [load])

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p === 'custom') return
    const r = presetRange(p)
    setFrom(r.from)
    setTo(r.to)
    load(r.from, r.to)
  }

  const applyCustom = () => {
    if (from && to && new Date(from) > new Date(to)) return
    load(from, to)
  }

  const firstName = user.name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const cur = data?.currency ?? organization.defaultCurrency
  const s = data?.stats

  const statCards = s
    ? [
        {
          label: 'Revenue collected',
          value: formatCurrency(s.totalRevenue, cur),
          icon: TrendingUp,
          gradient: 'from-emerald-400 to-emerald-600',
          sub: `${s.paidInvoices} paid invoice${s.paidInvoices === 1 ? '' : 's'}`,
        },
        {
          label: 'Outstanding',
          value: formatCurrency(s.outstanding, cur),
          icon: Clock,
          gradient: 'from-amber-400 to-orange-500',
          sub: `${s.pendingInvoices} pending · ${s.overdueInvoices} overdue`,
        },
        {
          label: 'Overdue',
          value: formatCurrency(s.overdueRevenue, cur),
          icon: AlertCircle,
          gradient: 'from-rose-400 to-red-600',
          sub: s.overdueInvoices ? `${s.overdueInvoices} need attention` : 'Nothing overdue',
        },
        {
          label: 'Quotations',
          value: String(s.quotations),
          icon: FileQuestion,
          gradient: 'from-violet-400 to-purple-600',
          sub: `${s.conversionRate}% converted to invoices`,
        },
      ]
    : []

  return (
    <div>
      <PageHeader title="Dashboard" description={`${greeting}${firstName ? `, ${firstName}` : ''} — here's how ${organization.name} is doing.`}>
        {can('invoice.create') && (
          <Link href="/invoices/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8">
        {/* Filters: one row above everything they affect */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 overflow-x-auto" role="tablist" aria-label="Date range">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={preset === p.id}
                onClick={() => choosePreset(p.id)}
                className={cn(
                  'px-3 h-8 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  preset === p.id ? 'bg-white text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 animate-fade-in">
              <div className="w-40">
                <DatePicker value={from} onChange={setFrom} max={to || undefined} placeholder="From" clearable ariaLabel="From date" />
              </div>
              <span className="text-slate-400 text-sm">–</span>
              <div className="w-40">
                <DatePicker value={to} onChange={setTo} min={from || undefined} placeholder="To" clearable ariaLabel="To date" />
              </div>
              <button onClick={applyCustom} disabled={loading || (!from && !to)} className="btn-primary btn-sm h-10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
                Apply
              </button>
            </div>
          )}
          {(from || to) && preset !== 'all' && (
            <span className="xl:ml-auto text-xs text-slate-500">
              {from ? formatDate(from) : 'Earliest'} – {to ? formatDate(to) : 'Today'}
            </span>
          )}
        </div>

        {!data ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI tiles */}
            <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 transition-opacity', loading && 'opacity-60')}>
              {statCards.map((stat, i) => (
                <div key={stat.label} className="card-interactive relative overflow-hidden p-5 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-2 font-display text-2xl xl:text-[1.3rem] 2xl:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={stat.value}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5">{stat.sub}</p>
                    </div>
                    <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/20', stat.gradient)}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {data.otherCurrencies.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {data.otherCurrencies.map((c) => (
                  <span key={c.currency} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{c.currency}</span>
                    Paid {formatCurrency(c.paid, c.currency)} · Outstanding {formatCurrency(c.outstanding, c.currency)}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Revenue chart */}
              <section className="card p-5 sm:p-6 xl:col-span-2">
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div>
                    <h2 className="section-title">Monthly revenue</h2>
                    <p className="section-desc">Payments received in {cur}, last 12 months</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Customers</p>
                    <p className="font-display text-lg font-bold text-slate-900 tabular-nums flex items-center gap-1.5 justify-end">
                      <Users className="w-4 h-4 text-slate-400" />
                      {s!.customers}
                    </p>
                  </div>
                </div>
                <RevenueChart data={data.monthlyRevenue} currency={cur} />
              </section>

              {/* Upcoming due */}
              <section className="card overflow-hidden">
                <div className="card-header">
                  <div>
                    <h2 className="section-title">Upcoming due dates</h2>
                    <p className="section-desc">Unpaid invoices, soonest first</p>
                  </div>
                  <CalendarClock className="w-5 h-5 text-slate-300" />
                </div>
                {data.upcoming.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-slate-500">No unpaid invoices — you're all caught up.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.upcoming.map((inv) => {
                      const overdue = inv.status === 'OVERDUE'
                      return (
                        <li key={inv.id}>
                          <Link href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                            <div className={cn('w-10 text-center rounded-lg py-1', overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700')}>
                              <p className="text-[10px] font-semibold uppercase">{format(new Date(inv.dueDate), 'MMM')}</p>
                              <p className="text-sm font-bold leading-none">{format(new Date(inv.dueDate), 'dd')}</p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold font-mono text-slate-900 truncate">{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-500 truncate">{inv.customer?.name}</p>
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(inv.total, inv.currency)}</p>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Recent invoices */}
              <div className="xl:col-span-2">
                {data.recentInvoices.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No invoices yet"
                    description="Create your first invoice and it will show up here."
                    action={
                      can('invoice.create') && (
                        <Link href="/invoices/new" className="btn-primary">
                          <Plus className="w-4 h-4" />
                          Create your first invoice
                        </Link>
                      )
                    }
                  />
                ) : (
                  <section className="card overflow-hidden">
                    <div className="card-header">
                      <div>
                        <h2 className="section-title">Recent invoices</h2>
                        <p className="section-desc">Your latest billing activity</p>
                      </div>
                      <Link href="/invoices" className="btn-ghost text-brand-600 hover:text-brand-700 hover:bg-brand-50 group">
                        View all <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {data.recentInvoices.map((invoice) => (
                        <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/80 transition-colors group">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                            <Receipt className="w-4 h-4 text-slate-500 group-hover:text-brand-600 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900 font-mono tracking-tight">{invoice.invoiceNumber}</p>
                              <StatusBadge status={invoice.status} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {invoice.customer?.name} · Due {formatDate(invoice.dueDate)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(invoice.total, invoice.currency)}</p>
                          <ArrowUpRight className="hidden sm:block w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Recent payments */}
              <section className="card overflow-hidden">
                <div className="card-header">
                  <div>
                    <h2 className="section-title">Recent payments</h2>
                    <p className="section-desc">Latest money received</p>
                  </div>
                  {can('payment.view') && (
                    <Link href="/payments" className="btn-ghost text-brand-600 hover:bg-brand-50 text-xs">
                      All <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                {data.recentPayments.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Wallet className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.recentPayments.map((p) => (
                      <li key={p.id}>
                        <Link href={`/invoices/${p.invoice.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{p.invoice.customer?.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {p.invoice.invoiceNumber} · {formatDate(p.paidAt)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-emerald-700">+{formatCurrency(p.amount, p.currency)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
