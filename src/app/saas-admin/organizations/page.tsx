'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, Pagination, TableSkeleton } from '@/components/ui/States'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'
import { useDebounced } from '@/lib/hooks'
import { PLAN_ORDER, PLANS, type PlanId } from '@/lib/plans'
import { cn, formatDate } from '@/lib/utils'
import { SUB_TONE } from '@/components/saas-admin/tones'

export default function SaasOrganizationsPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<Paginated<any> | null>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ page: String(page), search: debounced, ...(plan && { plan }), ...(status && { status }) })
      setData(await api(`/api/saas-admin/organizations?${qs}`))
    } catch (e) {
      handleError(e)
    }
  }, [page, debounced, plan, status, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Organizations" description={data ? `${data.total} workspaces` : 'All workspaces on the platform'} />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search name, slug or owner…" />
          <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1) }} className="input md:w-44 md:ml-auto" aria-label="Plan">
            <option value="">All plans</option>
            {PLAN_ORDER.map((p) => (
              <option key={p} value={p}>{PLANS[p].name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input md:w-44" aria-label="Status">
            <option value="">All statuses</option>
            {['TRIALING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELED', 'SUSPENDED'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>
            ))}
          </select>
        </div>

        {!data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Building2} title="No organizations found" description="Try adjusting your filters." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">Organization</th>
                    <th className="text-left hidden md:table-cell">Owner</th>
                    <th className="text-center hidden lg:table-cell">Users</th>
                    <th className="text-center hidden lg:table-cell">Invoices</th>
                    <th className="text-left">Plan</th>
                    <th className="text-left">Status</th>
                    <th className="text-left hidden xl:table-cell">Trial / period end</th>
                    <th className="text-left hidden xl:table-cell">Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => {
                    const st = o.status === 'SUSPENDED' ? 'SUSPENDED' : o.subscription?.status ?? 'ACTIVE'
                    const end = o.subscription?.status === 'TRIALING' ? o.subscription?.trialEnd : o.subscription?.currentPeriodEnd
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/saas-admin/organizations/${o.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600">
                            {o.name}
                          </Link>
                          <p className="text-xs text-slate-400 font-mono">{o.slug}</p>
                        </td>
                        <td className="hidden md:table-cell">
                          <p className="text-sm text-slate-700">{o.owner?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{o.owner?.email}</p>
                        </td>
                        <td className="text-center text-sm tabular-nums hidden lg:table-cell">{o._count.memberships}</td>
                        <td className="text-center text-sm tabular-nums hidden lg:table-cell">{o._count.invoices}</td>
                        <td className="text-sm">{PLANS[o.subscription?.plan as PlanId]?.name ?? '—'}</td>
                        <td>
                          <span className={cn('badge', SUB_TONE[st])}>{st.replace('_', ' ').toLowerCase()}</span>
                        </td>
                        <td className="text-sm text-slate-500 hidden xl:table-cell">{end ? formatDate(end) : '—'}</td>
                        <td className="text-sm text-slate-500 hidden xl:table-cell">{formatDate(o.createdAt)}</td>
                        <td>
                          <Link href={`/saas-admin/organizations/${o.id}`} className="icon-btn" aria-label="View">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
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
