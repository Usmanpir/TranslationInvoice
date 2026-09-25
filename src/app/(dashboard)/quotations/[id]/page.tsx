'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRightLeft, Check, Edit2, FileQuestion, Loader2, Receipt, Send, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDate } from '@/lib/utils'
import { api, errorMessage } from '@/lib/api-client'
import { InvoicePDFButton } from '@/components/pdf/InvoicePDFButton'
import { useDialog } from '@/components/ui/Dialog'
import { EmptyState, PageLoader } from '@/components/ui/States'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const dialog = useDialog()
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const [q, setQ] = useState<any>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setQ(await api(`/api/quotations/${params.id}`))
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load this quotation.'))
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (status: 'SENT' | 'ACCEPTED' | 'REJECTED' | 'DRAFT') => {
    setBusy(status)
    try {
      await api(`/api/quotations/${params.id}`, { method: 'PUT', body: { status } })
      toast.success(`Quotation marked as ${status.toLowerCase()}.`)
      load()
    } catch (e) {
      handleError(e)
    } finally {
      setBusy(null)
    }
  }

  const convert = async () => {
    const ok = await dialog.confirm({
      title: 'Convert quotation to invoice?',
      message: 'A new invoice will be created with the same customer and line items.',
      confirmLabel: 'Convert',
    })
    if (!ok) return
    setBusy('convert')
    try {
      const data = await api<{ invoice: { id: string; invoiceNumber: string } }>(`/api/quotations/${params.id}/convert`, { method: 'POST' })
      toast.success(`Invoice ${data.invoice.invoiceNumber} created.`)
      router.push(`/invoices/${data.invoice.id}/edit`)
    } catch (e) {
      handleError(e)
      setBusy(null)
    }
  }

  const remove = async () => {
    const ok = await dialog.confirm({
      title: `Delete quotation ${q.quotationNumber}?`,
      message: 'This quotation and its line items will be permanently removed.',
      confirmLabel: 'Delete quotation',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api(`/api/quotations/${params.id}`, { method: 'DELETE' })
      toast.success('Quotation deleted.')
      router.push('/quotations')
    } catch (e) {
      handleError(e)
    }
  }

  if (loadError)
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={FileQuestion}
          title="Quotation not found"
          description={loadError}
          action={
            <Link href="/quotations" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back to quotations
            </Link>
          }
        />
      </div>
    )
  if (!q) return <PageLoader label="Loading quotation…" />

  const converted = Boolean(q.invoice)
  const editable = can('quotation.edit') && !converted

  return (
    <div>
      <PageHeader title={q.quotationNumber} description={`${q.customer?.name} · Valid until ${formatDate(q.validUntil)}`}>
        <Link href="/quotations" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <InvoicePDFButton invoice={q} />
        {editable && (
          <Link href={`/quotations/${q.id}/edit`} className="btn-secondary">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        )}
        {converted ? (
          <Link href={`/invoices/${q.invoice.id}`} className="btn-secondary text-emerald-700">
            <Receipt className="w-4 h-4" /> {q.invoice.invoiceNumber}
          </Link>
        ) : (
          can('quotation.convert') &&
          can('invoice.create') && (
            <button onClick={convert} disabled={busy !== null} className="btn-primary">
              {busy === 'convert' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Convert to invoice
            </button>
          )
        )}
        {can('quotation.delete') && (
          <button onClick={remove} className="btn-danger" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10 max-w-5xl space-y-5">
        {editable && (
          <div className="card p-4 flex flex-wrap items-center gap-2 animate-fade-in">
            <p className="text-sm text-slate-600 mr-2">Update status:</p>
            {q.status !== 'SENT' && (
              <button onClick={() => setStatus('SENT')} disabled={busy !== null} className="btn-secondary btn-sm">
                <Send className="w-3.5 h-3.5" /> Sent
              </button>
            )}
            {q.status !== 'ACCEPTED' && (
              <button onClick={() => setStatus('ACCEPTED')} disabled={busy !== null} className="btn-secondary btn-sm text-emerald-700">
                <Check className="w-3.5 h-3.5" /> Accepted
              </button>
            )}
            {q.status !== 'REJECTED' && (
              <button onClick={() => setStatus('REJECTED')} disabled={busy !== null} className="btn-secondary btn-sm text-red-700">
                <X className="w-3.5 h-3.5" /> Rejected
              </button>
            )}
          </div>
        )}
        <div className="animate-fade-up">
          <DocumentPreview
            doc={{
              kind: 'quotation',
              number: q.quotationNumber,
              status: q.status,
              issueDate: q.issueDate,
              dueDate: q.validUntil,
              currency: q.currency,
              salesperson: q.salesperson,
              completionDays: q.completionDays,
              taxRate: q.taxRate,
              taxInclusive: q.taxInclusive,
              discount: q.discount,
              subtotal: q.subtotal,
              discountAmount: q.discountAmount,
              taxAmount: q.taxAmount,
              total: q.total,
              notes: q.notes,
              items: q.items,
              customer: q.customer,
              issuer: q.issuer,
            }}
          />
        </div>
      </div>
    </div>
  )
}
