'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Receipt, Plus, Eye, Edit2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useDialog } from '@/components/ui/Dialog'

export default function InvoicesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const dialog = useDialog()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: '10', ...(statusFilter && { status: statusFilter }) })
      const res = await fetch(`/api/invoices?${params}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [search, page, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const handleDelete = async (id: string, num: string) => {
    if (!isAdmin) return
    const ok = await dialog.confirm({
      title: `Delete invoice ${num}?`,
      message: 'This invoice and its line items will be permanently removed.',
      confirmLabel: 'Delete invoice',
      variant: 'danger',
    })
    if (!ok) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    fetchInvoices()
  }

  const statuses = ['', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']

  return (
    <div>
      <PageHeader title="Invoices" description={`${total} invoice${total !== 1 ? 's' : ''} total`}>
        <Link href="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search invoices..."
          />
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 overflow-x-auto sm:ml-auto" role="tablist" aria-label="Filter by status">
            {statuses.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={statusFilter === s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={cn(
                  'px-3.5 h-8 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
            action={
              !search && !statusFilter && (
                <Link href="/invoices/new" className="btn-primary"><Plus className="w-4 h-4" /> New Invoice</Link>
              )
            }
          />
        ) : (
          <div className="card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Invoice</th>
                    <th className="text-left hidden md:table-cell">Customer</th>
                    {isAdmin && <th className="text-left hidden lg:table-cell">Owner</th>}
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
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(invoice.createdAt)}</p>
                      </td>
                      <td className="hidden md:table-cell">
                        <p className="text-sm font-medium text-slate-700">{invoice.customer?.name}</p>
                        {invoice.customer?.company && <p className="text-xs text-slate-400">{invoice.customer.company}</p>}
                      </td>
                      {isAdmin && (
                        <td className="hidden lg:table-cell">
                          <p className="text-sm text-slate-700">{invoice.user?.companyName || invoice.user?.name || '-'}</p>
                          {invoice.user?.email && <p className="text-xs text-slate-400">{invoice.user.email}</p>}
                        </td>
                      )}
                      <td className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{formatDate(invoice.dueDate)}</span>
                      </td>
                      <td>
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(invoice.total, invoice.currency || 'AED')}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/invoices/${invoice.id}`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/invoices/${invoice.id}/edit`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                              className="icon-btn hover:text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
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
        )}

        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  )
}
