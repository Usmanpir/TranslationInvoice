'use client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { History } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export interface AuditRow {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: any
  ipAddress?: string | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
  organization?: { id: string; name: string } | null
}

const TONE: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  deleted: 'bg-red-50 text-red-700 border-red-200',
  removed: 'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  canceled: 'bg-amber-50 text-amber-700 border-amber-200',
}

function tone(action: string) {
  const verb = action.split('.').pop() ?? ''
  return TONE[verb] ?? 'bg-slate-50 text-slate-600 border-slate-200'
}

function describe(row: AuditRow) {
  const m = row.metadata ?? {}
  return (
    m.invoiceNumber ||
    m.quotationNumber ||
    m.email ||
    m.name ||
    (m.to?.plan ? `${m.from?.plan ?? '—'} → ${m.to.plan}${m.to.status ? ` (${m.to.status.toLowerCase()})` : ''}` : '') ||
    (Array.isArray(m.fields) ? `Changed: ${m.fields.slice(0, 5).join(', ')}` : '') ||
    ''
  )
}

function link(row: AuditRow) {
  if (!row.entityId) return null
  if (row.entityType === 'invoice' && !row.action.endsWith('deleted')) return `/invoices/${row.entityId}`
  if (row.entityType === 'quotation' && !row.action.endsWith('deleted')) return `/quotations/${row.entityId}`
  if (row.entityType === 'customer' && !row.action.endsWith('deleted')) return `/customers/${row.entityId}`
  return null
}

export function AuditTable({ rows, showOrganization = false }: { rows: AuditRow[]; showOrganization?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <History className="w-6 h-6 mx-auto text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No activity recorded yet.</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th className="text-left">When</th>
            <th className="text-left">Who</th>
            {showOrganization && <th className="text-left">Organization</th>}
            <th className="text-left">Action</th>
            <th className="text-left">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const href = link(r)
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap">
                  <p className="text-sm text-slate-700" title={new Date(r.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-[11px] text-slate-400">{formatDate(r.createdAt)}</p>
                </td>
                <td>
                  <p className="text-sm font-medium text-slate-900">{r.user?.name ?? 'System'}</p>
                  {r.user && <p className="text-xs text-slate-400">{r.user.email}</p>}
                </td>
                {showOrganization && <td className="text-sm text-slate-600">{r.organization?.name ?? 'Platform'}</td>}
                <td>
                  <span className={`badge font-mono ${tone(r.action)}`}>{r.action}</span>
                </td>
                <td className="text-sm text-slate-600 max-w-xs truncate">
                  {href ? (
                    <Link href={href} className="hover:text-brand-600">
                      {describe(r) || 'View'}
                    </Link>
                  ) : (
                    describe(r) || '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
