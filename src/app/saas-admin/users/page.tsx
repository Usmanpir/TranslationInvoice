'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination, TableSkeleton } from '@/components/ui/States'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'
import { useDebounced } from '@/lib/hooks'
import { ROLE_LABELS } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'

export default function SaasUsersPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<Paginated<any> | null>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/saas-admin/users?page=${page}&search=${encodeURIComponent(debounced)}`))
    } catch (e) {
      handleError(e)
    }
  }, [page, debounced, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Users" description={data ? `${data.total} accounts` : ''} />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search name or email…" />
        {!data ? (
          <TableSkeleton />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="text-left">User</th>
                    <th className="text-left">Workspaces</th>
                    <th className="text-left hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.name}
                          {u.isSuperAdmin && <ShieldCheck className="w-3.5 h-3.5 text-violet-600" aria-label="Platform admin" />}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {u.memberships.length === 0 ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : (
                            u.memberships.map((m: any) => (
                              <Link key={m.organization.id} href={`/saas-admin/organizations/${m.organization.id}`} className="badge bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100">
                                {m.organization.name} · {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS].label}
                              </Link>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="text-sm text-slate-500 hidden md:table-cell">{formatDate(u.createdAt)}</td>
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
