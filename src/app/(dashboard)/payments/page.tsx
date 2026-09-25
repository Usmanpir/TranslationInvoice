'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'
import { useDebounced } from '@/lib/hooks'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

const METHODS: Record<string, string> = {
  BANK_TRANSFER: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  PAYPAL: 'PayPal',
  OTHER: 'Other',
}

export default function PaymentsPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<(Paginated<any> & { totals: { currency: string; amount: number }[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20', search: debounced, ...(method && { method }) })
      setData(await api(`/api/payments?${qs}`))
    } catch (e) {
      handleError(e, 'Could not load payments.')
    } finally {
      setLoading(false)
    }
  }, [page, debounced, method, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Payments" description="Money received against your invoices">
        <ExportButton type="payments" />
      </PageHeader>
      <div className="p-4 sm:p-6 lg:p-10 space-y-6">
        {data && data.totals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.totals.map((t) => (
              <div key={t.currency} className="card p-5">
                <p className="text-[13px] font-medium text-slate-500">Received ({t.currency})</p>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-emerald-700">{formatCurrency(t.amount, t.currency)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Search invoice, customer or reference..."
          />
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value)
              setPage(1)
            }}
            className="input sm:w-48 sm:ml-auto"
            aria-label="Filter by method"
          >
            <option value="">All methods</option>
            {Object.entries(METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {loading && !data ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" description={search || method ? 'Try adjusting your filters.' : 'Mark an invoice as paid and the payment appears here.'} />
        ) : (
          <div className={cn('card overflow-hidden', loading && 'opacity-60')}>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Invoice</th>
                    <th className="text-left hidden md:table-cell">Customer</th>
                    <th className="text-left hidden lg:table-cell">Method</th>
                    <th className="text-left hidden lg:table-cell">Reference</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td className="text-sm text-slate-600 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                      <td>
                        <Link href={`/invoices/${p.invoice.id}`} className="text-sm font-semibold font-mono text-slate-900 hover:text-brand-600">
                          {p.invoice.invoiceNumber}
                        </Link>
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex text-brand-600" title="Payment proof">
                            <FileCheck className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="text-sm text-slate-700 hidden md:table-cell">{p.invoice.customer?.name}</td>
                      <td className="text-sm text-slate-500 hidden lg:table-cell">{METHODS[p.method] ?? p.method}</td>
                      <td className="text-sm text-slate-500 hidden lg:table-cell">{p.reference ?? '—'}</td>
                      <td className="text-right text-sm font-semibold tabular-nums text-emerald-700 whitespace-nowrap">+{formatCurrency(p.amount, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {data && <Pagination page={page} pages={data.pages} onChange={setPage} />}
      </div>
    </div>
  )
}
