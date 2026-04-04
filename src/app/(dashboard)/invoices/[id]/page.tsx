'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Edit2, Trash2, Download, CheckCircle, XCircle, ArrowLeft, Printer } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoicePDFButton } from '@/components/pdf/InvoicePDFButton'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .finally(() => setLoading(false))
  }, [params.id])

  const toggleStatus = async () => {
    const newStatus = invoice.status === 'PAID' ? 'PENDING' : 'PAID'
    const res = await fetch(`/api/invoices/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const updated = await res.json()
    setInvoice(updated)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return
    await fetch(`/api/invoices/${params.id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  )
  if (!invoice) return <div className="p-8 text-center text-slate-500">Invoice not found</div>

  return (
    <div>
      <PageHeader title={invoice.invoiceNumber} description={`Created ${formatDate(invoice.createdAt)}`}>
        <Link href="/invoices" className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</Link>
        <button onClick={toggleStatus} className={`btn-secondary ${invoice.status === 'PAID' ? 'text-amber-600' : 'text-emerald-600'}`}>
          {invoice.status === 'PAID' ? <><XCircle className="w-4 h-4" />Mark Unpaid</> : <><CheckCircle className="w-4 h-4" />Mark Paid</>}
        </button>
        <InvoicePDFButton invoice={invoice} />
        <Link href={`/invoices/${params.id}/edit`} className="btn-secondary"><Edit2 className="w-4 h-4" />Edit</Link>
        <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" />Delete</button>
      </PageHeader>

      <div className="p-8">
        <div className="max-w-3xl">
          {/* Invoice Preview */}
          <div className="card p-8 print:shadow-none" id="invoice-print">
            {/* Header */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">IF</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{invoice.user?.companyName || invoice.user?.name}</h2>
                </div>
                {invoice.user?.address && <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">{invoice.user.address}</p>}
                {invoice.user?.phone && <p className="text-xs text-slate-500">{invoice.user.phone}</p>}
                {invoice.user?.email && <p className="text-xs text-slate-500">{invoice.user.email}</p>}
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 mb-2">
                  <StatusBadge status={invoice.status} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
                <p className="text-xs text-slate-500 mt-1">Issued: {formatDate(invoice.issueDate)}</p>
                <p className="text-xs text-slate-500">Due: {formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8 p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bill To</p>
              <p className="text-sm font-semibold text-slate-900">{invoice.customer?.name}</p>
              {invoice.customer?.company && <p className="text-sm text-slate-600">{invoice.customer.company}</p>}
              {invoice.customer?.email && <p className="text-xs text-slate-500">{invoice.customer.email}</p>}
              {invoice.customer?.address && <p className="text-xs text-slate-500 mt-1">{invoice.customer.address}</p>}
              {invoice.customer?.taxNumber && <p className="text-xs text-slate-400 mt-1">Tax: {invoice.customer.taxNumber}</p>}
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase pb-3">Description</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase pb-3 w-16">Qty</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase pb-3 w-24">Unit Price</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase pb-3 w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 text-sm text-slate-700">{item.description}</td>
                    <td className="py-3 text-sm text-slate-600 text-right">{item.quantity}</td>
                    <td className="py-3 text-sm text-slate-600 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-60 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({invoice.discount}%)</span><span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t-2 border-slate-900">
                  <span>Total Due</span><span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
