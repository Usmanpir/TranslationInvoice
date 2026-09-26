'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileQuestion, Plus, Edit2, Trash2, Loader2, ArrowRightLeft, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { api, type Paginated } from '@/lib/api-client'
import { useDialog } from '@/components/ui/Dialog'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { useDebounced } from '@/lib/hooks'

const STATUSES = ['', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED']

export default function QuotationsPage() {
  const router = useRouter()
  const dialog = useDialog()
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const [converting, setConverting] = useState<string | null>(null)
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const fetchQuotations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: debouncedSearch, page: String(page), limit: '10', ...(status && { status }) })
      const data = await api<Paginated<any>>(`/api/quotations?${params}`)
      setQuotations(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (e) {
      handleError(e, 'Could not load quotations.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page, status, handleError])

  useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  const handleDelete = async (id: string, num: string) => {
    const ok = await dialog.confirm({
      title: `Delete quotation ${num}?`,
      message: 'This quotation and its line items will be permanently removed.',
      confirmLabel: 'Delete quotation',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api(`/api/quotations/${id}`, { method: 'DELETE' })
      toast.success(`Quotation ${num} was deleted.`)
      fetchQuotations()
    } catch (e) {
      handleError(e)
    }
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
      const data = await api<{ invoice: { id: string; invoiceNumber: string } }>(`/api/quotations/${id}/convert`, { method: 'POST' })
      toast.success(`Invoice ${data.invoice.invoiceNumber} created.`)
      router.push(`/invoices/${data.invoice.id}/edit`)
    } catch (e) {
      handleError(e, 'The quotation could not be converted.')
    } finally {
      setConverting(null)
    }
  }

  const canConvert = can('quotation.convert') && can('invoice.create')

  const convertButton = (q: any, full = false) =>
    q.invoice ? (
      <Link
        href={`/invoices/${q.invoice.id}`}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap"
        title={`Converted to ${q.invoice.invoiceNumber}`}
      >
        <Receipt className="w-3 h-3" />
        {q.invoice.invoiceNumber}
      </Link>
    ) : canConvert ? (
      <button
        onClick={(e) => {
          e.preventDefault()
          handleConvert(q.id)
        }}
        disabled={converting === q.id}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50 whitespace-nowrap"
        title="Convert to Invoice"
      >
        {converting === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
        <span className={full ? '' : 'hidden sm:inline'}>Convert</span>
      </button>
    ) : null

  return (
    <div>
      <PageHeader title="Quotations" description={`${total} quotation${total !== 1 ? 's' : ''} total`}>
        {can('quotation.create') && (
          <Link href="/quotations/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Quotation
          </Link>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Search number, customer or company..."
          />
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 overflow-x-auto sm:ml-auto" role="tablist" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                onClick={() => {
                  setStatus(s)
                  setPage(1)
                }}
                className={cn(
                  'px-3 h-8 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  status === s ? 'bg-card text-slate-900 shadow-[0_1px_3px_0_rgb(15_23_42/0.12)] ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading && quotations.length === 0 ? (
          <TableSkeleton />
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No quotations found"
            description={search || status ? 'Try adjusting your filters' : 'Create your first quotation'}
            action={
              !search &&
              !status &&
              can('quotation.create') && (
                <Link href="/quotations/new" className="btn-primary">
                  <Plus className="w-4 h-4" /> New Quotation
                </Link>
              )
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <ul className="md:hidden space-y-3">
              {quotations.map((q) => (
                <li key={q.id} className="card p-4">
                  <Link href={`/quotations/${q.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-mono text-slate-900">{q.quotationNumber}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{q.customer?.name}</p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>
                  </Link>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <p className="text-base font-display font-bold tabular-nums text-slate-900">{formatCurrency(q.total, q.currency)}</p>
                    {convertButton(q, true)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block card overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th className="text-left">Quotation</th>
                      <th className="text-left">Customer</th>
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
                          <Link href={`/quotations/${q.id}`} className="text-sm font-semibold font-mono tracking-tight text-slate-900 hover:text-brand-600">
                            {q.quotationNumber}
                          </Link>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(q.issueDate)}</p>
                        </td>
                        <td>
                          <p className="text-sm font-medium text-slate-700">{q.customer?.name}</p>
                          {q.customer?.company && <p className="text-xs text-slate-400">{q.customer.company}</p>}
                        </td>
                        <td className="hidden lg:table-cell">
                          <span className="text-sm text-slate-600">{formatDate(q.validUntil)}</span>
                        </td>
                        <td>
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="text-right">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(q.total, q.currency)}</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {convertButton(q)}
                            {can('quotation.edit') && !q.invoice && (
                              <Link href={`/quotations/${q.id}/edit`} className="icon-btn hover:text-brand-600 hover:bg-brand-50" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            {can('quotation.delete') && (
                              <button onClick={() => handleDelete(q.id, q.quotationNumber)} className="icon-btn hover:text-red-500 hover:bg-red-50" title="Delete">
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
