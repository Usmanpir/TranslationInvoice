'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Building2, Edit2, FileQuestion, Mail, MapPin, Phone, Plus, Receipt, Users, Wallet, Hash } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState, PageLoader } from '@/components/ui/States'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { api, errorMessage } from '@/lib/api-client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

type Tab = 'invoices' | 'quotations' | 'payments'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can, organization } = useWorkspace()
  const [c, setC] = useState<any>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('invoices')

  useEffect(() => {
    api(`/api/customers/${id}`)
      .then(setC)
      .catch((e) => setError(errorMessage(e, 'Could not load this customer.')))
  }, [id])

  if (error)
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={Users}
          title="Customer not found"
          description={error}
          action={
            <Link href="/customers" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back to customers
            </Link>
          }
        />
      </div>
    )
  if (!c) return <PageLoader label="Loading customer…" />

  const currencies = Object.keys(c.stats.byCurrency)
  const primary = currencies.includes(organization.defaultCurrency) ? organization.defaultCurrency : currencies[0] ?? organization.defaultCurrency
  const totals = c.stats.byCurrency[primary] ?? { paid: 0, pending: 0, overdue: 0 }

  return (
    <div>
      <PageHeader title={c.name} description={c.company ?? c.email}>
        <Link href="/customers" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        {can('customer.manage') && (
          <Link href={`/customers/${c.id}/edit`} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        )}
        {can('quotation.create') && (
          <Link href={`/quotations/new?customerId=${c.id}`} className="btn-secondary">
            <FileQuestion className="w-4 h-4" /> <span className="hidden sm:inline">New quotation</span>
          </Link>
        )}
        {can('invoice.create') && (
          <Link href={`/invoices/new?customerId=${c.id}`} className="btn-primary">
            <Plus className="w-4 h-4" /> New invoice
          </Link>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-6xl animate-fade-up">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <section className="card p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white font-display text-lg font-bold">
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-slate-900 truncate">{c.name}</p>
                <p className="text-xs text-slate-500">Customer since {formatDate(c.createdAt)}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3.5 text-sm">
              {c.company && (
                <div className="flex gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <dd className="text-slate-700">{c.company}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <a href={`mailto:${c.email}`} className="text-brand-700 hover:underline break-all">
                  {c.email}
                </a>
              </div>
              {c.phone && (
                <div className="flex gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${c.phone}`} className="text-slate-700">
                    {c.phone}
                  </a>
                </div>
              )}
              {c.taxNumber && (
                <div className="flex gap-3">
                  <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <dd className="text-slate-700">
                    TRN <span className="font-mono">{c.taxNumber}</span>
                  </dd>
                </div>
              )}
              {c.address && (
                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <dd className="text-slate-700 whitespace-pre-line">{c.address}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Totals */}
          <section className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 content-start">
            {[
              { label: 'Invoices', value: String(c.stats.totalInvoices), tone: 'text-slate-900' },
              { label: 'Paid', value: formatCurrency(totals.paid, primary), tone: 'text-emerald-700' },
              { label: 'Pending', value: formatCurrency(totals.pending, primary), tone: 'text-amber-700' },
              { label: 'Overdue', value: formatCurrency(totals.overdue, primary), tone: 'text-red-700' },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs font-medium text-slate-500">{s.label}</p>
                <p className={cn('mt-1.5 font-display text-lg font-bold tabular-nums truncate', s.tone)} title={s.value}>
                  {s.value}
                </p>
              </div>
            ))}
            {currencies.filter((cur) => cur !== primary).map((cur) => (
              <div key={cur} className="col-span-2 sm:col-span-4 text-xs text-slate-500 px-1">
                {cur}: paid {formatCurrency(c.stats.byCurrency[cur].paid, cur)} · pending {formatCurrency(c.stats.byCurrency[cur].pending, cur)} · overdue{' '}
                {formatCurrency(c.stats.byCurrency[cur].overdue, cur)}
              </div>
            ))}
          </section>
        </div>

        {/* History */}
        <section className="card overflow-hidden">
          <div className="px-5 sm:px-6 pt-4 border-b border-slate-100 flex gap-1 overflow-x-auto" role="tablist">
            {(
              [
                { id: 'invoices', label: `Invoices (${c.invoices.length})`, icon: Receipt },
                { id: 'quotations', label: `Quotations (${c.quotations.length})`, icon: FileQuestion },
                { id: 'payments', label: `Payments (${c.payments.length})`, icon: Wallet },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  tab === t.id ? 'border-brand-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'invoices' &&
            (c.invoices.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">No invoices for this customer yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {c.invoices.map((inv: any) => (
                  <li key={inv.id}>
                    <Link href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-slate-50/80">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold font-mono text-slate-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">
                          Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                        </p>
                      </div>
                      <StatusBadge status={inv.status} />
                      <p className="w-32 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(inv.total, inv.currency)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'quotations' &&
            (c.quotations.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">No quotations for this customer yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {c.quotations.map((q: any) => (
                  <li key={q.id}>
                    <Link href={`/quotations/${q.id}`} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-slate-50/80">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold font-mono text-slate-900">{q.quotationNumber}</p>
                        <p className="text-xs text-slate-500">
                          Valid until {formatDate(q.validUntil)}
                          {q.invoice ? ` · Converted to ${q.invoice.invoiceNumber}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                      <p className="w-32 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(q.total, q.currency)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'payments' &&
            (c.payments.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">No payments recorded for this customer yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {c.payments.map((p: any) => (
                  <li key={p.id}>
                    <Link href={`/invoices/${p.invoice.id}`} className="flex items-center gap-4 px-5 sm:px-6 py-3.5 hover:bg-slate-50/80">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{p.invoice.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(p.paidAt)}
                          {p.reference ? ` · Ref ${p.reference}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-emerald-700">+{formatCurrency(p.amount, p.currency)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      </div>
    </div>
  )
}
