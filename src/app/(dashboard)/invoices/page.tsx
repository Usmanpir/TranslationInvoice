'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Receipt, Plus, Eye, Edit2, Trash2, SlidersHorizontal, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { ExportButton } from '@/components/ui/ExportButton'
import { DatePicker } from '@/components/ui/DatePicker'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { api, type Paginated } from '@/lib/api-client'
import { useDialog } from '@/components/ui/Dialog'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { useDebounced } from '@/lib/hooks'

const STATUSES = ['', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']

export default function InvoicesPage() {
  const dialog = useDialog()
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const debouncedMin = useDebounced(min)
  const debouncedMax = useDebounced(max)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const query = new URLSearchParams({
    search: debouncedSearch,
    page: String(page),
    limit: '10',
    ...(statusFilter && { status: statusFilter }),
    ...(from && { from }),
    ...(to && { to }),
    ...(debouncedMin && { min: debouncedMin }),
    ...(debouncedMax && { max: debouncedMax }),
  }).toString()

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Paginated<any>>(`/api/invoices?${query}`)
      setInvoices(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (e) {
      handleError(e, 'Could not load invoices.')
    } finally {
      setLoading(false)
    }
  }, [query, handleError])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleDelete = async (id: string, num: string) => {
    const ok = await dialog.confirm({
      title: `Delete invoice ${num}?`,
      message: 'This invoice, its line items and payment records will be permanently removed.',
      confirmLabel: 'Delete invoice',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api(`/api/invoices/${id}`, { method: 'DELETE' })
      toast.success(`Invoice ${num} was deleted.`)
      fetchInvoices()
    } catch (e) {
      handleError(e)
    }
  }

  const advancedCount = [from, to, min, max].filter(Boolean).length
  const clearAdvanced = () => {
    setFrom('')
    setTo('')
    setMin('')
    setMax('')
    setPage(1)
  }
  const filtered = Boolean(search || statusFilter || advancedCount)

  return (
    <div>
      <PageHeader title="Invoices" description={`${total} invoice${total !== 1 ? 's' : ''}${filtered ? ' matching filters' : ' total'}`}>
        <ExportButton type="invoices" query={statusFilter ? `status=${statusFilter}` : ''} />
        {can('invoice.create') && (
          <Link href="/invoices/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10">
        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search number, customer or company..."
            />
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={cn('btn-secondary', (showFilters || advancedCount > 0) && 'ring-2 ring-brand-500/20 border-brand-300')}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {advancedCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-bold">{advancedCount}</span>}
            </button>
            <div
              className="flex gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 overflow-x-auto sm:ml-auto"
              role="tablist"
              aria-label="Filter by status"
            >
              {STATUSES.map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s)
                    setPage(1)
                  }}
                  className={cn(
                    'px-3.5 h-8 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                    statusFilter === s ? 'bg-white text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end animate-fade-in">
              <div>
                <label className="label">Issued from</label>
                <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1) }} max={to || undefined} placeholder="Any date" clearable ariaLabel="Issued from" />
              </div>
              <div>
                <label className="label">Issued to</label>
                <DatePicker value={to} onChange={(v) => { setTo(v); setPage(1) }} min={from || undefined} placeholder="Any date" clearable ariaLabel="Issued to" />
              </div>
              <div>
                <label className="label" htmlFor="min">Min amount</label>
                <input id="min" type="number" min="0" value={min} onChange={(e) => { setMin(e.target.value); setPage(1) }} className="input" placeholder="0" />
              </div>
              <div>
                <label className="label" htmlFor="max">Max amount</label>
                <input id="max" type="number" min="0" value={max} onChange={(e) => { setMax(e.target.value); setPage(1) }} className="input" placeholder="Any" />
              </div>
              <button onClick={clearAdvanced} disabled={advancedCount === 0} className="btn-ghost h-10">
                <X className="w-4 h-4" /> Clear filters
              </button>
            </div>
          )}
        </div>

        {loading && invoices.length === 0 ? (
          <TableSkeleton />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description={filtered ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
            action={
              !filtered &&
              can('invoice.create') && (
                <Link href="/invoices/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> New Invoice
                </Link>
              )
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Mobile: cards */}
            <ul className="md:hidden space-y-3">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="card-interactive block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-mono text-slate-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{inv.customer?.name}</p>
                      </div>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <p className="text-xs text-slate-400">Due {formatDate(inv.dueDate)}</p>
                      <p className="text-base font-display font-bold tabular-nums text-slate-900">{formatCurrency(inv.total, inv.currency)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block card overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th className="text-left">Invoice</th>
                      <th className="text-left">Customer</th>
                      <th className="text-left hidden xl:table-cell">Created by</th>
                      <th className="text-left hidden lg:table-cell">Due Date</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <Link href={`/invoices/${invoice.id}`} className="text-sm font-semibold font-mono tracking-tight text-slate-900 hover:text-brand-600 transition-colors">
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(invoice.issueDate)}</p>
                        </td>
                        <td>
                          <p className="text-sm font-medium text-slate-700">{invoice.customer?.name}</p>
                          {invoice.customer?.company && <p className="text-xs text-slate-400">{invoice.customer.company}</p>}
                        </td>
                        <td className="hidden xl:table-cell">
                          <p className="text-sm text-slate-600">{invoice.user?.name ?? '—'}</p>
                        </td>
                        <td className="hidden lg:table-cell">
                          <span className="text-sm text-slate-600">{formatDate(invoice.dueDate)}</span>
                        </td>
                        <td>
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="text-right">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(invoice.total, invoice.currency)}</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/invoices/${invoice.id}`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            {can('invoice.edit') && (
                              <Link href={`/invoices/${invoice.id}/edit`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            {can('invoice.delete') && (
                              <button onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)} className="icon-btn hover:text-red-500 hover:bg-red-50" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  )
}

