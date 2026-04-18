'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileQuestion, Plus, Search, Eye, Edit2, Trash2, Loader2, ArrowRight, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function QuotationsPage() {
  const router = useRouter()
  const [converting, setConverting] = useState<string | null>(null)
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const fetchQuotations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: '10' })
      const res = await fetch(`/api/quotations?${params}`)
      const data = await res.json()
      setQuotations(data.quotations || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchQuotations() }, [fetchQuotations])

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete quotation ${num}?`)) return
    await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    fetchQuotations()
  }

  const handleConvert = async (id: string) => {
    if (converting) return
    if (!confirm('Convert this quotation to an invoice? You can keep editing the invoice before marking it paid.')) return
    setConverting(id)
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Conversion failed')
        return
      }
      router.push(`/invoices/${data.invoice.id}/edit`)
    } finally {
      setConverting(null)
    }
  }

  return (
    <div>
      <PageHeader title="Quotations" description={`${total} quotation${total !== 1 ? 's' : ''} total`}>
        <Link href="/quotations/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Quotation
        </Link>
      </PageHeader>

      <div className="p-8">
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
        ) : quotations.length === 0 ? (
          <div className="card p-16 text-center">
            <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-700 mb-1">No quotations found</p>
            <p className="text-sm text-slate-400 mb-6">{search ? 'Try a different search' : 'Create your first quotation'}</p>
            {!search && <Link href="/quotations/new" className="btn-primary"><Plus className="w-4 h-4" /> New Quotation</Link>}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Quotation</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden md:table-cell">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5 hidden lg:table-cell">Valid Until</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Amount</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-brand-600">{q.quotationNumber}</p>
                      <p className="text-xs text-slate-400">{formatDate(q.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">{q.customer?.name}</p>
                      {q.customer?.company && <p className="text-xs text-slate-400">{q.customer.company}</p>}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">{formatDate(q.validUntil)}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={q.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(q.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {q.invoice ? (
                          <Link
                            href={`/invoices/${q.invoice.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            title={`Converted to ${q.invoice.invoiceNumber}`}
                          >
                            <Receipt className="w-3 h-3" />
                            {q.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleConvert(q.id)}
                            disabled={converting === q.id}
                            className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Convert to Invoice"
                          >
                            {converting === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <Link href={`/quotations/${q.id}/edit`} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(q.id, q.quotationNumber)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
