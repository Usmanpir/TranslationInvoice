'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileQuestion, Plus, Edit2, Trash2, Loader2, ArrowRightLeft, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDialog } from '@/components/ui/Dialog'

export default function QuotationsPage() {
  const router = useRouter()
  const dialog = useDialog()
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
    const ok = await dialog.confirm({
      title: `Delete quotation ${num}?`,
      message: 'This quotation and its line items will be permanently removed.',
      confirmLabel: 'Delete quotation',
      variant: 'danger',
    })
    if (!ok) return
    await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    fetchQuotations()
  }

  const handleConvert = async (id: string) => {
    if (converting) return
    const ok = await dialog.confirm({
      title: 'Convert quotation to invoice?',
      message: 'A new invoice will be created from this quotation. You can keep editing the invoice before marking it paid.',
      confirmLabel: 'Convert',
    })
    if (!ok) return
    setConverting(id)
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      const data = await res.json()
      if (!res.ok) {
        await dialog.alert({
          title: 'Conversion failed',
          message: data.error || 'The quotation could not be converted.',
          variant: 'danger',
        })
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

      <div className="p-4 sm:p-6 lg:p-10">
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search quotations..."
          />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No quotations found"
            description={search ? 'Try a different search' : 'Create your first quotation'}
            action={!search && <Link href="/quotations/new" className="btn-primary"><Plus className="w-4 h-4" /> New Quotation</Link>}
          />
        ) : (
          <div className="card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Quotation</th>
                    <th className="text-left hidden md:table-cell">Customer</th>
                    <th className="text-left hidden lg:table-cell">Valid Until</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <p className="text-sm font-semibold font-mono tracking-tight text-slate-900">{q.quotationNumber}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(q.createdAt)}</p>
                      </td>
                      <td className="hidden md:table-cell">
                        <p className="text-sm font-medium text-slate-700">{q.customer?.name}</p>
                        {q.customer?.company && <p className="text-xs text-slate-400">{q.customer.company}</p>}
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{formatDate(q.validUntil)}</span>
                      </td>
                      <td><StatusBadge status={q.status} /></td>
                      <td className="text-right">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(q.total)}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {q.invoice ? (
                            <Link
                              href={`/invoices/${q.invoice.id}`}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                              title={`Converted to ${q.invoice.invoiceNumber}`}
                            >
                              <Receipt className="w-3 h-3" />
                              {q.invoice.invoiceNumber}
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleConvert(q.id)}
                              disabled={converting === q.id}
                              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              title="Convert to Invoice"
                            >
                              {converting === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                              <span className="hidden sm:inline">Convert</span>
                            </button>
                          )}
                          <Link href={`/quotations/${q.id}/edit`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => handleDelete(q.id, q.quotationNumber)} className="icon-btn hover:text-red-500 hover:bg-red-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
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
