'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Receipt, Plus, Search, Eye, Edit2, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function InvoicesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

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
    if (!confirm(`Delete invoice ${num}?`)) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    fetchInvoices()
  }

  const toggleStatus = async (invoice: any) => {
    const newStatus = invoice.status === 'PAID' ? 'PENDING' : 'PAID'
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
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

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="input pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="card p-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-700 mb-1">No invoices found</p>
            <p className="text-sm text-slate-400 mb-6">{search || statusFilter ? 'Try adjusting your filters' : 'Create your first invoice to get started'}</p>
            {!search && !statusFilter && (
              <Link href="/invoices/new" className="btn-primary"><Plus className="w-4 h-4" /> New Invoice</Link>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Invoice</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden md:table-cell">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden lg:table-cell">Due Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Amount</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${invoice.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(invoice.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">{invoice.customer?.name}</p>
                      {invoice.customer?.company && <p className="text-xs text-slate-400">{invoice.customer.company}</p>}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">{formatDate(invoice.dueDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.total, invoice.currency || 'AED')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/invoices/${invoice.id}`} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => toggleStatus(invoice)} className={`p-1.5 rounded-lg transition-colors ${invoice.status === 'PAID' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={invoice.status === 'PAID' ? 'Mark unpaid' : 'Mark paid'}>
                          {invoice.status === 'PAID' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <Link href={`/invoices/${invoice.id}/edit`} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-2 text-xs disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-3 py-2 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}