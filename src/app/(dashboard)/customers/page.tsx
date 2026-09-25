'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, Plus, Edit2, Trash2, Loader2, Building2, Mail, Phone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { formatDate } from '@/lib/utils'
import { useDialog } from '@/components/ui/Dialog'

const avatarGradients = [
  'from-brand-400 to-brand-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-sky-400 to-indigo-600',
]

function avatarGradient(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return avatarGradients[h % avatarGradients.length]
}

export default function CustomersPage() {
  const dialog = useDialog()
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
    const ok = await dialog.confirm({
      title: `Delete ${name}?`,
      message: 'This customer will be permanently removed. This action cannot be undone.',
      confirmLabel: 'Delete customer',
      variant: 'danger',
    })
    if (!ok) return
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

      <div className="p-4 sm:p-6 lg:p-10">
        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search customers..."
          />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={search ? 'Try a different search term' : 'Get started by adding your first customer'}
            action={
              !search && (
                <Link href="/customers/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> Add Customer
                </Link>
              )
            }
          />
        ) : (
          <div className="card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Customer</th>
                    <th className="text-left hidden md:table-cell">Contact</th>
                    <th className="text-left hidden lg:table-cell">Invoices</th>
                    <th className="text-left hidden lg:table-cell">Since</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(customer.name)} rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm`}>
                            <span className="text-sm font-bold text-white">{customer.name[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <Link href={`/customers/${customer.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600 transition-colors">
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
                      <td className="hidden md:table-cell">
                        <p className="text-sm text-slate-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{customer.email}</p>
                        {customer.phone && <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" />{customer.phone}</p>}
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {customer._count?.invoices || 0}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-sm text-slate-500">{formatDate(customer.createdAt)}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/customers/${customer.id}/edit`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            disabled={deleting === customer.id}
                            className="icon-btn hover:text-red-600 hover:bg-red-50"
                            title="Delete"
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
          </div>
        )}

        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  )
}
