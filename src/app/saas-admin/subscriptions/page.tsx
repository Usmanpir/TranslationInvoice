'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination, TableSkeleton } from '@/components/ui/States'
import { SUB_TONE } from '@/components/saas-admin/tones'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'
import { useDebounced } from '@/lib/hooks'
import { PLANS, type PlanId } from '@/lib/plans'
import { cn, formatDate } from '@/lib/utils'

export default function SaasSubscriptionsPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<Paginated<any> | null>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/saas-admin/subscriptions?${new URLSearchParams({ page: String(page), search: debounced, ...(status && { status }) })}`))
    } catch (e) {
      handleError(e)
    }
  }, [page, debounced, status, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Subscriptions" description={data ? `${data.total} subscriptions` : ''} />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search organization…" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input md:w-48 md:ml-auto" aria-label="Status">
            <option value="">All statuses</option>
            {['TRIALING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELED', 'SUSPENDED'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>
            ))}
          </select>
        </div>
        {!data ? (
          <TableSkeleton />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Organization</th>
                    <th className="text-left">Plan</th>
                    <th className="text-left">Status</th>
                    <th className="text-left hidden md:table-cell">Provider</th>
                    <th className="text-left hidden md:table-cell">Interval</th>
                    <th className="text-left hidden lg:table-cell">Trial end</th>
                    <th className="text-left hidden lg:table-cell">Period end</th>
                    <th className="text-left hidden xl:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/saas-admin/organizations/${s.organization.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600">
                          {s.organization.name}
                        </Link>
                      </td>
                      <td className="text-sm">{PLANS[s.plan as PlanId]?.name ?? s.plan}</td>
                      <td>
                        <span className={cn('badge', SUB_TONE[s.status])}>{s.status.replace('_', ' ').toLowerCase()}</span>
                        {s.cancelAtPeriodEnd && <span className="ml-1 text-[11px] text-amber-600">ends</span>}
                      </td>
                      <td className="text-sm text-slate-600 hidden md:table-cell">{s.provider.toLowerCase()}</td>
                      <td className="text-sm text-slate-600 hidden md:table-cell">{s.interval === 'YEAR' ? 'Yearly' : 'Monthly'}</td>
                      <td className="text-sm text-slate-500 hidden lg:table-cell">{s.trialEnd ? formatDate(s.trialEnd) : '—'}</td>
                      <td className="text-sm text-slate-500 hidden lg:table-cell">{s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '—'}</td>
                      <td className="text-sm text-slate-500 hidden xl:table-cell">{formatDate(s.updatedAt)}</td>
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
