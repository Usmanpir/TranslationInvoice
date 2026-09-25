'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination, TableSkeleton } from '@/components/ui/States'
import { AuditTable, type AuditRow } from '@/components/audit/AuditTable'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'
import { api, type Paginated } from '@/lib/api-client'

const FILTERS = [
  { value: '', label: 'All activity' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'quotation', label: 'Quotations' },
  { value: 'customer', label: 'Customers' },
  { value: 'member', label: 'Team' },
  { value: 'settings', label: 'Settings' },
  { value: 'subscription', label: 'Billing' },
]

export default function AuditPage() {
  const { hasFeature } = useWorkspace()
  const { handleError } = useFeedback()
  const [data, setData] = useState<Paginated<AuditRow> | null>(null)
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const unlocked = hasFeature('auditLog')

  const load = useCallback(async () => {
    if (!unlocked) return
    try {
      setData(await api(`/api/audit?page=${page}&limit=25${action ? `&action=${action}` : ''}`))
    } catch (e) {
      handleError(e, 'Could not load the audit log.')
    }
  }, [page, action, unlocked, handleError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader title="Audit log" description="Who changed what, and when" />
      <div className="p-4 sm:p-6 lg:p-10 space-y-5 max-w-6xl">
        {!unlocked ? (
          <div className="card p-10 text-center max-w-2xl">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Audit log is a Professional feature</h2>
            <p className="mt-2 text-sm text-slate-600">Track every invoice, payment, team and settings change across your workspace.</p>
            <Link href="/billing#plans" className="btn-primary mt-6">
              <Sparkles className="w-4 h-4" /> View plans
            </Link>
          </div>
        ) : (
          <>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="input w-56"
              aria-label="Filter activity"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {!data ? (
              <TableSkeleton />
            ) : (
              <div className="card overflow-hidden">
                <AuditTable rows={data.items} />
              </div>
            )}
            {data && <Pagination page={page} pages={data.pages} onChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
