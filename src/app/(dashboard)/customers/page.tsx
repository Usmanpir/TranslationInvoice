'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Edit2, Trash2, Loader2, Building2, Mail, Phone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDate } from '@/lib/utils'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: '10' })
      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      fetchCustomers()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <PageHeader title="Customers" description={`${total} customer${total !== 1 ? 's' : ''} total`}>
        <Link href="/customers/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Customer
        </Link>
      </PageHeader>

      <div className="p-8">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="card p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-700 mb-1">No customers found</p>
            <p className="text-sm text-slate-400 mb-6">{search ? 'Try a different search term' : 'Get started by adding your first customer'}</p>
            {!search && (
              <Link href="/customers/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden md:table-cell">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden lg:table-cell">Invoices</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden lg:table-cell">Since</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-brand-700">{customer.name[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">
                            {customer.name}
                          </Link>
                          {customer.company && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />{customer.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{customer.email}</p>
                      {customer.phone && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3" />{customer.phone}</p>}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-700 font-medium">{customer._count?.invoices || 0}</span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-500">{formatDate(customer.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/customers/${customer.id}/edit`} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          disabled={deleting === customer.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {deleting === customer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
