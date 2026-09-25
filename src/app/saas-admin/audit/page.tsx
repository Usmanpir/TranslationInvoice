'use client'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination, TableSkeleton } from '@/components/ui/States'
import { AuditTable, type AuditRow } from '@/components/audit/AuditTable'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'

const FILTERS = [
  { value: '', label: 'All events' },
  { value: 'organization', label: 'Organization admin actions' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'member', label: 'Team' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'user', label: 'Account security' },
]

export default function SaasAuditPage() {
  const { handleError } = useFeedback()
  const [data, setData] = useState<Paginated<AuditRow> | null>(null)
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/saas-admin/audit?page=${page}${action ? `&action=${action}` : ''}`))
    } catch (e) {
      handleError(e)
    }
  }, [page, action, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Audit logs" description="Every administrative and tenant event across the platform" />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="input w-64" aria-label="Filter">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        {!data ? (
          <TableSkeleton />
        ) : (
          <div className="card overflow-hidden">
            <AuditTable rows={data.items} showOrganization />
          </div>
        )}
        {data && <Pagination page={page} pages={data.pages} onChange={setPage} />}
      </div>
    </div>
  )
}
