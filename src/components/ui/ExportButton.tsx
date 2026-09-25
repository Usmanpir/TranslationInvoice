'use client'
import { useState } from 'react'
import { Download, Loader2, Lock } from 'lucide-react'
import { ApiRequestError } from '@/lib/api-client'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

/** Downloads a CSV export. On plans without exports it opens the upgrade dialog instead. */
export function ExportButton({ type, query = '', label = 'Export CSV' }: { type: 'invoices' | 'customers' | 'payments' | 'revenue'; query?: string; label?: string }) {
  const { can, hasFeature } = useWorkspace()
  const { handleError, showUpgrade } = useFeedback()
  const [busy, setBusy] = useState(false)

  if (!can('export.data')) return null
  const locked = !hasFeature('dataExport')

  const run = async () => {
    if (locked) {
      return showUpgrade("CSV exports aren't included in your current plan.", {
        feature: 'dataExport',
        featureLabel: 'CSV exports',
        suggestedPlanName: 'Starter',
      })
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/export/${type}${query ? `?${query}` : ''}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new ApiRequestError(body?.error?.code ?? 'EXPORT_FAILED', body?.error?.message ?? 'Export failed.', res.status, body?.error?.details)
      }
      const blob = await res.blob()
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${type}.csv`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      handleError(e, 'Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={run} disabled={busy} className="btn-secondary">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : locked ? <Lock className="w-4 h-4 text-slate-400" /> : <Download className="w-4 h-4" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
