'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Trash2, CheckCircle, XCircle, ArrowLeft, FileCheck, FileQuestion, FileX2, Ban, RotateCcw, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import { api, errorMessage } from '@/lib/api-client'
import { InvoicePDFButton } from '@/components/pdf/InvoicePDFButton'
import { PaymentProofModal } from '@/components/PaymentProofModal'
import { useDialog } from '@/components/ui/Dialog'
import { EmptyState, PageLoader } from '@/components/ui/States'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { useWorkspace } from '@/components/providers/WorkspaceProvider'
import { useFeedback } from '@/components/providers/FeedbackProvider'

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  PAYPAL: 'PayPal',
  OTHER: 'Other',
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const dialog = useDialog()
  const { can } = useWorkspace()
  const { handleError, toast } = useFeedback()
  const [invoice, setInvoice] = useState<any>(null)
  const [loadError, setLoadError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const load = useCallback(async () => {
    try {
      setInvoice(await api(`/api/invoices/${params.id}`))
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load this invoice.'))
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const markUnpaid = async () => {
    const ok = await dialog.confirm({
      title: 'Mark invoice as unpaid?',
      message: 'The invoice will move back to pending and its payment record and proof will be removed.',
      confirmLabel: 'Mark unpaid',
      variant: 'warning',
    })
    if (!ok) return
    try {
      await api(`/api/invoices/${params.id}/payments`, { method: 'DELETE' })
      toast.success('Invoice marked as unpaid.')
      load()
    } catch (e) {
      handleError(e)
    }
  }

  const setStatus = async (status: 'CANCELLED' | 'PENDING') => {
    if (status === 'CANCELLED') {
      const ok = await dialog.confirm({
        title: `Cancel invoice ${invoice.invoiceNumber}?`,
        message: 'Cancelled invoices are kept for your records but are excluded from outstanding totals.',
        confirmLabel: 'Cancel invoice',
        variant: 'warning',
      })
      if (!ok) return
    }
    try {
      await api(`/api/invoices/${params.id}`, { method: 'PUT', body: { status } })
      toast.success(status === 'CANCELLED' ? 'Invoice cancelled.' : 'Invoice reopened.')
      load()
    } catch (e) {
      handleError(e)
    }
  }

  const handleDelete = async () => {
    const ok = await dialog.confirm({
      title: `Delete invoice ${invoice?.invoiceNumber ?? ''}?`,
      message: 'This invoice, its line items and payment records will be permanently removed.',
      confirmLabel: 'Delete invoice',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api(`/api/invoices/${params.id}`, { method: 'DELETE' })
      toast.success('Invoice deleted.')
      router.push('/invoices')
    } catch (e) {
      handleError(e)
    }
  }

  if (loadError)
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={FileX2}
          title="Invoice not found"
          description={loadError}
          action={
            <Link href="/invoices" className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Back to invoices
            </Link>
          }
        />
      </div>
    )
  if (!invoice) return <PageLoader label="Loading invoice…" />

  const paid = invoice.status === 'PAID'
  const cancelled = invoice.status === 'CANCELLED'

  return (
    <div>
      <PageHeader title={invoice.invoiceNumber} description={`${invoice.customer?.name} · Created ${formatDate(invoice.createdAt)}${invoice.user ? ` by ${invoice.user.name}` : ''}`}>
        <Link href="/invoices" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        {can('payment.manage') &&
          (paid ? (
            <button onClick={markUnpaid} className="btn-secondary text-amber-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-200">
              <XCircle className="w-4 h-4" />
              Mark Unpaid
            </button>
          ) : (
            !cancelled && (
              <button onClick={() => setShowPaymentModal(true)} className="btn-secondary text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200">
                <CheckCircle className="w-4 h-4" />
                Mark Paid
              </button>
            )
          ))}
        <InvoicePDFButton invoice={invoice} />
        {can('invoice.edit') && !paid && (
          <button onClick={() => setStatus(cancelled ? 'PENDING' : 'CANCELLED')} className="btn-secondary" title={cancelled ? 'Reopen' : 'Cancel invoice'}>
            {cancelled ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            <span className="hidden md:inline">{cancelled ? 'Reopen' : 'Cancel'}</span>
          </button>
        )}
        {can('invoice.edit') && (
          <Link href={`/invoices/${params.id}/edit`} className="btn-secondary">
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
        )}
        {can('invoice.delete') && (
          <button onClick={handleDelete} className="btn-danger" title="Delete">
            <Trash2 className="w-4 h-4" />
            <span className="hidden md:inline">Delete</span>
          </button>
        )}
      </PageHeader>

      <div className="p-4 sm:p-6 lg:p-10">
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-6 max-w-6xl">
          <div className="min-w-0 animate-fade-up">
            {invoice.quotation && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50/40 border border-purple-100 text-sm text-purple-800">
                <FileQuestion className="w-4 h-4 flex-shrink-0" />
                <span>Converted from quotation</span>
                <Link href={`/quotations/${invoice.quotation.id}`} className="font-semibold hover:underline">
                  {invoice.quotation.quotationNumber}
                </Link>
              </div>
            )}
            <DocumentPreview
              doc={{
                kind: 'invoice',
                number: invoice.invoiceNumber,
                status: invoice.status,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                currency: invoice.currency,
                salesperson: invoice.salesperson,
                completionDays: invoice.completionDays,
                taxRate: invoice.taxRate,
                taxInclusive: invoice.taxInclusive,
                discount: invoice.discount,
                subtotal: invoice.subtotal,
                discountAmount: invoice.discountAmount,
                taxAmount: invoice.taxAmount,
                total: invoice.total,
                notes: invoice.notes,
                items: invoice.items,
                customer: invoice.customer,
                issuer: invoice.issuer,
              }}
            />
          </div>

          {/* Payments */}
          <aside className="space-y-4">
            <section className="card overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="section-title">Payments</h2>
                  <p className="section-desc">{paid ? `Paid ${formatDate(invoice.paidAt)}` : cancelled ? 'Invoice cancelled' : 'Awaiting payment'}</p>
                </div>
                <Wallet className="w-5 h-5 text-slate-300" />
              </div>
              {invoice.payments?.length ? (
                <ul className="divide-y divide-slate-100">
                  {invoice.payments.map((p: any) => (
                    <li key={p.id} className="px-5 py-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-emerald-700 tabular-nums">+{formatCurrency(p.amount, p.currency)}</p>
                        <p className="text-xs text-slate-500">{formatDate(p.paidAt)}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {METHOD_LABELS[p.method] ?? p.method}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                        {p.recordedBy ? ` · by ${p.recordedBy.name}` : ''}
                      </p>
                      {p.proofUrl && (
                        <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
                          <FileCheck className="w-3.5 h-3.5" /> View payment proof
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-500">No payments recorded.</p>
                  {can('payment.manage') && !cancelled && (
                    <button onClick={() => setShowPaymentModal(true)} className="btn-secondary btn-sm mt-3">
                      <CheckCircle className="w-3.5 h-3.5" /> Record payment
                    </button>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentProofModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          amountLabel={formatCurrency(invoice.total, invoice.currency)}
          onClose={() => setShowPaymentModal(false)}
          onRecorded={() => {
            setShowPaymentModal(false)
            toast.success(`${invoice.invoiceNumber} marked as paid.`)
            load()
          }}
        />
      )}
    </div>
  )
}
