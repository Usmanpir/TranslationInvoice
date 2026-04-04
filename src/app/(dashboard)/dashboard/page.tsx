'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Receipt, CheckCircle, Clock, AlertCircle, Users, Plus, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/ui/PageHeader'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      sub: `${stats?.paidInvoices || 0} paid invoices`,
    },
    {
      label: 'Total Invoices',
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      sub: `${stats?.customers || 0} customers`,
    },
    {
      label: 'Pending',
      value: formatCurrency(stats?.pendingRevenue || 0),
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      sub: `${stats?.pendingInvoices || 0} pending invoices`,
    },
    {
      label: 'Overdue',
      value: stats?.overdueInvoices || 0,
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      sub: 'Require attention',
    },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" description="Your business overview at a glance">
        <Link href="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </PageHeader>

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {statCards.map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Invoices */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Invoices</h2>
            <Link href="/invoices" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data?.recentInvoices?.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">No invoices yet</p>
              <Link href="/invoices/new" className="btn-primary">
                <Plus className="w-4 h-4" />
                Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data?.recentInvoices?.map((invoice: any) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                    <Receipt className="w-4 h-4 text-slate-500 group-hover:text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{invoice.invoiceNumber}</p>
                      <StatusBadge status={invoice.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{invoice.customer?.name} · Due {formatDate(invoice.dueDate)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.total)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'New Invoice', desc: 'Create and send invoices', href: '/invoices/new', icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'New Quotation', desc: 'Send a price estimate', href: '/quotations/new', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Add Customer', desc: 'Manage your clients', href: '/customers/new', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="card p-5 flex items-center gap-4 hover:shadow-card-hover transition-shadow group"
            >
              <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center flex-shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
