'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { TrendingUp, Receipt, FileQuestion, Clock, AlertCircle, Users, Plus, ArrowRight, ArrowUpRight, RotateCcw, CalendarRange, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/ui/PageHeader'
import { DatePicker } from '@/components/ui/DatePicker'
import { EmptyState } from '@/components/ui/States'

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 animate-fade-in" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-40 rounded-3xl" />
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
      <div className="card p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-3 w-56" />
            </div>
            <div className="skeleton h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f) params.set('from', f)
      if (t) params.set('to', t)
      const qs = params.toString()
      const res = await fetch(`/api/dashboard${qs ? `?${qs}` : ''}`)
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('', '')
  }, [load])

  const apply = () => {
    if (from && to && new Date(from) > new Date(to)) return
    setAppliedFrom(from)
    setAppliedTo(to)
    load(from, to)
  }

  const reset = () => {
    setFrom('')
    setTo('')
    setAppliedFrom('')
    setAppliedTo('')
    load('', '')
  }

  const hasFilter = Boolean(appliedFrom || appliedTo)
  const filterDirty = from !== appliedFrom || to !== appliedTo

  const header = (
    <PageHeader title="Dashboard" description="Your business overview at a glance">
      <Link href="/invoices/new" className="btn-primary">
        <Plus className="w-4 h-4" />
        New Invoice
      </Link>
    </PageHeader>
  )

  if (loading && !data) {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  const stats = data?.stats
  const firstName = session?.user?.name?.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: TrendingUp,
      gradient: 'from-emerald-400 to-emerald-600',
      glow: 'bg-emerald-500',
      sub: `${stats?.paidInvoices || 0} paid invoices`,
    },
    {
      label: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      gradient: 'from-brand-400 to-brand-600',
      glow: 'bg-brand-500',
      sub: `${stats?.customers || 0} customers`,
    },
    {
      label: 'Pending',
      value: formatCurrency(stats?.pendingRevenue || 0),
      icon: Clock,
      gradient: 'from-amber-400 to-orange-500',
      glow: 'bg-amber-500',
      sub: `${stats?.pendingInvoices || 0} pending invoices`,
    },
    {
      label: 'Overdue',
      value: stats?.overdueInvoices || 0,
      icon: AlertCircle,
      gradient: 'from-rose-400 to-red-600',
      glow: 'bg-red-500',
      sub: 'Require attention',
    },
  ]

  return (
    <div>
      {header}

      <div className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8">
        {/* Welcome + date range */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-8 animate-fade-up">
          <div aria-hidden className="absolute inset-0">
            <div className="absolute inset-0 bg-grid-dark mask-radial opacity-80" />
            <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.35),transparent)]" />
            <div className="absolute -bottom-40 left-10 w-[380px] h-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.22),transparent)]" />
          </div>
          <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <p className="text-sm text-brand-200/90 font-medium">{greeting}{firstName ? `, ${firstName}` : ''}</p>
              <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(stats?.totalRevenue || 0)}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Revenue collected{' '}
                {hasFilter
                  ? `· ${appliedFrom ? formatDate(appliedFrom) : 'earliest'} – ${appliedTo ? formatDate(appliedTo) : 'today'}`
                  : 'all time'}
              </p>
            </div>

            {/* Date range filter */}
            <div className="flex flex-wrap items-end gap-2.5 p-2.5 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10 backdrop-blur">
              <div className="flex-1 min-w-[150px]">
                <label className="text-[11px] font-medium text-slate-400 block mb-1 px-1">From</label>
                <DatePicker
                  value={from}
                  onChange={setFrom}
                  max={to || undefined}
                  placeholder="Earliest"
                  clearable
                  ariaLabel="From date"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-[11px] font-medium text-slate-400 block mb-1 px-1">To</label>
                <DatePicker
                  value={to}
                  onChange={setTo}
                  min={from || undefined}
                  placeholder="Today"
                  clearable
                  ariaLabel="To date"
                />
              </div>
              <button
                onClick={apply}
                disabled={(!from && !to) || !filterDirty || loading}
                className="btn-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
                Apply
              </button>
              <button
                onClick={reset}
                disabled={!hasFilter && !from && !to}
                className="btn h-10 px-3 text-slate-200 ring-1 ring-inset ring-white/15 hover:bg-white/10 disabled:opacity-40"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="sm:hidden xl:inline">Reset</span>
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 transition-opacity', loading && 'opacity-60')}>
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="group card-interactive relative overflow-hidden p-5 animate-fade-up"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <div aria-hidden className={cn('absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]', stat.glow)} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 font-display text-2xl xl:text-[1.3rem] 2xl:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={String(stat.value)}>{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{stat.sub}</p>
                </div>
                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/20', stat.gradient)}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Recent Invoices */}
          <div className="xl:col-span-2">
            {data?.recentInvoices?.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Create your first invoice and it will show up here."
                action={
                  <Link href="/invoices/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Create your first invoice
                  </Link>
                }
              />
            ) : (
              <div className="card overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
                <div className="card-header">
                  <div>
                    <h2 className="section-title">Recent Invoices</h2>
                    <p className="section-desc">Your latest billing activity</p>
                  </div>
                  <Link href="/invoices" className="btn-ghost text-brand-600 hover:text-brand-700 hover:bg-brand-50 group">
                    View all <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {data?.recentInvoices?.map((invoice: any) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 group-hover:ring-1 group-hover:ring-brand-100 transition-all">
                        <Receipt className="w-4 h-4 text-slate-500 group-hover:text-brand-600 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 font-mono tracking-tight">{invoice.invoiceNumber}</p>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{invoice.customer?.name} · Due {formatDate(invoice.dueDate)}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(invoice.total, invoice.currency || 'AED')}</p>
                      <ArrowUpRight className="hidden sm:block w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: '260ms' }}>
            <div className="px-1">
              <h2 className="section-title">Quick actions</h2>
              <p className="section-desc">Jump straight into common tasks</p>
            </div>
            {[
              { label: 'New Invoice', desc: 'Create and send invoices', href: '/invoices/new', icon: Receipt, gradient: 'from-brand-400 to-brand-600' },
              { label: 'New Quotation', desc: 'Send a price estimate', href: '/quotations/new', icon: FileQuestion, gradient: 'from-violet-400 to-purple-600' },
              { label: 'Add Customer', desc: 'Manage your clients', href: '/customers/new', icon: Users, gradient: 'from-emerald-400 to-teal-600' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="card-interactive p-4 flex items-center gap-4 group"
              >
                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/10 ring-1 ring-inset ring-white/20 transition-transform group-hover:scale-105', action.gradient)}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
                <div className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-brand-600 group-hover:bg-brand-50 transition-all">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
